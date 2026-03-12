// GET /api/platform/devices/[id] — single device with relations
// PATCH /api/platform/devices/[id] — update device fields
// DELETE /api/platform/devices/[id] — delete device (only intake/graded status)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { deviceUpdateSchema } from "@/lib/platform/device-schema";
import { logActivity } from "@/lib/platform/activity-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("devices")
    .select(`
      *,
      template:product_templates(*),
      location:locations(id, name, type),
      supplier:suppliers(id, name, type, is_vat_registered),
      purchase_documents(id, pdf_url, document_date, seller_name)
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const parsed = deviceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const { data: current } = await supabase.from("devices").select("*").eq("id", id).single();

  const { data, error } = await supabase
    .from("devices")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, val] of Object.entries(parsed.data)) {
    if (current && current[key] !== val) {
      changes[key] = { old: current[key], new: val };
    }
  }

  if (Object.keys(changes).length > 0) {
    await logActivity({
      supabase,
      actorId: body._actorId ?? "system",
      action: parsed.data.selling_price !== undefined ? "price_change" : "device_update",
      entityType: "device",
      entityId: id,
      details: changes,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: device } = await supabase
    .from("devices")
    .select("status")
    .eq("id", id)
    .single();

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  if (!["intake", "graded"].includes(device.status)) {
    return NextResponse.json(
      { error: "Kan kun slette enheder med status 'intake' eller 'graded'" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("devices").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  await logActivity({
    supabase,
    actorId: body._actorId ?? "system",
    action: "device_delete",
    entityType: "device",
    entityId: id,
    details: {},
  });

  return NextResponse.json({ success: true });
}
