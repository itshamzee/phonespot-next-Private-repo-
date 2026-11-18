import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_COOKIE, encodeRecoveryCookie } from "@/lib/repair/recovery-cookie";

/**
 * GET /api/repairs/recovery/start?ticket_id=…&token=…
 *
 * Stripes cancel_url. Nøglen må ikke stå i adressen på en side med Google Analytics,
 * så den flyttes her til en HttpOnly-cookie, og kunden sendes videre til en ren adresse.
 */
export async function GET(request: NextRequest) {
  const ticketId = request.nextUrl.searchParams.get("ticket_id") ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const target = new URL("/reparation/betaling-afbrudt", request.nextUrl.origin);
  if (ticketId) target.searchParams.set("ticket_id", ticketId);

  const res = NextResponse.redirect(target, 303);
  res.headers.set("Referrer-Policy", "no-referrer");
  if (ticketId && token) {
    res.cookies.set(RECOVERY_COOKIE, encodeRecoveryCookie(ticketId, token), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return res;
}
