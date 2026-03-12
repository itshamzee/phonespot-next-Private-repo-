import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { Resend } from "resend";
import RefundConfirmationEmail from "@/lib/email/templates/refund-confirmation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});
const resend = new Resend(process.env.RESEND_API_KEY);

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { reason, amount } = await request.json();

  if (!reason) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customers(*),
      items:order_items(*, device:devices(id, status))
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!["shipped", "delivered"].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot refund order with status '${order.status}'` },
      { status: 400 }
    );
  }

  if (!order.stripe_payment_id) {
    return NextResponse.json(
      { error: "No Stripe payment ID on this order" },
      { status: 400 }
    );
  }

  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: order.stripe_payment_id,
      reason: "requested_by_customer",
    };
    if (amount) {
      refundParams.amount = amount;
    }

    const refund = await stripe.refunds.create(refundParams);

    await supabase
      .from("orders")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", id);

    for (const item of order.items ?? []) {
      if (item.device_id && item.device) {
        await supabase
          .from("devices")
          .update({ status: "returned", updated_at: new Date().toISOString() })
          .eq("id", item.device_id);
      }
    }

    await supabase.from("activity_log").insert({
      action: "refund",
      entity_type: "order",
      entity_id: id,
      details: {
        stripe_refund_id: refund.id,
        amount: refund.amount,
        reason,
        partial: !!amount,
      },
    });

    if (order.customer?.email) {
      try {
        await resend.emails.send({
          from: "PhoneSpot <ordre@phonespot.dk>",
          to: order.customer.email,
          subject: `Refusion for ordre ${order.order_number}`,
          react: RefundConfirmationEmail({
            orderNumber: order.order_number,
            customerName: order.customer.name ?? "Kunde",
            refundAmount: refund.amount,
            reason,
          }),
        });
      } catch {
        console.warn("Failed to send refund email, continuing...");
      }
    }

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount: refund.amount,
    });
  } catch (err) {
    console.error("Stripe refund failed:", err);
    return NextResponse.json(
      { error: "Refusion mislykkedes. Tjek Stripe dashboard." },
      { status: 502 }
    );
  }
}
