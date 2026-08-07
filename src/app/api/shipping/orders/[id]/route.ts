import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORES } from "@/lib/store-config";
import { BRAND } from "@/lib/email/brand";

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
      const store = fullOrder.shipping_method === "click_collect_vejle" ? STORES.vejle : STORES.slagelse;
      // BRAND.stores carries the same store's display-formatted hours string
      // used in the rest of the email templates — match on name, not index.
      const brandStore = BRAND.stores.find((s) => s.name === store.name) ?? BRAND.stores[0];
      const locationInfo = {
        name: store.name,
        address: `${store.street}, ${store.zip} ${store.city}`,
        phone: store.phone,
        mapUrl: store.googleMapsUrl,
        hours: brandStore.hours,
      };

      try {
        const { Resend } = await import("resend");
        const { default: ReadyForPickupEmail } = await import("@/lib/email/templates/ready-for-pickup");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "PhoneSpot <info@phonespot.dk>",
          to: fullOrder.customer.email,
          subject: `Din ordre ${fullOrder.order_number} er klar til afhentning`,
          react: ReadyForPickupEmail({
            orderNumber: fullOrder.order_number,
            customerName: fullOrder.customer.name ?? "Kunde",
            locationName: locationInfo.name,
            locationAddress: locationInfo.address,
            locationPhone: locationInfo.phone,
            locationMapUrl: locationInfo.mapUrl,
            locationHours: locationInfo.hours,
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

/**
 * DELETE /api/shipping/orders/[id]
 *
 * Permanent deletion of an order. Allowed only when:
 *   - payment_status is NOT 'paid' (never delete paid orders)
 *   - status is in {pending, cancelled, abandoned, checkout, draft}
 *
 * Side effects:
 *   - Any reserved devices on the order are released back to status='listed'
 *   - order_items rows are removed (cascade or explicit, both safe here)
 *   - activity_log entry is written before the delete so it survives
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total, customer_id, items:order_items(id, item_type, device_id, quantity)")
    .eq("id", id)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Hard guard: never delete paid orders
  if (order.payment_status === "paid") {
    return NextResponse.json(
      { error: "Kan ikke slette en betalt ordre. Refunder først, eller marker som annulleret." },
      { status: 400 },
    );
  }

  const DELETABLE_STATUSES = ["pending", "cancelled", "abandoned", "checkout", "draft"];
  if (!DELETABLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      {
        error: `Kan ikke slette ordre med status '${order.status}'. Tilladt: ${DELETABLE_STATUSES.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  // ----- Release any reserved devices held by this order -----
  // We pull device_ids from order_items and flip them back to "listed" if and
  // only if they are currently "reserved". Devices already sold/listed are
  // left alone — we don't risk overwriting state we don't own.
  const items = (order.items as Array<{ item_type: string; device_id: string | null; quantity: number }>) ?? [];
  const deviceIds = items
    .filter((it) => it.item_type === "device" && it.device_id)
    .map((it) => it.device_id as string);

  let releasedCount = 0;
  if (deviceIds.length > 0) {
    const { data: released, error: relErr } = await supabase
      .from("devices")
      .update({ status: "listed", reservation_expires_at: null })
      .in("id", deviceIds)
      .eq("status", "reserved")
      .select("id");
    if (relErr) {
      return NextResponse.json(
        { error: `Kunne ikke frigive reserverede enheder: ${relErr.message}` },
        { status: 500 },
      );
    }
    releasedCount = released?.length ?? 0;
  }

  // ----- Audit log BEFORE delete (so we have a record even if delete fails halfway) -----
  await supabase.from("activity_log").insert({
    action: "order_deleted",
    entity_type: "order",
    entity_id: id,
    details: {
      order_number: order.order_number,
      previous_status: order.status,
      previous_payment_status: order.payment_status,
      total: order.total,
      released_device_count: releasedCount,
      released_device_ids: deviceIds,
    },
  });

  // ----- Delete child rows first (defensive — schema may or may not have ON DELETE CASCADE) -----
  await supabase.from("order_items").delete().eq("order_id", id);

  const { error: delErr } = await supabase.from("orders").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json(
      { error: `Kunne ikke slette ordre: ${delErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    deleted_order_id: id,
    released_devices: releasedCount,
  });
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
