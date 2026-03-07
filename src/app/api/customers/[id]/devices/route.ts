import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { brand, model, serial_number, color, condition_notes, photos } = body;

  if (!brand || !model) {
    return NextResponse.json(
      { error: "Brand og model er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customer_devices")
    .insert({
      customer_id: id,
      brand: brand.trim(),
      model: model.trim(),
      serial_number: serial_number?.trim() || null,
      color: color?.trim() || null,
      condition_notes: condition_notes?.trim() || null,
      photos: photos ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
