import { createServerClient } from "@/lib/supabase/client";

export type QuickTile = {
  id: string;
  title: string;
  /** Effective selling price (sale price when lower), oere. */
  priceOere: number;
  category: string | null;
  sold?: number;
};

export type TileCategory = { name: string; count: number };

export const TOP_SELLER_DAYS = 30;
export const TOP_SELLER_LIMIT = 8;

/** Sum quantities per product and return the best sellers (ties: first seen). */
export function rankTopSellers(
  rows: Array<{ sku_product_id: string | null; quantity: number }>,
  limit = TOP_SELLER_LIMIT,
): Array<{ id: string; sold: number }> {
  const sold = new Map<string, number>();
  for (const r of rows) {
    if (!r.sku_product_id || r.quantity <= 0) continue;
    sold.set(r.sku_product_id, (sold.get(r.sku_product_id) ?? 0) + r.quantity);
  }
  return [...sold.entries()]
    .map(([id, qty]) => ({ id, sold: qty }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, limit);
}

type SkuRow = {
  id: string;
  title: string;
  selling_price: number;
  sale_price: number | null;
  category: string | null;
  is_active?: boolean | null;
};

export function effectivePrice(p: { selling_price: number; sale_price: number | null }): number {
  return p.sale_price != null && p.sale_price < p.selling_price ? p.sale_price : p.selling_price;
}

function toTile(p: SkuRow, sold?: number): QuickTile {
  return { id: p.id, title: p.title, priceOere: effectivePrice(p), category: p.category, sold };
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/**
 * Quick tiles for a location: the best-selling accessories of the last 30 days
 * (POS sales at this location). The list is derived, not configured: when the
 * owner wants a hand-picked list, replace this with a table read.
 */
export async function topSellingTiles(locationId: string, days = TOP_SELLER_DAYS): Promise<QuickTile[]> {
  const supabase = createServerClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("order_items")
    .select("sku_product_id, quantity, orders!inner ( type, location_id, confirmed_at )")
    .eq("item_type", "sku_product")
    .gt("quantity", 0)
    .eq("orders.type", "pos")
    .eq("orders.location_id", locationId)
    .gte("orders.confirmed_at", since)
    .limit(5000);
  if (error) throw new Error(`Kunne ikke hente bestsellere: ${error.message}`);

  const top = rankTopSellers((data ?? []) as Array<{ sku_product_id: string | null; quantity: number }>);
  if (top.length === 0) return [];

  const { data: products } = await supabase
    .from("sku_products")
    .select("id, title, selling_price, sale_price, category, is_active")
    .in(
      "id",
      top.map((t) => t.id),
    );
  const byId = new Map(((products ?? []) as SkuRow[]).filter((p) => p.is_active !== false).map((p) => [p.id, p]));
  return top.flatMap((t) => {
    const p = byId.get(t.id);
    return p ? [toTile(p, t.sold)] : [];
  });
}

/** Accessory categories that have stock at the location (for the category chips). */
export async function stockedCategories(locationId: string, max = 5): Promise<TileCategory[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sku_stock")
    .select("product_id, sku_products!inner ( category, is_active )")
    .eq("location_id", locationId)
    .gt("quantity", 0)
    .limit(5000);
  if (error) throw new Error(`Kunne ikke hente kategorier: ${error.message}`);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as Array<{
    sku_products: { category: string | null; is_active: boolean | null } | Array<{ category: string | null; is_active: boolean | null }> | null;
  }>) {
    const p = one(row.sku_products);
    if (!p || p.is_active === false || !p.category) continue;
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

/** Products of one category with stock at the location. */
export async function categoryTiles(locationId: string, category: string, limit = 40): Promise<QuickTile[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sku_stock")
    .select("product_id, sku_products!inner ( id, title, selling_price, sale_price, category, is_active )")
    .eq("location_id", locationId)
    .gt("quantity", 0)
    .eq("sku_products.category", category)
    .limit(limit * 3);
  if (error) throw new Error(`Kunne ikke hente varer: ${error.message}`);
  const tiles: QuickTile[] = [];
  for (const row of (data ?? []) as unknown as Array<{ sku_products: SkuRow | SkuRow[] | null }>) {
    const p = one(row.sku_products);
    if (p && p.is_active !== false) tiles.push(toTile(p));
  }
  return tiles.sort((a, b) => a.title.localeCompare(b.title, "da")).slice(0, limit);
}

export type DeviceTile = {
  id: string;
  name: string;
  grade: string | null;
  storage: string | null;
  color: string | null;
  barcode: string | null;
  priceOere: number;
  vatScheme: "brugtmoms" | "regular";
};

/** Devices that are for sale at the location (the "Enheder" chip). */
export async function listedDeviceTiles(locationId: string, limit = 40): Promise<DeviceTile[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("devices")
    .select("id, barcode, grade, storage, color, selling_price, vat_scheme, product_templates ( display_name )")
    .eq("status", "listed")
    .eq("location_id", locationId)
    .gt("selling_price", 0)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Kunne ikke hente enheder: ${error.message}`);
  return ((data ?? []) as unknown as Array<{
    id: string;
    barcode: string | null;
    grade: string | null;
    storage: string | null;
    color: string | null;
    selling_price: number;
    vat_scheme: "brugtmoms" | "regular" | null;
    product_templates: { display_name: string } | Array<{ display_name: string }> | null;
  }>).map((d) => ({
    id: d.id,
    name: one(d.product_templates)?.display_name ?? "Enhed",
    grade: d.grade,
    storage: d.storage,
    color: d.color,
    barcode: d.barcode,
    priceOere: d.selling_price,
    vatScheme: d.vat_scheme === "brugtmoms" ? "brugtmoms" : "regular",
  }));
}
