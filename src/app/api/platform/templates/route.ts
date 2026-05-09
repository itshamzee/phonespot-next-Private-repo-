// GET /api/platform/templates — list product templates for select dropdowns
// POST /api/platform/templates — create a new product template
// Supports optional ?search=... query param for filtering

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const search = request.nextUrl.searchParams.get("search");

  let query = supabase
    .from("product_templates")
    .select("*")
    .order("brand")
    .order("model");

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = createAdminClient();

  const {
    brand,
    model,
    display_name,
    category,
    storage_options,
    colors,
    base_price_a,
    base_price_b,
    base_price_c,
    description,
    short_description,
    meta_title,
    meta_description,
    slug,
    images,
    specifications,
    status,
  } = body;

  if (!brand || !model || !display_name || !category || !slug) {
    return NextResponse.json(
      { error: "brand, model, display_name, category og slug er påkrævet" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("product_templates")
    .insert({
      brand,
      model,
      display_name,
      category,
      slug,
      storage_options: storage_options ?? [],
      colors: colors ?? [],
      base_price_a: base_price_a ?? null,
      base_price_b: base_price_b ?? null,
      base_price_c: base_price_c ?? null,
      description: description || null,
      short_description: short_description || null,
      meta_title: meta_title || null,
      meta_description: meta_description || null,
      images: images ?? [],
      specifications: specifications ?? {},
      status: status ?? "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let updated = 0;
  const errors: string[] = [];

  for (const item of items) {
    const { id, ...fields } = item;
    if (!id) {
      errors.push("Item missing id");
      continue;
    }

    // Allowlist for bulk updates
    const allowed: Record<string, unknown> = {};
    if (fields.status !== undefined) allowed.status = fields.status;
    if (fields.base_price_a !== undefined) allowed.base_price_a = fields.base_price_a;
    if (fields.base_price_b !== undefined) allowed.base_price_b = fields.base_price_b;
    if (fields.base_price_c !== undefined) allowed.base_price_c = fields.base_price_c;
    if (fields.brand !== undefined) allowed.brand = fields.brand;
    if (fields.category !== undefined) allowed.category = fields.category;

    if (Object.keys(allowed).length === 0) {
      errors.push(`No valid fields for item ${id}`);
      continue;
    }

    allowed.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("product_templates")
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
  const body = await request.json();
  const { id, ids } = body;

  // Accept either a single id (legacy) or an ids array (bulk)
  const targetIds: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (targetIds.length === 0) {
    return NextResponse.json({ error: "id or ids array required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("product_templates")
    .delete()
    .in("id", targetIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: targetIds.length });
}
