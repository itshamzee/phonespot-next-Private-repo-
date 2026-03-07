import { NextResponse } from "next/server";
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
    const { data: ticket } = await supabase
      .from("repair_tickets")
      .select("id")
      .or(`shopify_order_id.eq.${orderId},shopify_draft_order_id.eq.${orderId}`)
      .single();

    if (ticket) {
      await supabase
        .from("repair_tickets")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          shopify_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
    }
  }

  if (topic === "orders/cancelled") {
    const orderId = String(payload.id);
    const { data: ticket } = await supabase
      .from("repair_tickets")
      .select("id")
      .or(`shopify_order_id.eq.${orderId},shopify_draft_order_id.eq.${orderId}`)
      .single();

    if (ticket) {
      await supabase
        .from("repair_tickets")
        .update({
          paid: false,
          paid_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
    }
  }

  return NextResponse.json({ received: true });
}
