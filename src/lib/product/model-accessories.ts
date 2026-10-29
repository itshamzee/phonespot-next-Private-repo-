import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicAccessory } from "@/lib/product/public-accessory";
import { ACCESSORY_CATEGORY_TO_SLUG, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { accessoryModelLabels, accessoryModelSlug, accessorySpotKind } from "@/lib/product/accessory-models";
import { pickUpsell } from "@/lib/product/pick-upsell";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";

export const PUBLIC_ACCESSORY_COLUMNS =
  "id, title, slug, subcategory, brand, selling_price, always_in_stock, sale_price, images, compatible_models, variant_label, status, created_at, is_active, store_stock, online_stock, attributes";

type InventoryRow = {
  id: string; title: string; slug: string | null; subcategory: string | null; brand: string | null;
  selling_price: number; always_in_stock: boolean | null; sale_price: number | null; images: unknown;
  compatible_models: unknown; variant_label: string | null; created_at: string;
  store_stock: number; online_stock: number;
  attributes?: Record<string, string> | null;
};

export function toPublicAccessory(p: InventoryRow): PublicAccessory {
  const store = p.store_stock;
  const online = p.online_stock;
  return {
    id: p.id, name: p.title, slug: p.slug ?? null,
    category: ACCESSORY_CATEGORY_TO_SLUG[p.subcategory ?? ""] ?? p.subcategory ?? "other",
    brand: p.brand, price: p.selling_price, sale_price: p.sale_price ?? null,
    image_url: Array.isArray(p.images) ? p.images[0] ?? null : null,
    compatible_models: accessoryModelLabels(p.compatible_models),
    spotKind: accessorySpotKind(p),
    lagersalg: isLagersalg({ subcategory: p.subcategory, attributes: p.attributes }),
    created_at: p.created_at,
    store_stock: store,
    online_stock: online,
    availability: store + online > 0 ? "in_stock" : p.always_in_stock ? "orderable" : "out_of_stock",
  };
}

/**
 * Ids på tilbehør, der passer til modellen. Begge kompatibilitetskilder bruges:
 * skabelonkoblinger og modelspecifikke varer. Kaster ved databasefejl, så
 * kalderen kan skelne "ingen varer" fra "ikke svaret".
 */
export async function findAccessoryIdsForModel(supabase: SupabaseClient, model: string): Promise<Set<string>> {
  const modelSlug = accessoryModelSlug(model);
  const modelLabel = accessoryModelLabels([modelSlug])[0];
  const selectedDevice = TILBEHOER_DEVICES.find(device => device.slug === modelSlug);
  let templatesQuery = supabase
    .from("product_templates")
    .select("id")
    .ilike("model", modelLabel);
  if (selectedDevice) templatesQuery = templatesQuery.ilike("brand", selectedDevice.brand);
  const { data: templates, error: templateError } = await templatesQuery;

  const { data: compatible, error: compatibilityError } = await supabase
    .from("sku_products").select("id")
    .eq("status", "published").eq("is_active", true)
    // compatible_models er jsonb. Et JS-array serialiseres af supabase-js som
    // Postgres-array-literal ({a,b}), som PostgREST afviser som ugyldig JSON.
    // Send derfor JSON-teksten selv.
    .contains("compatible_models", JSON.stringify([modelSlug]));
  if (templateError || compatibilityError) throw new Error("Modeloplysninger kunne ikke hentes");
  const ids = new Set<string>((compatible ?? []).map((p: { id: string }) => p.id));

  if (templates?.length) {
    const { data: links, error: linkError } = await supabase
      .from("sku_product_templates")
      .select("sku_product_id")
      .in("template_id", templates.map((t: { id: string }) => t.id));
    if (linkError) throw new Error("Modeloplysninger kunne ikke hentes");
    for (const link of links ?? []) ids.add(link.sku_product_id);
  }
  return ids;
}

export { pickUpsell };

/** Tilbehør til en reparationsmodel. En fejl må ikke vælte reparationssiden, så den giver en tom liste. */
export async function getModelUpsell(modelName: string, limit = 3): Promise<PublicAccessory[]> {
  try {
    const supabase = createAdminClient();
    const ids = await findAccessoryIdsForModel(supabase, modelName);
    if (!ids.size) return [];
    const { data, error } = await supabase
      .from("checkout_sku_inventory")
      .select(PUBLIC_ACCESSORY_COLUMNS)
      .eq("status", "published")
      .eq("is_active", true)
      .eq("category", "accessory")
      .neq("subcategory", "spare-part")
      .in("id", [...ids])
      .limit(200);
    if (error || !data) return [];
    return pickUpsell((data as InventoryRow[]).map(toPublicAccessory), limit);
  } catch {
    return [];
  }
}
