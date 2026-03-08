import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import crypto from "crypto";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";

function verifyWebhook(body: string, hmac: string): boolean {
  const hash = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

/** Find a repair ticket by order ID or draft order ID (checks both numeric and GID formats) */
async function findTicketByOrderId(
  supabase: ReturnType<typeof createServerClient>,
  orderId: string,
  draftOrderId?: string | null,
): Promise<string | null> {
  // Try matching by draft_order_id first (for advance repair payments)
  if (draftOrderId) {
    const gid = `gid://shopify/DraftOrder/${draftOrderId}`;
    const { data } = await supabase
      .from("repair_tickets")
      .select("id")
      .or(`shopify_draft_order_id.eq.${draftOrderId},shopify_draft_order_id.eq.${gid}`)
      .single();
    if (data) return data.id;
  }

  // Fall back to order_id matching
  const { data } = await supabase
    .from("repair_tickets")
    .select("id")
    .or(`shopify_order_id.eq.${orderId},shopify_draft_order_id.eq.${orderId}`)
    .single();

  return data?.id ?? null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = request.headers.get("x-shopify-topic") ?? "";

  if (SHOPIFY_WEBHOOK_SECRET && !verifyWebhook(body, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const supabase = createServerClient();

  if (topic === "orders/paid") {
    const orderId = String(payload.id);
    const draftOrderId = payload.draft_order_id ? String(payload.draft_order_id) : null;

    const ticketId = await findTicketByOrderId(supabase, orderId, draftOrderId);

    if (ticketId) {
      await supabase
        .from("repair_tickets")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          shopify_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      // Send payment confirmation email to customer
      try {
        const { data: paidTicket } = await supabase
          .from("repair_tickets")
          .select("customer_name, customer_email, device_model, booking_details")
          .eq("id", ticketId)
          .single();

        if (paidTicket?.customer_email) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const bookingDetails = paidTicket.booking_details as Record<string, unknown> | null;
          const preferredDate = bookingDetails?.preferred_date as string | undefined;

          await resend.emails.send({
            from: "PhoneSpot <noreply@phonespot.dk>",
            to: paidTicket.customer_email,
            subject: `Betaling bekræftet — ${paidTicket.device_model}`,
            text: [
              `Hej ${paidTicket.customer_name},`,
              "",
              `Tak for din betaling! Din reparation af ${paidTicket.device_model} er nu bekræftet.`,
              "",
              `Sags-ID: ${ticketId.slice(0, 8)}`,
              ...(preferredDate ? [`Ønsket aflevering: ${preferredDate}`] : []),
              "",
              "Vi ser frem til at modtage din enhed. Kom forbi butikken på den aftalte dato.",
              "",
              "Med venlig hilsen,",
              "PhoneSpot",
            ].join("\n"),
          });
        }
      } catch (emailErr) {
        console.error("Payment confirmation email error:", emailErr);
      }
    }
  }

  if (topic === "orders/cancelled") {
    const orderId = String(payload.id);
    const draftOrderId = payload.draft_order_id ? String(payload.draft_order_id) : null;

    const ticketId = await findTicketByOrderId(supabase, orderId, draftOrderId);

    if (ticketId) {
      await supabase
        .from("repair_tickets")
        .update({
          paid: false,
          paid_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);
    }
  }

  return NextResponse.json({ received: true });
}
