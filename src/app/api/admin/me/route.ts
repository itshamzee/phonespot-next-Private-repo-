import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { hashPin, isValidPin } from "@/lib/auth/pin";
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

const pinBodySchema = z.object({ pin: z.string() });

/**
 * PATCH /api/admin/me { pin }: medarbejderen sætter sin egen pinkode til
 * ekspedientskift i kassen. Nulstiller en eventuel lås.
 */
export async function PATCH(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return unauthorizedResponse();

  const parsed = await parseBody(request, pinBodySchema);
  if (!parsed.ok) return parsed.response;
  if (!isValidPin(parsed.data.pin)) {
    return NextResponse.json({ error: "Pinkoden skal være 4 til 6 cifre" }, { status: 400 });
  }

  const { error } = await createServerClient()
    .from("staff_pins")
    .upsert(
      {
        staff_id: staff.id,
        pin_hash: hashPin(parsed.data.pin),
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "staff_id" },
    );
  if (error) {
    console.error("[admin/me] pin upsert failed", error.message);
    return NextResponse.json({ error: "Pinkoden kunne ikke gemmes" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
