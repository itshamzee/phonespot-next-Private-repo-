import crypto from "node:crypto";

export type PartnerAuthResult = { ok: true } | { ok: false; status: 401 | 503 };

/**
 * Authenticates a partner-feed request against `PARTNER_FEED_TOKEN`.
 *
 * This feed exposes stock levels, VAT scheme and cost-adjacent data, so it
 * must never fall open: no token configured is refused with 503 ("feed not
 * configured"), never treated as "no auth required". A configured token is
 * checked against either `Authorization: Bearer <token>` or
 * `X-Api-Key: <token>` using a timing-safe, length-guarded comparison so a
 * wrong-length guess can't be told apart from a wrong-but-same-length one by
 * response timing.
 */
export function checkPartnerAuth(headers: Headers): PartnerAuthResult {
  const configured = process.env.PARTNER_FEED_TOKEN;
  if (!configured) return { ok: false, status: 503 };

  const provided = extractToken(headers);
  if (!provided || !timingSafeStringEqual(provided, configured)) {
    return { ok: false, status: 401 };
  }

  return { ok: true };
}

function extractToken(headers: Headers): string | null {
  const apiKey = headers.get("x-api-key");
  if (apiKey) return apiKey;

  // RFC 7235 §2.1: the auth-scheme token ("Bearer") is case-insensitive, so
  // a partner sending "bearer <token>" or "BEARER <token>" must still
  // authenticate. Only the scheme prefix is case-folded here — the token
  // itself is extracted verbatim and compared exactly (case-sensitive,
  // timing-safe) below.
  const authHeader = headers.get("authorization");
  if (authHeader && authHeader.slice(0, 7).toLowerCase() === "bearer ") {
    return authHeader.slice(7).trim();
  }

  return null;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // crypto.timingSafeEqual throws on mismatched buffer lengths, so this
  // guard is load-bearing (not just an optimisation) — but it does mean a
  // length mismatch short-circuits before the constant-time compare runs.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
