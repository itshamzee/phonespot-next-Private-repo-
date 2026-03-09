import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "name",
    "slug",
    "model_id",
    "price_dkk",
    "estimated_minutes",
    "sort_order",
    "active",
    "description",
    "warranty_info",
    "includes",
    "estimated_time_label",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "price_dkk") {
        updates[key] = Number(body[key]);
      } else if (key === "estimated_minutes") {
        updates[key] = body[key] != null ? Number(body[key]) : null;
      } else {
        updates[key] = body[key];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Ingen felter at opdatere" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("repair_services")
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

  const { error } = await supabase.from("repair_services").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
