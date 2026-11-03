import { isFrisbiiConfigured } from "./frisbii/client";

/**
 * Hvilken betalingsudbyder nye webshop-betalinger går igennem.
 *
 * Skiftet sker alene med miljøvariablen PAYMENT_PROVIDER:
 *   PAYMENT_PROVIDER=stripe   (standard)
 *   PAYMENT_PROVIDER=frisbii  (kræver FRISBII_PRIVATE_KEY)
 *
 * Ordrer, der allerede er oprettet, bliver hos den udbyder, de blev betalt
 * med — refundering og hævning slås op via orders.payment_method, ikke her.
 * Stripe skal derfor blive ved med at være konfigureret, så længe der findes
 * Stripe-ordrer, der kan blive returneret.
 */
export type PaymentProvider = "stripe" | "frisbii";

export function getCheckoutProvider(): PaymentProvider {
  const wanted = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (wanted === "frisbii") {
    if (isFrisbiiConfigured()) return "frisbii";
    console.error("[payments] PAYMENT_PROVIDER=frisbii men FRISBII_PRIVATE_KEY mangler — bruger Stripe");
  }
  return "stripe";
}

/** Udbyderen for en eksisterende ordre (orders.payment_method). */
export function providerForOrder(paymentMethod: string | null | undefined): PaymentProvider {
  return paymentMethod === "frisbii" ? "frisbii" : "stripe";
}

/**
 * "instant": hæv med det samme (som Stripe gør i dag).
 * "on_ship" (standard): reservér ved køb, hæv når ordren sendes/afhentes —
 * det er hovedreglen for fysiske varer i Danmark og det, indløsere forventer.
 */
export function frisbiiSettleMode(): "instant" | "on_ship" {
  return process.env.FRISBII_SETTLE_MODE?.trim().toLowerCase() === "instant" ? "instant" : "on_ship";
}

/** Valgfri liste af betalingsmetoder; tom = brug kontoens standardopsætning i Frisbii. */
export function frisbiiPaymentMethods(): string[] | undefined {
  const raw = process.env.FRISBII_PAYMENT_METHODS?.trim();
  if (!raw) return undefined;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : undefined;
}
