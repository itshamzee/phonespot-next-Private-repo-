// GET /api/platform/transfers — list recent transfers
// POST /api/platform/transfers — transfer a device between locations

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/platform/activity-log";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50");
  const deviceId = request.nextUrl.searchParams.get("device_id");

  let query = supabase
    .from("device_transfers")
    .select(`
      *,
      device:devices(id, barcode, template:product_templates(display_name)),
      from_location:locations!device_transfers_from_location_id_fkey(id, name),
      to_location:locations!device_transfers_to_location_id_fkey(id, name)
    `)
    .order("transferred_at", { ascending: false })
    .limit(limit);

  if (deviceId) {
    query = query.eq("device_id", deviceId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { device_id, to_location_id, reason, _actorId } = body;

  if (!device_id || !to_location_id) {
    return NextResponse.json({ error: "device_id and to_location_id are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: device, error: fetchError } = await supabase
    .from("devices")
    .select("id, location_id, barcode")
    .eq("id", device_id)
    .single();

  if (fetchError || !device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  if (device.location_id === to_location_id) {
    return NextResponse.json({ error: "Device is already at this location" }, { status: 400 });
  }

  const fromLocationId = device.location_id;

  const { data: transfer, error: transferError } = await supabase
    .from("device_transfers")
    .insert({
      device_id,
      from_location_id: fromLocationId,
      to_location_id: to_location_id,
      transferred_by: _actorId ?? "system",
      reason: reason ?? null,
      transferred_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (transferError) {
    return NextResponse.json({ error: transferError.message }, { status: 500 });
  }

  await supabase
    .from("devices")
    .update({ location_id: to_location_id, updated_at: new Date().toISOString() })
    .eq("id", device_id);

  await logActivity({
    supabase,
    actorId: _actorId ?? "system",
    action: "transfer",
    entityType: "device",
    entityId: device_id,
    details: {
      from_location_id: fromLocationId,
      to_location_id: to_location_id,
      reason,
      barcode: device.barcode,
    },
  });

  return NextResponse.json(transfer, { status: 201 });
}
