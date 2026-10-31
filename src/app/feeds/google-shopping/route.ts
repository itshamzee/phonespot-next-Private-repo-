import { withoutSpareParts } from "@/lib/spare-part-filter";
import { withBlackNovemberDevice, withBlackNovemberSku } from "@/lib/campaign/black-november";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BASE_URL,
  buildAccessoryItem,
  buildDeviceItem,
  dedupeAccessoryTitles,
  groupDevices,
  sharedGroupIds,
  type AccessoryRow,
  type FeedDevice,
  type FeedTemplate,
} from "@/lib/feeds/google-shopping";

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = createAdminClient();

  // Fetch accessories. Reservedele filtreres i JS (withoutSpareParts): PostgREST `neq` smider også rækker med subcategory NULL.
  const { data: skuProducts, error: skuError } = await supabase
    .from("sku_products")
    .select(
      "id, title, slug, category, subcategory, brand, selling_price, sale_price, images, ean, product_number, description, short_description, status, is_active, always_in_stock, attributes, created_at, updated_at"
    )
    .eq("status", "published")
    .eq("is_active", true)
    .eq("category", "accessory")
    .order("created_at", { ascending: false });

  if (skuError) {
    return new NextResponse(`Feed error: ${skuError.message}`, { status: 500 });
  }

  // Fetch all listed devices joined with their published templates
  const { data: devices, error: deviceError } = await supabase
    .from("devices")
    .select(
      "id, template_id, grade, condition_notes, storage, color, selling_price, photos, status"
    )
    .eq("status", "listed");

  if (deviceError) {
    return new NextResponse(`Feed error: ${deviceError.message}`, {
      status: 500,
    });
  }

  // Fetch published templates for those devices
  const templateIds = [
    ...new Set((devices ?? []).map((d) => d.template_id)),
  ];

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

  // Lagerstatus pr. tilbehør (samme sum som produktsiden: sku_stock.quantity).
  // Ved fejl behandles lageret som ukendt (null) — så sender feedet kun
  // in_stock for always_in_stock-varer.
  // Black November: covers og glas sendes med kampagneprisen som sale_price.
  const accessoryRows = withoutSpareParts(skuProducts ?? []).map((p) => withBlackNovemberSku(p)) as unknown as AccessoryRow[];
  const stockByProduct = new Map<string, number>();
  // Pagineret hentning: PostgREST afkorter ved 1000 rækker, og en lang
  // .in()-liste ville sprænge URL-grænsen.
  let stockError = false;
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase
      .from("sku_stock")
      .select("product_id, quantity")
      .order("product_id")
      .order("location_id")
      .range(from, from + 999);
    if (error) {
      stockError = true;
      break;
    }
    for (const r of page ?? []) {
      stockByProduct.set(
        r.product_id,
        (stockByProduct.get(r.product_id) ?? 0) + Math.max(0, r.quantity ?? 0),
      );
    }
    if (!page || page.length < 1000) break;
  }

  // Build accessory items
  const titles = dedupeAccessoryTitles(accessoryRows);
  const groupIds = sharedGroupIds(accessoryRows);
  const accessoryItems: string[] = [];
  for (const product of accessoryRows) {
    const stock = stockError ? null : (stockByProduct.get(product.id) ?? 0);
    const item = buildAccessoryItem(product, stock, titles.get(product.id), groupIds);
    if (item) accessoryItems.push(item);
  }

  // Build device items — grupperet pr. model og stand
  const deviceItems: string[] = [];
  for (const group of groupDevices(((devices ?? []) as unknown as FeedDevice[]).map((d) => withBlackNovemberDevice(d)), templateMap)) {
    const item = buildDeviceItem(group);
    if (item) deviceItems.push(item);
  }

  const allItems = [...accessoryItems, ...deviceItems];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>PhoneSpot</title>
    <link>${BASE_URL}</link>
    <description>Refurbished telefoner, reparation og tilbehoer</description>
${allItems.join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
