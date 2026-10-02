import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff, type StaffIdentity } from "@/lib/auth/require-staff";
import { canAccessStore } from "@/lib/auth/store-scope";

/**
 * Adgangskontrol til én reparationssag. Bruges af alle personale-ruter under
 * /api/repairs/[id]/** og /api/sms/send, så butiksafgrænsningen håndhæves på
 * serveren — ikke kun ved at skjule ting i UI'et.
 *
 *  - ikke personale: 401
 *  - sagen findes ikke ELLER ligger i en anden butik: 404 (samme svar, så man
 *    ikke kan sondere efter sagsnumre på tværs af butikker)
 *  - ejeren (role 'owner') må alt
 */
export type TicketAccess =
  | { ok: true; staff: StaffIdentity; ticketStoreId: string | null }
  | { ok: false; response: NextResponse };

export async function requireTicketAccess(request: Request, ticketId: string): Promise<TicketAccess> {
  const staff = await requireStaff(request);
  if (!staff) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Log ind som personale for at bruge dette endpoint." }, { status: 401 }),
    };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("repair_tickets")
    .select("id, store_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    console.error("[repairs] ticket access lookup failed:", ticketId, error);
    return { ok: false, response: NextResponse.json({ error: "Kunne ikke hente sagen" }, { status: 500 }) };
  }
  const storeId = (data as { store_id?: string | null } | null)?.store_id ?? null;
  if (!data || !canAccessStore(staff, storeId)) {
    return { ok: false, response: NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 }) };
  }
  return { ok: true, staff, ticketStoreId: storeId };
}
