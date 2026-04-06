import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Returns per-location stock availability for a list of SKU product IDs.
 * Used by the shipping selector to determine which stores allow pickup.
 */
export async function POST(req: NextRequest) {
  const { productIds } = (await req.json()) as { productIds: string[] };
  if (!productIds?.length) {
    return NextResponse.json({ locations: {} });
  }

  const supabase = createServerClient();

  // Fetch stock with location info
  const { data: stockRows } = await supabase
    .from("sku_stock")
    .select("product_id, quantity, location:locations(name, type)")
    .in("product_id", productIds)
    .gt("quantity", 0);

  // Also check always_in_stock flag
  const { data: alwaysInStock } = await supabase
    .from("sku_products")
    .select("id, always_in_stock")
    .in("id", productIds)
    .eq("always_in_stock", true);

  const alwaysInStockIds = new Set((alwaysInStock ?? []).map((r) => r.id));

  // Build map: locationName -> set of product IDs available there
  const locationMap: Record<string, Set<string>> = {};

  for (const row of stockRows ?? []) {
    const loc = (row as any).location;
    if (!loc?.name || loc.type !== "store") continue;
    if (!locationMap[loc.name]) locationMap[loc.name] = new Set();
    locationMap[loc.name].add(row.product_id);
  }

  // Add always_in_stock products to all store locations
  const storeNames = Object.keys(locationMap);
  // If no stock rows have store locations, use known stores
  const knownStores = storeNames.length > 0 ? storeNames : ["Vejle", "Slagelse"];
  for (const id of alwaysInStockIds) {
    for (const store of knownStores) {
      if (!locationMap[store]) locationMap[store] = new Set();
      locationMap[store].add(id);
    }
  }

  // Convert to serializable format: { "Vejle": ["id1", "id2"], "Slagelse": ["id1"] }
  const locations: Record<string, string[]> = {};
  for (const [name, ids] of Object.entries(locationMap)) {
    locations[name] = Array.from(ids);
  }

  return NextResponse.json({ locations });
}
