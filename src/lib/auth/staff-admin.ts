/**
 * Regler for ejerens medarbejderadministration (oprettelse, rolle, aktiv, adgangskode).
 * Rene funktioner, så de kan testes uden database.
 */

export const STAFF_ROLES = ["employee", "manager"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const MIN_PASSWORD_LENGTH = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL.test(email) && email.length <= 200 ? email : null;
}

/** Fejltekst til en adgangskode, eller null når den er god nok. */
export function passwordProblem(value: unknown): string | null {
  if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
    return `Adgangskoden skal være mindst ${MIN_PASSWORD_LENGTH} tegn.`;
  }
  if (value.length > 72) return "Adgangskoden må højst være 72 tegn.";
  return null;
}

export type NewStaffInput = {
  name: string;
  email: string;
  role: StaffRole;
  location_slug: string;
  password: string;
};

export function validateNewStaff(body: unknown): { ok: true; value: NewStaffInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (name.length < 2 || name.length > 100) return { ok: false, error: "Skriv medarbejderens navn." };
  const email = normalizeEmail(b.email);
  if (!email) return { ok: false, error: "Skriv en gyldig e-mail." };
  if (!isStaffRole(b.role)) return { ok: false, error: "Vælg rolle." };
  if (typeof b.location_slug !== "string" || !b.location_slug) return { ok: false, error: "Vælg butik." };
  const pw = passwordProblem(b.password);
  if (pw) return { ok: false, error: pw };
  return { ok: true, value: { name, email, role: b.role, location_slug: b.location_slug, password: b.password as string } };
}

/** Kode der er let at læse højt og skrive af: ingen 0/O, 1/l/I. */
export function generatePassword(length = 12, random: (n: number) => number = cryptoRandom): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[random(alphabet.length)];
  return out;
}

function cryptoRandom(n: number): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] % n;
}
