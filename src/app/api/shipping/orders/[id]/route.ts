import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customers(*),
      items:order_items(
        *,
        device:devices(*, template:product_templates(display_name, brand, model)),
        sku_product:sku_products(title, images)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: activity } = await supabase
    .from("activity_log")
    .select("*")
    .eq("entity_type", "order")
    .eq("entity_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ order, activity: activity ?? [] });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { status, notes } = await request.json();

  const VALID_STATUSES = [
    "pending", "confirmed", "shipped", "picked_up",
    "delivered", "cancelled", "refunded",
  ];

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: current, error: fetchErr } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const allowed = getValidTransitions(current.status);
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from '${current.status}' to '${status}'` },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
  if (status === "shipped") updates.shipped_at = new Date().toISOString();
  if (status === "delivered") updates.delivered_at = new Date().toISOString();
  if (notes) updates.notes = notes;

  const { error: updateErr } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    action: "order_status_change",
    entity_type: "order",
    entity_id: id,
    details: {
      from: current.status,
      to: status,
      notes,
    },
  });

  return NextResponse.json({ success: true, status });
}

function getValidTransitions(current: string): string[] {
  const transitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipped", "picked_up", "cancelled"],
    shipped: ["delivered", "refunded"],
    picked_up: [],
    delivered: ["refunded"],
    cancelled: [],
    refunded: [],
  };
  return transitions[current] ?? [];
}
