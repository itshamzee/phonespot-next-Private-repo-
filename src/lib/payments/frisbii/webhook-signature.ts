import { createHmac, timingSafeEqual } from "crypto";

/**
 * Frisbii signerer kun `timestamp + id` (ikke hele body):
 *   signature = hex(hmac_sha256(webhook_secret, timestamp + id))
 * https://docs.frisbii.com/reference/intro_webhooks
 *
 * Efter en regenerering af secret kan gamle webhooks i op til tre dage
 * stadig være signeret med den gamle — derfor accepteres
 * FRISBII_WEBHOOK_SECRET_PREVIOUS også, hvis den er sat.
 */
export function computeFrisbiiSignature(secret: string, timestamp: string, id: string): string {
  return createHmac("sha256", secret).update(`${timestamp}${id}`).digest("hex");
}

export function verifyFrisbiiSignature(
  payload: { timestamp?: unknown; id?: unknown; signature?: unknown },
  secrets: Array<string | undefined | null>,
): boolean {
  const { timestamp, id, signature } = payload;
  if (typeof timestamp !== "string" || typeof id !== "string" || typeof signature !== "string") {
    return false;
  }
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const given = Buffer.from(signature.toLowerCase(), "hex");

  return secrets
    .filter((s): s is string => !!s && s.trim().length > 0)
    .some((secret) => {
      const expected = Buffer.from(computeFrisbiiSignature(secret.trim(), timestamp, id), "hex");
      return expected.length === given.length && timingSafeEqual(expected, given);
    });
}
