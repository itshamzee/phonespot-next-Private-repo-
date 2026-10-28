import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Delivery reports from GatewayAPI. Until 2026-10-28 sms_log only knew that
 * GatewayAPI had accepted a message, not whether it reached the phone, so a
 * message that was accepted but never delivered looked exactly like a success.
 *
 * Every message is sent with a callback_url to /api/webhooks/gatewayapi. The URL
 * carries a key derived from GATEWAYAPI_TOKEN, so no extra secret has to be set.
 */

/** Danish number in any common spelling → MSISDN with country code ("45xxxxxxxx"). */
export function normalizeMsisdn(phone: string): string {
  const digits = phone.replace(/[\s-]/g, "").replace(/^\+/, "").replace(/^00/, "");
  return digits.length === 8 ? `45${digits}` : digits;
}

function token(): string {
  const t = (process.env.GATEWAYAPI_TOKEN ?? "").trim();
  if (!t) throw new Error("GATEWAYAPI_TOKEN is not set");
  return t;
}

export function signDeliveryKey(): string {
  return createHmac("sha256", token()).update("sms-delivery-report").digest("hex").slice(0, 32);
}

export function verifyDeliveryKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const expected = Buffer.from(signDeliveryKey());
  const given = Buffer.from(key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function deliveryCallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";
  return `${base}/api/webhooks/gatewayapi?k=${signDeliveryKey()}`;
}
