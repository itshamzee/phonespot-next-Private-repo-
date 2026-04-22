import type { SpotSku } from "./types";

/**
 * Bucket SKUs by their variant_group. Rows with a null variant_group are skipped.
 * Each bucket is returned sorted ascending by variant_sort.
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
    list.sort((a, b) => a.variant_sort - b.variant_sort);
  }
  return map;
}

/**
 * Given a model slug, find the variant_group whose SKUs include that model.
 * Returns null if no SKU matches.
 */
export function findVariantGroupForModel(rows: SpotSku[], modelSlug: string): string | null {
  for (const row of rows) {
    if (!row.variant_group) continue;
    if (row.compatible_models.includes(modelSlug)) return row.variant_group;
  }
  return null;
}

import { createServerClient } from "@/lib/supabase/client";

/**
 * Fetch all active Spot SKUs. Used by customer pages.
 */
export async function fetchActiveSpotSkus(): Promise<SpotSku[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sku_products")
    .select("id, slug, title, subcategory, selling_price, sale_price, compatible_models, images, variant_group, variant_label, variant_sort, is_active")
    .eq("subcategory", "spot-glass")
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as SpotSku[];
}

/**
 * Fetch all Spot SKUs (including inactive) for the admin surface.
 */
export async function fetchAllSpotSkus(): Promise<SpotSku[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sku_products")
    .select("id, slug, title, subcategory, selling_price, sale_price, compatible_models, images, variant_group, variant_label, variant_sort, is_active")
    .eq("subcategory", "spot-glass");
  if (error) throw error;
  return (data ?? []) as SpotSku[];
}
