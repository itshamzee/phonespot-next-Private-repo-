import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { toPosError } from "./errors";
import { lookupStaffById, requireStaff, type StaffIdentity } from "@/lib/auth/require-staff";
import { INTERN_ROLE } from "@/lib/auth/intern-access";
import { OPERATOR_COOKIE, operatorSecret, readOperator } from "@/lib/auth/operator";

export type PosStaff = {
  /** Den, der er logget ind på kassen (Supabase-sessionen). */
  loggedIn: StaffIdentity;
  /** Ekspedienten, der betjener lige nu: staffId på salg/retur og grundlag for tilladelser. */
  actor: StaffIdentity;
};

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

/**
 * Logged-in staff plus the acting operator. actor is the operator from the
 * ps_operator cookie when it is validly signed, unexpired, was issued under
 * this same login, and the staff member is still active (and not an intern);
 * otherwise actor is loggedIn. Without OPERATOR_COOKIE_SECRET the cookie is
 * ignored. Returns null when nobody is logged in.
 *
 * Fails closed: if the operator lookup itself errors, this throws (the route's
 * posErrorResponse answers 500) rather than silently recording the sale on the
 * logged-in user.
 */
export async function requirePosStaff(request: Request): Promise<PosStaff | null> {
  const loggedIn = await requireStaff(request);
  if (!loggedIn) return null;

  const secret = operatorSecret();
  const op = secret ? readOperator(cookieValue(request, OPERATOR_COOKIE), Date.now(), secret) : null;
  if (!op || op.loggedInId !== loggedIn.id || op.staffId === loggedIn.id) return { loggedIn, actor: loggedIn };

  let actor: StaffIdentity | null;
  try {
    actor = await lookupStaffById(op.staffId);
  } catch (err) {
    console.error("[pos] operator lookup failed", err);
    throw err;
  }
  if (!actor || actor.role === INTERN_ROLE) return { loggedIn, actor: loggedIn };
  return { loggedIn, actor };
}

/** Maps any thrown error to a JSON response; business errors keep their Danish message and status. */
export function posErrorResponse(err: unknown, fallback: string): NextResponse {
  const pos = toPosError(err);
  if (pos) return NextResponse.json({ error: pos.message, code: pos.code }, { status: pos.status });
  console.error("[pos]", fallback, err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      response: NextResponse.json(
        { error: issue?.message || "Ugyldig forespørgsel", path: issue?.path.join(".") },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export const UNAUTHORIZED = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const FORBIDDEN = (msg = "Forbidden") => NextResponse.json({ error: msg }, { status: 403 });
