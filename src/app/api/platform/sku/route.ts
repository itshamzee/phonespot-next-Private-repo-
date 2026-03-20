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
    .select("*, supplier:suppliers(id, name), stock:sku_stock(location_id, quantity, location:locations(id, name))")
    .order("title");

  const category = params.get("category");
  const subcategory = params.get("subcategory");
  const brand = params.get("brand");
  const search = params.get("search");
  const active = params.get("active");
  const locationId = params.get("location_id");

  if (category) query = query.eq("category", category);
  if (subcategory) query = query.eq("subcategory", subcategory);
  if (brand) query = query.eq("brand", brand);
  if (active !== null) query = query.eq("is_active", active === "true");
  if (search) query = query.or(`title.ilike.%${search}%,ean.ilike.%${search}%,product_number.ilike.%${search}%`);

  const templateId = params.get("template_id");
  if (templateId) {
    const { data: links } = await supabase
      .from("sku_product_templates")
      .select("sku_product_id")
      .eq("template_id", templateId);
    const ids = (links ?? []).map((l: { sku_product_id: string }) => l.sku_product_id);
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in("id", ids);
  }

  // Filter by "has stock > 0 at location"
  if (locationId) {
    const { data: stockRows } = await supabase
      .from("sku_stock")
      .select("product_id")
      .eq("location_id", locationId)
      .gt("quantity", 0);
    const ids = (stockRows ?? []).map((s: { product_id: string }) => s.product_id);
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in("id", ids);
  }

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

  // Check for duplicates by EAN or product_number
  const duplicateChecks = [];
  if (body.ean) {
    duplicateChecks.push(
      supabase.from("sku_products").select("id, title").eq("ean", body.ean).maybeSingle()
    );
  } else {
    duplicateChecks.push(Promise.resolve({ data: null }));
  }
  if (body.product_number) {
    duplicateChecks.push(
      supabase.from("sku_products").select("id, title").eq("product_number", body.product_number).maybeSingle()
    );
  } else {
    duplicateChecks.push(Promise.resolve({ data: null }));
  }

  const [eanResult, pnResult] = await Promise.all(duplicateChecks);

  const duplicate = eanResult.data || pnResult.data;
  if (duplicate) {
    return NextResponse.json(
      { error: `Produkt findes allerede: "${duplicate.title}" (ID: ${duplicate.id})` },
      { status: 409 }
    );
  }

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

export async function PATCH(request: Request) {
  const body = await request.json();
  const { items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const supabase = createServerClient();
  let updated = 0;
  const errors: string[] = [];

  for (const item of items) {
    const { id, ...fields } = item;
    if (!id) {
      errors.push("Item missing id");
      continue;
    }

    // Only allow specific fields to be bulk-updated
    const allowed: Record<string, unknown> = {};
    if (fields.selling_price !== undefined) allowed.selling_price = fields.selling_price;
    if (fields.category !== undefined) allowed.category = fields.category;
    if (fields.subcategory !== undefined) allowed.subcategory = fields.subcategory;
    if (fields.status !== undefined) allowed.status = fields.status;
    if (fields.is_active !== undefined) allowed.is_active = fields.is_active;

    if (Object.keys(allowed).length === 0) {
      errors.push(`No valid fields for item ${id}`);
      continue;
    }

    const { error } = await supabase
      .from("sku_products")
      .update(allowed)
      .eq("id", id);

    if (error) {
      errors.push(`${id}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return NextResponse.json({ updated, errors });
}

export async function DELETE(request: Request) {
  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("sku_products")
    .delete()
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: ids.length });
}
