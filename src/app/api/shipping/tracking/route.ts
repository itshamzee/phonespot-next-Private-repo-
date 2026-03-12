import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import ShippingConfirmationEmail from "@/lib/email/templates/shipping-confirmation";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { order_id } = await request.json();
  if (!order_id) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, customer:customers(*)")
    .eq("id", order_id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!order.tracking_number) {
    return NextResponse.json(
      { error: "No tracking number on this order" },
      { status: 400 }
    );
  }

  const customerEmail = order.customer?.email;
  if (!customerEmail) {
    return NextResponse.json(
      { error: "No customer email" },
      { status: 400 }
    );
  }

  const trackingUrl = buildTrackingUrl(order.shipping_method, order.tracking_number);

  try {
    await resend.emails.send({
      from: "PhoneSpot <ordre@phonespot.dk>",
      to: customerEmail,
      subject: `Din ordre ${order.order_number} er afsendt`,
      react: ShippingConfirmationEmail({
        orderNumber: order.order_number,
        customerName: order.customer?.name ?? "Kunde",
        trackingNumber: order.tracking_number,
        trackingUrl,
        shippingMethod: order.shipping_method,
      }),
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Failed to send tracking email:", err);
    return NextResponse.json(
      { error: "Email sending failed" },
      { status: 500 }
    );
  }
}

function buildTrackingUrl(method: string, trackingNumber: string): string {
  if (method?.startsWith("gls")) {
    return `https://www.gls-group.eu/276-I-PORTAL-WEB/content/GLS/DK01/DA/5004.htm?txtAction=71000&txtQuery=${trackingNumber}`;
  }
  if (method?.startsWith("postnord")) {
    return `https://tracking.postnord.com/dk/?id=${trackingNumber}`;
  }
  if (method?.startsWith("dao")) {
    return `https://dao.as/tracking/${trackingNumber}`;
  }
  return "";
}
