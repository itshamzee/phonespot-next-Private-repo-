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

  if (status === "confirmed") {
    // Check if this is a click & collect order
    const { data: fullOrder } = await supabase
      .from("orders")
      .select("*, customer:customers(*)")
      .eq("id", id)
      .single();

    if (fullOrder?.shipping_method?.startsWith("click_collect_") && fullOrder?.customer?.email) {
      const locationInfo = fullOrder.shipping_method === "click_collect_vejle"
        ? { name: "PhoneSpot Vejle", address: "Nørregade 22, 7100 Vejle", phone: "71 99 48 48" }
        : { name: "PhoneSpot Slagelse", address: "Løvegade 12, 4200 Slagelse", phone: "71 99 48 48" };

      try {
        const { Resend } = await import("resend");
        const { default: ReadyForPickupEmail } = await import("@/lib/email/templates/ready-for-pickup");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "PhoneSpot <ordre@phonespot.dk>",
          to: fullOrder.customer.email,
          subject: `Din ordre ${fullOrder.order_number} er klar til afhentning`,
          react: ReadyForPickupEmail({
            orderNumber: fullOrder.order_number,
            customerName: fullOrder.customer.name ?? "Kunde",
            locationName: locationInfo.name,
            locationAddress: locationInfo.address,
            locationPhone: locationInfo.phone,
          }),
        });
      } catch {
        console.warn("Failed to send ready-for-pickup email, continuing...");
      }
    }
  }

  return NextResponse.json({ success: true, status });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
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
