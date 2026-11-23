import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Ekspedient-cookien: hvem der betjener kassen lige nu, og under hvilket login.
 * Værdien er `<staffId>.<loggedInId>.<udstedt ms>.<HMAC-SHA256 base64url>`
 * signeret med OPERATOR_COOKIE_SECRET. Den siger kun hvem; requirePosStaff slår
 * altid medarbejderen op igen og ignorerer cookien under et andet login.
 */
export const OPERATOR_COOKIE = "ps_operator";
export const OPERATOR_TTL_MS = 12 * 60 * 60 * 1000;

/** Tilladt urforskydning for en cookie, der ser ud til at være udstedt i fremtiden. */
const CLOCK_SKEW_MS = 60_000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signOperator(staffId: string, loggedInId: string, nowMs: number, secret: string): string {
  const payload = `${staffId}.${loggedInId}.${nowMs}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** null ved forkert signatur, udløbet cookie eller fejlformat. */
export function readOperator(
  value: string | undefined,
  nowMs: number,
  secret: string,
): { staffId: string; loggedInId: string } | null {
  if (!value || !secret) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [staffId, loggedInId, issuedRaw, sig] = parts;
  if (!staffId || !loggedInId || !/^\d+$/.test(issuedRaw)) return null;

  const expected = Buffer.from(sign(`${staffId}.${loggedInId}.${issuedRaw}`, secret));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const issued = Number(issuedRaw);
  if (issued > nowMs + CLOCK_SKEW_MS) return null;
  if (nowMs - issued > OPERATOR_TTL_MS) return null;
  return { staffId, loggedInId };
}

/** Hemmeligheden, eller null hvis pinkode-skift ikke er sat op. */
export function operatorSecret(): string | null {
  return process.env.OPERATOR_COOKIE_SECRET || null;
}
