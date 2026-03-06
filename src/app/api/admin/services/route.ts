import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modelId = searchParams.get("model_id");

  const supabase = createServerClient();

  let query = supabase
    .from("repair_services")
    .select("*")
    .order("sort_order", { ascending: true });

  if (modelId) {
    query = query.eq("model_id", modelId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { model_id, slug, name, price_dkk, estimated_minutes, sort_order } = body;

  if (!model_id || !slug || !name || price_dkk == null) {
    return NextResponse.json(
      { error: "model_id, slug, name og price_dkk er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("repair_services")
    .insert({
      model_id,
      slug: slug.trim(),
      name: name.trim(),
      price_dkk: Number(price_dkk),
      estimated_minutes: estimated_minutes ? Number(estimated_minutes) : null,
      sort_order: sort_order ?? 0,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
