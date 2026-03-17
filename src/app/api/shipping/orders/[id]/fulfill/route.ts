import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import ShippingConfirmationEmail from "@/lib/email/templates/shipping-confirmation";
import { sendPushover } from "@/lib/notifications/pushover";
import { sendTrustpilotInvitation } from "@/lib/trustpilot/invite";

const resend = new Resend(process.env.RESEND_API_KEY);

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const { tracking_number, tracking_url, carrier, mark_delivered } = body;

  const supabase = createAdminClient();

  // Support both "mark as shipped" and "mark as delivered"
  if (mark_delivered) {
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        fulfillment_status: "delivered",
        status: "delivered",
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, customer:customers(email, name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("activity_log").insert({
      action: "order_delivered",
      entity_type: "order",
      entity_id: id,
      details: {},
    });

    // Send Trustpilot review invitation (7 days after delivery)
    if (order.customer?.email) {
      try {
        await sendTrustpilotInvitation({
          customerEmail: order.customer.email,
          customerName: order.customer.name ?? "Kunde",
          orderNumber: order.order_number,
        });
      } catch (tpErr) {
        console.error("[fulfill] Trustpilot invitation failed:", tpErr);
      }
    }

    return NextResponse.json(order);
  }

  // Mark as shipped
  const { data: order, error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: "shipped",
      status: "shipped",
      tracking_number: tracking_number || null,
      tracking_url: tracking_url || null,
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, customer:customers(email, name, phone)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to activity_log
  await supabase.from("activity_log").insert({
    action: "order_fulfilled",
    entity_type: "order",
    entity_id: id,
    details: { tracking_number, tracking_url, carrier },
  });

  // Auto-send shipping confirmation email if tracking number is provided
  if (tracking_number && order.customer?.email) {
    try {
      const trackingLink = tracking_url || buildTrackingUrl(order.shipping_method, tracking_number);

      await resend.emails.send({
        from: "PhoneSpot <ordre@phonespot.dk>",
        to: order.customer.email,
        subject: `Din ordre ${order.order_number} er afsendt`,
        react: ShippingConfirmationEmail({
          orderNumber: order.order_number,
          customerName: order.customer.name ?? "Kunde",
          trackingNumber: tracking_number,
          trackingUrl: trackingLink,
          shippingMethod: order.shipping_method,
        }),
      });

      console.log(`[fulfill] Tracking email sent for order ${order.order_number}`);
    } catch (emailErr) {
      console.error(`[fulfill] Failed to send tracking email:`, emailErr);
      // Non-fatal: order is already marked as shipped
    }
  }

  return NextResponse.json(order);
}

function buildTrackingUrl(method: string | null, trackingNumber: string): string {
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
