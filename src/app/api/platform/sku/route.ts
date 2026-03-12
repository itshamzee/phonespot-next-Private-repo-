// GET /api/platform/sku — list SKU products with optional filters
// POST /api/platform/sku — create a new SKU product

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/platform/activity-log";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  let query = supabase
    .from("sku_products")
    .select("*, supplier:suppliers(id, name)")
    .order("title");

  const category = params.get("category");
  const brand = params.get("brand");
  const search = params.get("search");
  const active = params.get("active");

  if (category) query = query.eq("category", category);
  if (brand) query = query.eq("brand", brand);
  if (active !== null) query = query.eq("is_active", active === "true");
  if (search) query = query.or(`title.ilike.%${search}%,ean.ilike.%${search}%,product_number.ilike.%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, ean, product_number, cost_price, selling_price, sale_price, brand, category, subcategory, supplier_id, images, _actorId } = body;

  if (!title || !selling_price) {
    return NextResponse.json({ error: "title and selling_price are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("sku_products")
    .insert({
      title: title.trim(),
      description: description ?? null,
      ean: ean ?? null,
      product_number: product_number ?? null,
      cost_price: cost_price ?? null,
      selling_price,
      sale_price: sale_price ?? null,
      brand: brand ?? null,
      category: category ?? null,
      subcategory: subcategory ?? null,
      supplier_id: supplier_id ?? null,
      images: images ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    supabase,
    actorId: _actorId ?? "system",
    action: "sku_create",
    entityType: "sku_product",
    entityId: data.id,
    details: { title, selling_price, category },
  });

  return NextResponse.json(data, { status: 201 });
}
