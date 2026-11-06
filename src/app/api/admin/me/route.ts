import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { hashPin, isValidPin } from "@/lib/auth/pin";
import { attemptPin } from "@/lib/auth/pin-attempts";
import { parseBody } from "@/lib/pos/route-helpers";
import { createServerClient } from "@/lib/supabase/client";
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

  return NextResponse.json(
    {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      isOwner: isOwner(staff),
      ownSlug: staffStoreSlug(staff),
      scope,
      /** Legal entity of the staff's own location (Fixon when none, e.g. the owner). */
      legalEntity,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const pinBodySchema = z.object({ pin: z.string(), currentPin: z.string().optional() });

/**
 * PATCH /api/admin/me { pin, currentPin? }: medarbejderen sætter sin egen
 * pinkode til ekspedientskift i kassen. Har medarbejderen allerede en pinkode,
 * kræves currentPin; et forkert currentPin tæller som et forkert forsøg med de
 * samme låseregler som i kassen. En ny pinkode nulstiller tæller og lås.
 */
export async function PATCH(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return unauthorizedResponse();

  const parsed = await parseBody(request, pinBodySchema);
  if (!parsed.ok) return parsed.response;
  const { pin, currentPin } = parsed.data;
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "Pinkoden skal være 4 til 6 cifre" }, { status: 400 });
  }

  const supabase = createServerClient();
  try {
    if (currentPin === undefined || currentPin === "") {
      const { data: existing, error } = await supabase
        .from("staff_pins")
        .select("staff_id")
        .eq("staff_id", staff.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (existing) {
        return NextResponse.json({ error: "Skriv din nuværende pinkode" }, { status: 400 });
      }
    } else {
      const result = await attemptPin(supabase, staff.id, currentPin, { location: staff.location_id });
      if (result.kind === "locked") return NextResponse.json({ error: result.message }, { status: 423 });
      if (result.kind === "wrong") {
        return NextResponse.json({ error: "Forkert nuværende pinkode" }, { status: 401 });
      }
      // "ok", eller "no_pin" (ingen pinkode endnu): den nye må sættes.
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
