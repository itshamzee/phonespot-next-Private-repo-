import type { SpotSku } from "./types";
import { createServerClient } from "@/lib/supabase/client";

const SPOT_SKU_COLUMNS = "id, slug, title, subcategory, selling_price, sale_price, compatible_models, images, variant_group, variant_label, variant_sort, is_active";

/**
 * Bucket SKUs by their variant_group. Rows with a null variant_group are skipped.
 * Each bucket is returned sorted ascending by variant_sort (null treated as 0).
 */
export function groupByVariantGroup(rows: SpotSku[]): Map<string, SpotSku[]> {
  const map = new Map<string, SpotSku[]>();
  for (const row of rows) {
    if (!row.variant_group) continue;
    const list = map.get(row.variant_group) ?? [];
    list.push(row);
    map.set(row.variant_group, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.variant_sort ?? 0) - (b.variant_sort ?? 0));
  }
  return map;
}

/**
 * Given a model slug, find the variant_group whose SKUs include that model.
 * Returns null if no SKU matches.
 * Assumes each model belongs to at most one variant_group (enforced by the create form).
 */
export function findVariantGroupForModel(rows: SpotSku[], modelSlug: string): string | null {
  for (const row of rows) {
    if (!row.variant_group) continue;
    if (row.compatible_models.includes(modelSlug)) return row.variant_group;
  }
  return null;
}

/**
 * Fetch all active Spot SKUs. Used by customer pages.
 * Returns [] on error — matches codebase convention; errors are logged.
 */
export async function fetchActiveSpotSkus(): Promise<SpotSku[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("sku_products")
    .select(SPOT_SKU_COLUMNS)
    .eq("subcategory", "spot-glass")
    .eq("is_active", true);
  if (error) {
    console.error("fetchActiveSpotSkus failed", error);
    return [];
  }
  return (data ?? []) as SpotSku[];
}

/**
 * Fetch all Spot SKUs (including inactive) for the admin surface.
 */
export async function fetchAllSpotSkus(): Promise<SpotSku[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("sku_products")
    .select(SPOT_SKU_COLUMNS)
    .eq("subcategory", "spot-glass");
  if (error) {
    console.error("fetchAllSpotSkus failed", error);
    return [];
  }
  return (data ?? []) as SpotSku[];
}
