import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/client";
import { stripe } from "@/lib/stripe/client";
import { convertDraftToOrder } from "@/lib/draft-orders/convert";
import { handleRepairPayment } from "@/lib/stripe/repair-payment";
import { finalizeCheckoutOrder, type CheckoutOrderItem } from "@/lib/checkout/finalize-order";

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.metadata?.type === "repair") {
    await handleRepairPayment(session);
    return;
  }

  // Draft order payment: if the session was created for a draft order,
  // convert it to a confirmed order and return early.
  const draftOrderId = session.metadata?.draft_order_id;
  if (draftOrderId) {
    console.log("[webhook] draft order payment received, converting:", draftOrderId);
    await convertDraftToOrder(draftOrderId);
    console.log("[webhook] draft order converted:", draftOrderId);
    return;
  }

  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error("[webhook] checkout.session.completed missing order_id in metadata");
    return;
  }

  await finalizeCheckoutOrder({
    orderId,
    sessionId: session.id,
    paymentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    resolveBatteryItemIds: (orderItems) => resolveStripeBatteryItemIds(session.id, orderItems),
  });
}

/** Batteritilvalg ligger som produktmetadata på Stripe-sessionens linjer. */
async function resolveStripeBatteryItemIds(sessionId: string, orderItems: CheckoutOrderItem[]): Promise<Set<string>> {
  const batteryItemIds = new Set<string>();
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { expand: ["data.price.product"] });
  for (const li of lineItems.data) {
    const product = li.price?.product;
    if (!product || typeof product === "string" || product.deleted) continue;
    const meta = (product as Stripe.Product).metadata;
    if (meta?.kind !== "battery-upgrade" || !meta.parent_item_key) continue;
    const [kind, id] = meta.parent_item_key.split(":");
    for (const item of orderItems) {
      if ((kind === "device" && item.device_id === id) || (kind === "sku" && item.sku_product_id === id)) batteryItemIds.add(item.id);
    }
  }
  return batteryItemIds;
}

export async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const supabase = createServerClient();
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const { error } = await supabase.rpc("expire_checkout_order", { p_order_id: orderId, p_session_id: session.id });
  if (error) throw new Error("Checkout expiry transaction failed");
}
