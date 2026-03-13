import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { stripe } from "@/lib/stripe/client";

/**
 * POST /api/refund
 * Process a refund for an order.
 * - Full or partial refund via Stripe
 * - Marks devices as "returned"
 * - Logs activity
 *
 * Body: {
 *   orderId: string,
 *   reason: string,
 *   amount?: number, // øre — partial refund amount (defaults to full)
 *   deviceIds?: string[], // specific devices being returned (optional)
 * }
 *
 * Access: Staff only (manager or owner).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("id, name, role")
      .eq("auth_id", user.id)
      .single();

    if (!staff || !["manager", "owner"].includes(staff.role)) {
      return NextResponse.json(
        { error: "Kun managere og ejere kan behandle returneringer" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderId, reason, amount, deviceIds } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId mangler" }, { status: 400 });
    }

    if (!reason || typeof reason !== "string") {
      return NextResponse.json({ error: "Angiv en begrundelse" }, { status: 400 });
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id, order_number, status, total, stripe_payment_id,
        order_items ( id, item_type, device_id, quantity, unit_price, total_price )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Ordre ikke fundet" }, { status: 404 });
    }

    if (!["confirmed", "shipped", "picked_up", "delivered"].includes(order.status)) {
      return NextResponse.json(
        { error: `Kan ikke refundere ordre med status '${order.status}'` },
        { status: 400 }
      );
    }

    const refundAmount = amount ?? order.total;

    if (refundAmount <= 0 || refundAmount > order.total) {
      return NextResponse.json(
        { error: "Ugyldigt refunderingsbelob" },
        { status: 400 }
      );
    }

    // Process Stripe refund if payment was made via Stripe
    let stripeRefundId: string | null = null;
    if (order.stripe_payment_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_id,
          amount: refundAmount, // Stripe uses smallest currency unit (øre for DKK)
          reason: "requested_by_customer",
        });
        stripeRefundId = refund.id;
      } catch (stripeErr) {
        console.error("[refund] Stripe refund failed:", stripeErr);
        return NextResponse.json(
          { error: "Stripe refundering fejlede. Kontrollér betalingen i Stripe Dashboard." },
          { status: 500 }
        );
      }
    }

    // Update order status
    const isFullRefund = refundAmount === order.total;
    const newStatus = isFullRefund ? "refunded" : order.status;

    await supabase
      .from("orders")
      .update({
        status: newStatus,
        notes: `Refunderet ${refundAmount / 100} DKK — ${reason}${stripeRefundId ? ` (Stripe: ${stripeRefundId})` : ""}`,
      })
      .eq("id", orderId);

    // Mark returned devices
    const orderItems = (order as any).order_items ?? [];
    const returnedDeviceIds = deviceIds && Array.isArray(deviceIds)
      ? deviceIds
      : orderItems
          .filter((i: any) => i.item_type === "device" && i.device_id)
          .map((i: any) => i.device_id);

    if (isFullRefund && returnedDeviceIds.length > 0) {
      await supabase
        .from("devices")
        .update({ status: "returned" })
        .in("id", returnedDeviceIds);
    }

    // Log activity
    await supabase.from("activity_log").insert({
      actor_id: staff.id,
      actor_type: "staff",
      action: isFullRefund ? "full_refund" : "partial_refund",
      entity_type: "order",
      entity_id: orderId,
      details: {
        amount: refundAmount,
        reason,
        stripe_refund_id: stripeRefundId,
        returned_devices: returnedDeviceIds,
        staff_name: staff.name,
      },
    });

    return NextResponse.json({
      success: true,
      refundAmount,
      isFullRefund,
      stripeRefundId,
      orderStatus: newStatus,
      returnedDevices: returnedDeviceIds,
    });
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json(
      { error: "Fejl ved behandling af refundering" },
      { status: 500 }
    );
  }
}
