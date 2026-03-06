import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("repair_brands")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { slug, name, device_type, sort_order } = body;

  if (!slug || !name || !device_type) {
    return NextResponse.json(
      { error: "slug, name og device_type er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("repair_brands")
    .insert({
      slug: slug.trim(),
      name: name.trim(),
      device_type,
      sort_order: sort_order ?? 0,
      active: true,
      logo_url: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
