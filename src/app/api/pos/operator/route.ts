import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { INTERN_ROLE } from "@/lib/auth/intern-access";
import { OPERATOR_COOKIE, OPERATOR_TTL_MS, operatorSecret, signOperator } from "@/lib/auth/operator";
import { verifyPin } from "@/lib/auth/pin";
import { UNAUTHORIZED, parseBody, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";
import { uuidSchema } from "@/lib/pos/schemas";
import { createServerClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
/** Antal forsøg på en betinget opdatering, hvis en anden forespørgsel nåede først. */
const CAS_RETRIES = 5;

const WRONG_PIN = () => NextResponse.json({ error: "Forkert pinkode" }, { status: 401 });
const LOCKED = () => NextResponse.json({ error: "Pinkoden er låst i 15 minutter" }, { status: 423 });

const bodySchema = z.object({ staffId: z.string().min(1).max(100), pin: z.string().max(100) });

type PinRow = { pin_hash: string; failed_attempts: number; locked_until: string | null };

/**
 * GET /api/pos/operator?location_id=<id>
 * Hvem betjener kassen nu, og hvem kan skifte ind: aktive medarbejdere i
 * butikken plus alle ejere. Pinkode-hashen forlader aldrig serveren.
 */
export async function GET(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();

    const locationId = new URL(request.url).searchParams.get("location_id");
    if (!locationId || !uuidSchema.safeParse(locationId).success) {
      return NextResponse.json({ error: "location_id påkrævet" }, { status: 400 });
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
 * POST /api/pos/operator { staffId, pin }
 * Skifter ekspedient. 5. forkerte forsøg låser pinkoden i 15 minutter.
 * Ukendt, inaktiv eller pinkodeløs medarbejder svarer som en forkert kode.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = operatorSecret();
    if (!secret) return NextResponse.json({ error: "Pinkode-skift er ikke sat op" }, { status: 500 });

    const loggedIn = await requireStaff(request);
    if (!loggedIn) return UNAUTHORIZED();

    const parsed = await parseBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    const { staffId, pin } = parsed.data;
    if (!uuidSchema.safeParse(staffId).success) return WRONG_PIN();

    const supabase = createServerClient();
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, name, role")
      .eq("id", staffId)
      .eq("is_active", true)
      .maybeSingle();
    if (staffError) throw new Error(staffError.message);
    if (!staff || (staff as { role: string }).role === INTERN_ROLE) return WRONG_PIN();
    const current = { id: (staff as { id: string }).id, name: (staff as { name: string | null }).name };

    // Tælleren opdateres med compare-and-set på failed_attempts: opdateringen
    // gælder kun, hvis tælleren stadig har den værdi, vi læste. Ellers læses
    // rækken igen. Så kan to samtidige forkerte forsøg ikke tælle som ét.
    for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
      const { data: row, error } = await supabase
        .from("staff_pins")
        .select("pin_hash, failed_attempts, locked_until")
        .eq("staff_id", staffId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) return WRONG_PIN();
      const pinRow = row as PinRow;

      const now = Date.now();
      const lockedUntil = pinRow.locked_until ? Date.parse(pinRow.locked_until) : null;
      if (lockedUntil !== null && lockedUntil > now) return LOCKED();
      // En udløbet lås giver fem nye forsøg.
      const counted = lockedUntil !== null ? 0 : pinRow.failed_attempts;

      const ok = verifyPin(pin, pinRow.pin_hash);
      const next = ok ? 0 : counted + 1;
      const locks = !ok && next >= MAX_ATTEMPTS;
      const patch = {
        failed_attempts: next,
        locked_until: locks ? new Date(now + LOCK_MS).toISOString() : null,
        updated_at: new Date(now).toISOString(),
      };
      const { data: updated, error: updateError } = await supabase
        .from("staff_pins")
        .update(patch)
        .eq("staff_id", staffId)
        .eq("failed_attempts", pinRow.failed_attempts)
        .select("staff_id");
      if (updateError) throw new Error(updateError.message);
      if (!updated || updated.length === 0) continue;

      if (!ok) return locks ? LOCKED() : WRONG_PIN();

      const res = NextResponse.json({ current });
      res.cookies.set(OPERATOR_COOKIE, signOperator(current.id, now, secret), {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: OPERATOR_TTL_MS / 1000,
      });
      return res;
    }
    // Vedvarende kamp om rækken: afvis frem for at lukke ind.
    return WRONG_PIN();
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
