import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
const cookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-phonespot-cart"
    : "phonespot-cart-dev";
const valid = (value?: string): value is string =>
  !!value && /^[a-f0-9]{64}$/.test(value);
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function readReservationOwner(): Promise<string | null> {
  const value = (await cookies()).get(cookieName())?.value;
  return valid(value) ? hash(value) : null;
}
export async function getOrCreateReservationOwner(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(cookieName())?.value;
  if (valid(existing)) return hash(existing);
  const value = randomBytes(32).toString("hex");
  jar.set(cookieName(), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return hash(value);
}
export function isDeviceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  );
}
