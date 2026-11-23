import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { hashPin, isValidPin } from "@/lib/auth/pin";
import { attemptPin, isPinLocked, lockMessageFor, type PinRow } from "@/lib/auth/pin-attempts";
import { verifyStaffPassword } from "@/lib/auth/verify-password";
import { parseBody } from "@/lib/pos/route-helpers";
import { createServerClient } from "@/lib/supabase/client";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { isOwner, staffStoreSlug } from "@/lib/auth/store-scope";
import { legalEntityForLocation } from "@/lib/legal-entity-server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";

/**
 * GET /api/admin/me — hvem er jeg, hvilken butik hører jeg til, og hvilket
 * scope gælder lige nu (ejerens valg fra cookien ps_store; alle andre: egen butik).
 * Bruges af butiksvælgeren i topbjælken.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { staff, scope } = ctx;
  const legalEntity = await legalEntityForLocation(staff.location_id);

  // Hash og tæller forlader aldrig serveren; profilsiden får kun to flag.
  const { data: pinRow } = await createServerClient()
    .from("staff_pins")
    .select("failed_attempts, locked_until")
    .eq("staff_id", staff.id)
    .maybeSingle();
  const pin = pinRow as Pick<PinRow, "failed_attempts" | "locked_until"> | null;

  return NextResponse.json(
    {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      isOwner: isOwner(staff),
      ownSlug: staffStoreSlug(staff),
      scope,
      /** Gældende tilladelser (rollestandard + individuelle; ejeren har alle). */
      permissions: PERMISSIONS.filter((p) => hasPermission(staff, p)),
      hasPin: Boolean(pin),
      pinLocked: pin ? isPinLocked(pin, Date.now()) : false,
      /** Legal entity of the staff's own location (Fixon when none, e.g. the owner). */
      legalEntity,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const pinBodySchema = z.object({
  pin: z.string().max(100),
  currentPin: z.string().max(100).optional(),
  password: z.string().max(100).optional(),
});

/**
 * PATCH /api/admin/me { pin, currentPin?, password? }: medarbejderen sætter sin
 * egen pinkode til ekspedientskift i kassen.
 *  - Ingen pinkode endnu: pin alene.
 *  - Pinkode findes og er ikke låst: currentPin kræves; et forkert currentPin
 *    tæller som et forkert forsøg med de samme låseregler som i kassen.
 *  - Pinkoden er låst (alle trin, også den permanente): ny pinkode med
 *    kontoens adgangskode (password) i stedet; forkert adgangskode tæller ikke
 *    på pinkoden. currentPin alene giver 423.
 * En ny pinkode nulstiller tæller og lås.
 */
export async function PATCH(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return unauthorizedResponse();

  const parsed = await parseBody(request, pinBodySchema);
  if (!parsed.ok) return parsed.response;
  const { pin, currentPin, password } = parsed.data;
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "Pinkoden skal være 4 til 6 cifre" }, { status: 400 });
  }

  const supabase = createServerClient();
  try {
    const { data: existing, error: lookupError } = await supabase
      .from("staff_pins")
      .select("failed_attempts, locked_until")
      .eq("staff_id", staff.id)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    const row = existing as Pick<PinRow, "failed_attempts" | "locked_until"> | null;

    if (row && isPinLocked(row, Date.now())) {
      if (!password) return NextResponse.json({ error: lockMessageFor(row.failed_attempts) }, { status: 423 });
      if (!(await verifyStaffPassword(staff.email, password))) {
        return NextResponse.json({ error: "Forkert adgangskode" }, { status: 401 });
      }
    } else if (row) {
      if (!currentPin) return NextResponse.json({ error: "Skriv din nuværende pinkode" }, { status: 400 });
      const result = await attemptPin(supabase, staff.id, currentPin, { location: staff.location_id });
      if (result.kind === "locked") return NextResponse.json({ error: result.message }, { status: 423 });
      if (result.kind === "wrong") {
        return NextResponse.json({ error: "Forkert nuværende pinkode" }, { status: 401 });
      }
      // "ok", eller "no_pin" (rækken forsvandt imellem): den nye må sættes.
    }

    const { error } = await supabase.from("staff_pins").upsert(
      {
        staff_id: staff.id,
        pin_hash: hashPin(pin),
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "staff_id" },
    );
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[admin/me] pin change failed", err);
    return NextResponse.json({ error: "Pinkoden kunne ikke gemmes" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
