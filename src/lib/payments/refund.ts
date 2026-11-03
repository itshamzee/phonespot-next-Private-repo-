import { stripe } from "@/lib/stripe/client";
import { frisbii } from "./frisbii/client";
import { providerForOrder } from "./provider";

export interface RefundableOrder {
  id: string;
  total: number;
  payment_method: string | null;
  stripe_payment_id: string | null;
}

export interface ProviderRefund {
  provider: "stripe" | "frisbii";
  /** Stripe re_… / Frisbii refund-id, eller "cancelled:<handle>" når en reservation blev annulleret. */
  refundId: string;
  /** Asynkron refundering (f.eks. MobilePay): resultatet kommer senere. */
  pending: boolean;
  /** Det beløb, der faktisk blev refunderet/annulleret (øre). */
  amount: number;
}

export class RefundError extends Error {
  constructor(message: string, readonly userMessage: string) {
    super(message);
    this.name = "RefundError";
  }
}

/**
 * Refunderer hos den udbyder, ordren blev betalt med. `key` gør kaldet
 * idempotent hos Frisbii, så et genforsøg ikke refunderer to gange.
 */
export async function refundOrderPayment(
  order: RefundableOrder,
  /** Øre. Udeladt = hele det refunderbare beløb. */
  amount: number | undefined,
  opts: { key?: string; reason?: string } = {},
): Promise<ProviderRefund | null> {
  if (!order.stripe_payment_id) return null;

  if (providerForOrder(order.payment_method) === "stripe") {
    const refund = await stripe.refunds.create(
      { payment_intent: order.stripe_payment_id, ...(amount ? { amount } : {}), reason: "requested_by_customer" },
      opts.key ? { idempotencyKey: opts.key } : undefined,
    );
    return { provider: "stripe", refundId: refund.id, pending: refund.status === "pending", amount: refund.amount };
  }

  const handle = order.stripe_payment_id;
  const charge = await frisbii.getCharge(handle);
  if (!charge) throw new RefundError(`Frisbii charge ${handle} not found`, "Betalingen findes ikke hos Frisbii.");

  // Reserveret, men ikke hævet: en fuld refundering er en annullering af
  // reservationen. En delvis kan ikke laves endnu — hæv først, eller annullér.
  if (charge.state === "authorized") {
    const reserved = charge.authorized_amount ?? charge.amount;
    if (amount !== undefined && amount !== reserved) {
      throw new RefundError(
        `Partial refund on unsettled Frisbii charge ${handle}`,
        "Betalingen er kun reserveret og ikke hævet endnu. Annullér hele beløbet, eller send ordren (så hæves den) før en delvis refundering.",
      );
    }
    await frisbii.cancelCharge(handle);
    return { provider: "frisbii", refundId: `cancelled:${handle}`, pending: false, amount: reserved };
  }

  if (charge.state !== "settled") {
    throw new RefundError(`Frisbii charge ${handle} is ${charge.state}`, `Betalingen har status '${charge.state}' hos Frisbii og kan ikke refunderes.`);
  }

  const refund = await frisbii.createRefund({
    invoice: handle,
    ...(amount ? { amount } : {}),
    key: opts.key,
    text: opts.reason?.slice(0, 200),
  });
  if (refund.state === "failed") {
    throw new RefundError(
      `Frisbii refund failed: ${refund.error ?? refund.error_state}`,
      "Frisbii afviste refunderingen. Kontrollér betalingen i Frisbii.",
    );
  }
  return { provider: "frisbii", refundId: refund.id, pending: refund.state === "processing", amount: refund.amount };
}
