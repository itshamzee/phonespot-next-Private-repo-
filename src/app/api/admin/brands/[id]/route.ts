import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const allowed = ["name", "slug", "device_type", "sort_order", "active", "logo_url"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Ingen felter at opdatere" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("repair_brands")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Delete cascades: services -> models -> brand
  // First delete services for all models of this brand
  const { data: models } = await supabase
    .from("repair_models")
    .select("id")
    .eq("brand_id", id);

  if (models && models.length > 0) {
    const modelIds = models.map((m) => m.id);
    await supabase.from("repair_services").delete().in("model_id", modelIds);
    await supabase.from("repair_models").delete().eq("brand_id", id);
  }

  const { error } = await supabase.from("repair_brands").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
