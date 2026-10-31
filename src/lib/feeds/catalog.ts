// Fælles hentning af varer til Google-feedene, så online-feedet og det lokale
// lagerfeed altid bygger på samme varer, priser og id'er.

import type { SupabaseClient } from "@supabase/supabase-js";
import { withBlackNovemberDevice, withBlackNovemberSku } from "@/lib/campaign/black-november";
import type { SkuStockRow } from "@/lib/feeds/google-local-inventory";
import {
  groupDevices,
  type AccessoryRow,
  type DeviceGroup,
  type FeedDevice,
  type FeedTemplate,
} from "@/lib/feeds/google-shopping";
import { withoutSpareParts } from "@/lib/spare-part-filter";

export interface FeedCatalog {
  accessories: AccessoryRow[];
  deviceGroups: DeviceGroup[];
  /** Null, hvis lageret ikke kunne læses. */
  skuStock: SkuStockRow[] | null;
}

export class FeedCatalogError extends Error {}

export async function loadFeedCatalog(supabase: SupabaseClient): Promise<FeedCatalog> {
  // Reservedele filtreres i JS (withoutSpareParts): PostgREST `neq` smider også rækker med subcategory NULL.
  const { data: skuProducts, error: skuError } = await supabase
    .from("sku_products")
    .select(
      "id, title, slug, category, subcategory, brand, selling_price, sale_price, images, ean, product_number, description, short_description, status, is_active, always_in_stock, attributes, created_at, updated_at",
    )
    .eq("status", "published")
    .eq("is_active", true)
    .eq("category", "accessory")
    .order("created_at", { ascending: false });

  if (skuError) throw new FeedCatalogError(skuError.message);

  // Fetch all listed devices joined with their published templates
  const { data: devices, error: deviceError } = await supabase
    .from("devices")
    .select(
      "id, template_id, grade, condition_notes, storage, color, selling_price, photos, status, location_id, source",
    )
    .eq("status", "listed");

  if (deviceError) throw new FeedCatalogError(deviceError.message);

  // Fetch published templates for those devices
  const templateIds = [...new Set((devices ?? []).map((d) => d.template_id))];

  const templateMap = new Map<string, FeedTemplate>();
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("product_templates")
      .select("*")
      .eq("status", "published")
      .in("id", templateIds);

    for (const t of templates ?? []) {
      templateMap.set(t.id, t as unknown as FeedTemplate);
    }
  }

  // Black November: covers og glas sendes med kampagneprisen som sale_price.
  const accessories = withoutSpareParts(skuProducts ?? []).map((p) =>
    withBlackNovemberSku(p),
  ) as unknown as AccessoryRow[];

  // Pagineret hentning: PostgREST afkorter ved 1000 rækker, og en lang
  // .in()-liste ville sprænge URL-grænsen.
  let skuStock: SkuStockRow[] | null = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase
      .from("sku_stock")
      .select("product_id, location_id, quantity")
      .order("product_id")
      .order("location_id")
      .range(from, from + 999);
    if (error) {
      skuStock = null;
      break;
    }
    skuStock.push(...((page ?? []) as SkuStockRow[]));
    if (!page || page.length < 1000) break;
  }

  // Grupperet pr. model og stand; varianter med kendt GTIN får egen vare.
  const deviceGroups = groupDevices(
    ((devices ?? []) as unknown as FeedDevice[]).map((d) => withBlackNovemberDevice(d)),
    templateMap,
  );

  return { accessories, deviceGroups, skuStock };
}
