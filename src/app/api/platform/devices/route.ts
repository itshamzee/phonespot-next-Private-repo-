// GET /api/platform/devices — list devices with filters
// POST /api/platform/devices — create a new device (intake)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { deviceIntakeSchema } from "@/lib/platform/device-schema";
import { logActivity } from "@/lib/platform/activity-log";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  let query = supabase
    .from("devices")
    .select(`
      *,
      template:product_templates(id, brand, model, display_name, category),
      location:locations(id, name),
      supplier:suppliers(id, name)
    `)
    .order("created_at", { ascending: false });

  const location = params.get("location_id");
  const status = params.get("status");
  const grade = params.get("grade");
  const category = params.get("category");
  const search = params.get("search");
  const brand = params.get("brand");
  const limit = parseInt(params.get("limit") ?? "50");
  const offset = parseInt(params.get("offset") ?? "0");

  if (location) query = query.eq("location_id", location);
  if (status) query = query.eq("status", status);
  if (grade) query = query.eq("grade", grade);
  if (category) query = query.eq("template.category", category);
  if (search) {
    query = query.or(`serial_number.ilike.%${search}%,imei.ilike.%${search}%,barcode.ilike.%${search}%`);
  }
  if (brand) {
    query = query.eq("template.brand", brand);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ devices: data, count });
}

export async function POST(request: Request) {
  const body = await request.json();

  const parsed = deviceIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { seller_name, seller_address, ...deviceData } = parsed.data;
  const supabase = createServerClient();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const barcode = `PS-${dateStr}-${rand}`;

  const { data: device, error } = await supabase
    .from("devices")
    .insert({
      ...deviceData,
      barcode,
      status: "intake",
      purchased_at: now.toISOString(),
    })
    .select(`
      *,
      template:product_templates(id, brand, model, display_name),
      location:locations(id, name),
      supplier:suppliers(id, name, is_vat_registered)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    supabase,
    actorId: body._actorId ?? "system",
    action: "device_intake",
    entityType: "device",
    entityId: device.id,
    details: {
      barcode,
      template: device.template?.display_name,
      grade: device.grade,
      purchase_price: device.purchase_price,
      location: device.location?.name,
    },
  });

  return NextResponse.json(device, { status: 201 });
}
