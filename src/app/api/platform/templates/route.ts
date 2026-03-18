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
    .select("id, brand, model, category, display_name, storage_options, colors")
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
