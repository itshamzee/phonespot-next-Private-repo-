import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { INTERN_ROLE } from "@/lib/auth/intern-access";
import { OPERATOR_COOKIE, OPERATOR_TTL_MS, operatorSecret, signOperator } from "@/lib/auth/operator";
import { attemptPin } from "@/lib/auth/pin-attempts";
import { canAccessStore, isOwner, type ScopedStaff } from "@/lib/auth/store-scope";
import { resolveLocationSlug } from "@/lib/auth/store-scope-server";
import { FORBIDDEN, UNAUTHORIZED, parseBody, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";
import { uuidSchema } from "@/lib/pos/schemas";
import { createServerClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const WRONG_PIN = () => NextResponse.json({ error: "Forkert pinkode" }, { status: 401 });
const LOCKED = (message: string) => NextResponse.json({ error: message }, { status: 423 });

const bodySchema = z.object({
  staffId: z.string().min(1).max(100),
  pin: z.string().max(100),
  locationId: uuidSchema,
});

/** Må den indloggede bruge kassen i denne location? Ejeren: altid. Ukendt location: kun ejeren. */
async function mayUseLocation(loggedIn: ScopedStaff, locationId: string): Promise<boolean> {
  if (isOwner(loggedIn)) return true;
  const slug = await resolveLocationSlug(locationId);
  return slug !== null && canAccessStore(loggedIn, slug);
}

/**
 * GET /api/pos/operator?location_id=<id>
 * Hvem betjener kassen nu, og hvem kan skifte ind: aktive medarbejdere i
 * butikken plus alle ejere. Pinkode-hashen forlader aldrig serveren.
 * 403 hvis den indloggede ikke har adgang til butikken.
 */
export async function GET(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();

    const locationId = new URL(request.url).searchParams.get("location_id");
    if (!locationId || !uuidSchema.safeParse(locationId).success) {
      return NextResponse.json({ error: "location_id påkrævet" }, { status: 400 });
    }
    if (!(await mayUseLocation(pos.loggedIn, locationId))) {
      return FORBIDDEN("Du har ikke adgang til denne butik.");
    }

    const supabase = createServerClient();
    const [atLocation, owners] = await Promise.all([
      supabase.from("staff").select("id, name, role").eq("is_active", true).eq("location_id", locationId),
      supabase.from("staff").select("id, name, role").eq("is_active", true).eq("role", "owner"),
    ]);
    if (atLocation.error) throw new Error(atLocation.error.message);
    if (owners.error) throw new Error(owners.error.message);

    const byId = new Map<string, { id: string; name: string | null }>();
    for (const s of [...(atLocation.data ?? []), ...(owners.data ?? [])] as Array<{
      id: string;
      name: string | null;
      role: string;
    }>) {
      if (s.role !== INTERN_ROLE) byId.set(s.id, { id: s.id, name: s.name });
    }
    const ids = [...byId.keys()];

    const withPin = new Set<string>();
    if (ids.length > 0) {
      const pins = await supabase.from("staff_pins").select("staff_id").in("staff_id", ids);
      if (pins.error) throw new Error(pins.error.message);
      for (const p of (pins.data ?? []) as Array<{ staff_id: string }>) withPin.add(p.staff_id);
    }

    const staff = [...byId.values()]
      .map((s) => ({ id: s.id, name: s.name ?? "", hasPin: withPin.has(s.id) }))
      .sort((a, b) => a.name.localeCompare(b.name, "da"));

    return NextResponse.json(
      { current: { id: pos.actor.id, name: pos.actor.name }, staff },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return posErrorResponse(err, "Fejl ved hentning af ekspedienter");
  }
}

/**
 * POST /api/pos/operator { staffId, pin, locationId }
 * Skifter ekspedient. Låsning efter 5, 10 og 15 forkerte forsøg (pin-attempts.ts).
 * Ukendt, inaktiv, pinkodeløs medarbejder, en medarbejder fra en anden butik,
 * eller en butik den indloggede ikke har adgang til: samme 401 som en forkert
 * kode. Kun forsøg inden for scope, hvor koden faktisk prøves, tælles.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = operatorSecret();
    if (!secret) return NextResponse.json({ error: "Pinkode-skift er ikke sat op" }, { status: 500 });

    const loggedIn = await requireStaff(request);
    if (!loggedIn) return UNAUTHORIZED();

    const parsed = await parseBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    const { staffId, pin, locationId } = parsed.data;
    if (!uuidSchema.safeParse(staffId).success) return WRONG_PIN();

    const supabase = createServerClient();
    const { data, error: staffError } = await supabase
      .from("staff")
      .select("id, name, role, location_id")
      .eq("id", staffId)
      .eq("is_active", true)
      .maybeSingle();
    if (staffError) throw new Error(staffError.message);
    const target = data as { id: string; name: string | null; role: string; location_id: string | null } | null;
    if (!target || target.role === INTERN_ROLE) return WRONG_PIN();

    const inScope =
      (await mayUseLocation(loggedIn, locationId)) &&
      (target.role === "owner" || target.location_id === locationId);
    // Uden for scope afvises uden at røre tælleren: ellers kunne enhver
    // medarbejder låse andres (også ejerens) pinkode med forsøg fra en anden butik.
    if (!inScope) return WRONG_PIN();

    const result = await attemptPin(supabase, staffId, pin, { location: locationId });
    if (result.kind === "locked") return LOCKED(result.message);
    if (result.kind !== "ok") return WRONG_PIN();

    const current = { id: target.id, name: target.name };
    const res = NextResponse.json({ current });
    res.cookies.set(OPERATOR_COOKIE, signOperator(current.id, loggedIn.id, Date.now(), secret), {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: OPERATOR_TTL_MS / 1000,
    });
    return res;
  } catch (err) {
    return posErrorResponse(err, "Fejl ved skift af ekspedient");
  }
}

/** DELETE /api/pos/operator: tilbage til den indloggede bruger. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPERATOR_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
