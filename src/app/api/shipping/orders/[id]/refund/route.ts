import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import RefundConfirmationEmail from "@/lib/email/templates/refund-confirmation";
import { refundOrderPayment, RefundError } from "@/lib/payments/refund";
import { hasGuaranteeQualifyingDevice, uspsForOrder } from "@/lib/email/brand";
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
      items:order_items(*, device:devices(id, status), sku_product:sku_products(category))
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
      { error: "Ordren har ingen betalings-id (Stripe/Frisbii)" },
      { status: 400 }
    );
  }

  try {
    const providerRefund = await refundOrderPayment(order, amount ? Number(amount) : undefined, { reason });
    const refund = {
      id: providerRefund?.refundId ?? null,
      amount: providerRefund?.amount ?? (amount ? Number(amount) : order.total),
      provider: providerRefund?.provider ?? null,
    };

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
        refund_provider: refund.provider,
        amount: refund.amount,
        reason,
        partial: !!amount,
      },
    });

    if (order.customer?.email) {
      try {
        // Accessory-only orders must not promise the 36-month device
        // guarantee in the refund confirmation's USP bar.
        const guaranteeItems = ((order.items as any[]) ?? []).map((item) => ({
          itemType: item.item_type as "device" | "sku_product",
          category: item.sku_product?.category ?? null,
        }));
        const usps = uspsForOrder(hasGuaranteeQualifyingDevice(guaranteeItems));

        await resend.emails.send({
          from: "PhoneSpot <info@phonespot.dk>",
          to: order.customer.email,
          subject: `Refusion for ordre ${order.order_number}`,
          react: RefundConfirmationEmail({
            orderNumber: order.order_number,
            customerName: order.customer.name ?? "Kunde",
            refundAmount: refund.amount,
            reason,
            usps,
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
    console.error("Provider refund failed:", err);
    return NextResponse.json(
      { error: err instanceof RefundError ? err.userMessage : "Refusion mislykkedes. Tjek betalingen i Stripe/Frisbii." },
      { status: 502 }
    );
  }
}
