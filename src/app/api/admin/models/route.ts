import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brand_id");

  const supabase = createServerClient();

  let query = supabase
    .from("repair_models")
    .select("*")
    .order("sort_order", { ascending: true });

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { brand_id, slug, name, sort_order } = body;

  if (!brand_id || !slug || !name) {
    return NextResponse.json(
      { error: "brand_id, slug og name er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("repair_models")
    .insert({
      brand_id,
      slug: slug.trim(),
      name: name.trim(),
      sort_order: sort_order ?? 0,
      active: true,
      image_url: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
