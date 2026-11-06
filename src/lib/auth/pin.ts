import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Pinkoder til ekspedientskift i kassen. Hashen ligger i public.staff_pins
 * (kun service role) i formatet `scrypt$<salt b64>$<hash b64>`.
 */
const SALT_BYTES = 16;
const KEYLEN = 32;

/** 4 til 6 cifre, intet andet. */
export function isValidPin(pin: string): boolean {
  return typeof pin === "string" && /^\d{4,6}$/.test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(pin, salt, KEYLEN);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** Sammenligner i konstant tid. Manglende eller fejlformateret hash giver false. */
export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64");
  const expected = Buffer.from(parts[2], "base64");
  if (salt.length !== SALT_BYTES || expected.length !== KEYLEN) return false;
  const actual = scryptSync(pin, salt, KEYLEN);
  return timingSafeEqual(actual, expected);
}
