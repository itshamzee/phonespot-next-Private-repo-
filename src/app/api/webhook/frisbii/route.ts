export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifyFrisbiiSignature } from "@/lib/payments/frisbii/webhook-signature";
import { completeFrisbiiOrder } from "@/lib/payments/frisbii/order-payment";

/**
 * Frisbii-webhook. Opsættes i Frisbii admin (Developers > Webhooks) med URL
 *   https://phonespot.dk/api/webhook/frisbii
 * og events: invoice_authorized, invoice_settled (+ gerne invoice_refund,
 * invoice_cancelled, invoice_failed til logning).
 *
 * Frisbii prøver igen ved alt andet end 2xx, så handleren er idempotent
 * (complete_checkout_order gør intet anden gang). Svaret skal komme inden
 * for 10 sekunder.
 */

interface FrisbiiWebhookPayload {
  id?: string;
  event_id?: string;
  event_type?: string;
  timestamp?: string;
  signature?: string;
  invoice?: string;
  customer?: string;
  transaction?: string;
}

export async function POST(req: NextRequest) {
  const secret = process.env.FRISBII_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[frisbii webhook] FRISBII_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let payload: FrisbiiWebhookPayload;
  try {
    payload = (await req.json()) as FrisbiiWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyFrisbiiSignature(payload, [secret, process.env.FRISBII_WEBHOOK_SECRET_PREVIOUS])) {
    console.error("[frisbii webhook] signature verification failed", payload.id);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { event_type: eventType, invoice } = payload;

  try {
    switch (eventType) {
      case "invoice_authorized":
      case "invoice_settled": {
        if (!invoice) break;
        const result = await completeFrisbiiOrder(invoice);
        console.log(`[frisbii webhook] ${eventType} ${invoice}: ${result}`);
        break;
      }
      case "invoice_refund":
      case "invoice_cancelled":
      case "invoice_failed":
        // Refundering og annullering startes fra admin, som selv opdaterer
        // ordren. Her logges kun, så asynkrone resultater kan spores.
        console.log(`[frisbii webhook] ${eventType}`, invoice, payload.transaction ?? "");
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`[frisbii webhook] error handling ${eventType}:`, err);
    return NextResponse.json({ error: "Internal error processing webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
