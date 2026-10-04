import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed link to a POS receipt for the SMS "send kvittering" button. The link
 * is public (the customer opens it on their phone) but unguessable: it carries
 * an HMAC of the order id. Secret: POS_RECEIPT_SECRET, falling back to the
 * service-role key (server only) so the feature works before the variable is set.
 */
function secret(): string {
  const s = process.env.POS_RECEIPT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("POS_RECEIPT_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not set");
  return s;
}

export function signReceiptToken(orderId: string): string {
  return createHmac("sha256", secret()).update(`pos-receipt:${orderId}`).digest("hex").slice(0, 32);
}

export function verifyReceiptToken(orderId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(signReceiptToken(orderId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function receiptUrl(orderId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";
  return `${base}/api/kvittering/${orderId}?t=${signReceiptToken(orderId)}`;
}
