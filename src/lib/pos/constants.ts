/**
 * Client-safe POS constants (no server imports). Shared by the POS UI, the API
 * routes and the pure calculation helpers.
 */

export const PAYMENT_TYPES = [
  "kontant",
  "kort_terminal",
  "mobilepay",
  "klarna",
  "faktura",
  "tilgodebevis",
  "gavekort",
] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_LABELS: Record<PaymentType, string> = {
  kontant: "Kontant",
  kort_terminal: "Kort (terminal)",
  mobilepay: "MobilePay",
  klarna: "Klarna",
  faktura: "Faktura",
  tilgodebevis: "Tilgodebevis",
  gavekort: "Gavekort",
};

/** Refund methods allowed on a credit note (money going back to the customer). */
export const REFUND_TYPES = ["kontant", "kort_terminal", "mobilepay", "tilgodebevis"] as const;
export type RefundType = (typeof REFUND_TYPES)[number];

/** Payment types that require a reference (voucher / gift card code). */
export const REFERENCE_REQUIRED_TYPES: readonly PaymentType[] = ["tilgodebevis", "gavekort"];

export const DISCOUNT_REASONS = ["Fejl", "Kundeservice", "Tilbud", "Andet"] as const;
export type DiscountReason = (typeof DISCOUNT_REASONS)[number];

export const RETURN_REASONS = ["Fortrudt", "Defekt", "Forkert vare", "Andet"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export const STANDARD_VAT_NUMERATOR = 25;
export const STANDARD_VAT_DENOMINATOR = 125;

export const POS_TIME_ZONE = "Europe/Copenhagen";

/**
 * In-store card payments are taken on a stand-alone Worldline terminal and
 * recorded manually as "kort_terminal". The old Stripe Terminal code path is
 * kept but off unless NEXT_PUBLIC_POS_STRIPE_TERMINAL=true.
 */
export const STRIPE_TERMINAL_ENABLED = process.env.NEXT_PUBLIC_POS_STRIPE_TERMINAL === "true";

export function isPaymentType(v: unknown): v is PaymentType {
  return typeof v === "string" && (PAYMENT_TYPES as readonly string[]).includes(v);
}
export function isRefundType(v: unknown): v is RefundType {
  return typeof v === "string" && (REFUND_TYPES as readonly string[]).includes(v);
}
export function isDiscountReason(v: unknown): v is DiscountReason {
  return typeof v === "string" && (DISCOUNT_REASONS as readonly string[]).includes(v);
}
