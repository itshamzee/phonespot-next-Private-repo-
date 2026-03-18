// POST /api/platform/devices/quick-add
// Creates a device with status "listed" and auto-publishes the template

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/platform/activity-log";
import { z } from "zod";

const quickAddSchema = z.object({
  template_id: z.string().uuid(),
  grade: z.enum(["A", "B", "C"]),
  storage: z.string().optional(),
  color: z.string().optional(),
  purchase_price: z.number().int().positive(),
  selling_price: z.number().int().positive(),
  location_id: z.string().uuid(),
  imei: z.string().optional(),
  battery_health: z.number().int().min(0).max(100).optional(),
  condition_notes: z.string().optional(),
  vat_scheme: z.enum(["brugtmoms", "regular"]).default("brugtmoms"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = quickAddSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validering fejlede", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const data = parsed.data;

  // Generate barcode
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const barcode = `PS-${dateStr}-${rand}`;

  // Create device directly as "listed"
  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .insert({
      template_id: data.template_id,
      grade: data.grade,
      storage: data.storage || null,
      color: data.color || null,
      purchase_price: data.purchase_price,
      selling_price: data.selling_price,
      location_id: data.location_id,
      imei: data.imei || null,
      battery_health: data.battery_health ?? null,
      condition_notes: data.condition_notes || null,
      vat_scheme: data.vat_scheme,
      barcode,
      status: "listed",
      purchased_at: now.toISOString(),
      listed_at: now.toISOString(),
    })
    .select(`
      *,
      template:product_templates(id, brand, model, display_name, category),
      location:locations(id, name)
    `)
    .single();

  if (deviceError) {
    return NextResponse.json({ error: deviceError.message }, { status: 500 });
  }

  // Auto-publish template if it's still a draft
  await supabase
    .from("product_templates")
    .update({ status: "published", updated_at: now.toISOString() })
    .eq("id", data.template_id)
    .eq("status", "draft");

  // Log activity
  await logActivity({
    supabase,
    actorId: "system",
    action: "device_quick_add",
    entityType: "device",
    entityId: device.id,
    details: {
      barcode,
      template: device.template?.display_name,
      grade: device.grade,
      selling_price: device.selling_price,
      location: device.location?.name,
    },
  });

  return NextResponse.json(device, { status: 201 });
}
