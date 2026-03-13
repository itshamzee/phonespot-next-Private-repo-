// POST /api/platform/draft-orders/[id]/send
// Creates a Stripe Checkout Session for the draft order and sends the payment link.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import type { DraftOrder, DraftLineItem } from "@/lib/supabase/platform-types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch draft order
  const { data, error: fetchError } = await supabase
    .from("draft_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !data) {
    return NextResponse.json({ error: "Draft order not found" }, { status: 404 });
  }

  const draft = data as DraftOrder;

  if (draft.converted_order_id) {
    return NextResponse.json(
      { error: "This draft order has already been converted to an order" },
      { status: 400 },
    );
  }

  if (draft.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot send a cancelled draft order" },
      { status: 400 },
    );
  }

  if (draft.status === "paid") {
    return NextResponse.json(
      { error: "This draft order has already been paid" },
      { status: 400 },
    );
  }

  const lineItems = (draft.line_items ?? []) as DraftLineItem[];

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "Cannot send a draft order with no line items" },
      { status: 400 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

  // Build Stripe line items from draft line items (amounts already in øre)
  const stripeLineItems = lineItems.map((item) => ({
    price_data: {
      currency: (draft.currency ?? "DKK").toLowerCase(),
      product_data: {
        name: item.title,
        metadata: {
          item_type: item.type,
          ...(item.id ? { item_id: item.id } : {}),
        },
      },
      unit_amount: item.unit_price,
    },
    quantity: item.quantity,
  }));

  // Add shipping as a line item if applicable
  if (draft.shipping_cost && draft.shipping_cost > 0) {
    stripeLineItems.push({
      price_data: {
        currency: (draft.currency ?? "DKK").toLowerCase(),
        product_data: {
          name: "Fragt",
          metadata: { item_type: "custom" },
        },
        unit_amount: draft.shipping_cost,
      },
      quantity: 1,
    });
  }

  // Expire in 7 days (draft invoices need more time than regular checkout)
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "mobilepay"],
    line_items: stripeLineItems,
    customer_email: draft.customer_email ?? undefined,
    locale: "da",
    currency: (draft.currency ?? "DKK").toLowerCase(),
    expires_at: expiresAt,
    success_url: `${baseUrl}/ordre/faktura-betalt?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/ordre/faktura-annulleret`,
    metadata: {
      draft_order_id: draft.id,
      draft_number: draft.draft_number,
    },
    payment_intent_data: {
      metadata: {
        draft_order_id: draft.id,
        draft_number: draft.draft_number,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
  }

  // Persist session info and mark as 'sent'
  const { error: updateError } = await supabase
    .from("draft_orders")
    .update({
      payment_url: session.url,
      stripe_session_id: session.id,
      status: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[draft-orders/send] Failed to update draft with session info:", updateError.message);
    // Return the URL anyway — the webhook will handle completion
  }

  return NextResponse.json({
    checkout_url: session.url,
    stripe_session_id: session.id,
    draft_number: draft.draft_number,
  });
}
