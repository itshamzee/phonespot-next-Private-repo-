// GET /api/platform/sku-stock — list stock levels with optional low-stock filter
// PATCH /api/platform/sku-stock — adjust quantity for a product at a location

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/platform/activity-log";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const lowStockOnly = request.nextUrl.searchParams.get("low_stock") === "true";
  const locationId = request.nextUrl.searchParams.get("location_id");

  let query = supabase
    .from("sku_stock")
    .select(`
      *,
      product:sku_products(id, title, ean, selling_price, sale_price, brand, category, is_active),
      location:locations(id, name)
    `)
    .eq("product.is_active", true);

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let results = data ?? [];

  if (lowStockOnly) {
    results = results.filter((s) => s.min_level !== null && s.quantity <= s.min_level);
  }

  return NextResponse.json(results);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { product_id, location_id, quantity, min_level, max_level, _actorId } = body;

  if (!product_id || !location_id) {
    return NextResponse.json({ error: "product_id and location_id are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("sku_stock")
    .upsert(
      {
        product_id,
        location_id,
        quantity: quantity ?? 0,
        min_level: min_level ?? 0,
        max_level: max_level ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,location_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    supabase,
    actorId: _actorId ?? "system",
    action: "stock_adjust",
    entityType: "sku_stock",
    entityId: `${product_id}_${location_id}`,
    details: { product_id, location_id, quantity, min_level, max_level },
  });

  return NextResponse.json(data);
}
