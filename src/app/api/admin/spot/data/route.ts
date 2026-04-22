import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { fetchAllSpotSkus } from "@/lib/spot/queries";

export async function GET() {
  const supabase = createServerClient();
  const skus = await fetchAllSpotSkus();

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .order("name");

  const { data: stockRows } = await supabase
    .from("sku_stock")
    .select("product_id, location_id, quantity")
    .in(
      "product_id",
      skus.map((s) => s.id),
    );

  const stock: Record<string, Record<string, number>> = {};
  for (const r of stockRows ?? []) {
    stock[r.product_id] = stock[r.product_id] ?? {};
    stock[r.product_id][r.location_id] = r.quantity;
  }

  return NextResponse.json({ skus, locations: locations ?? [], stock });
}
