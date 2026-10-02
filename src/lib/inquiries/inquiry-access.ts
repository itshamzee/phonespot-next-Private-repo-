import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff, type StaffIdentity } from "@/lib/auth/require-staff";
import { canAccessStore } from "@/lib/auth/store-scope";

/**
 * Adgangskontrol til én henvendelse/opkøbssag (contact_inquiries). Samme regler
 * som ticket-access: 401 uden personale, 404 hvis den ikke findes ELLER ligger i
 * en anden butik, ejeren må alt.
 */
export type InquiryAccess =
  | { ok: true; staff: StaffIdentity; inquiryStoreId: string | null }
  | { ok: false; response: NextResponse };

export async function requireInquiryAccess(request: Request, inquiryId: string): Promise<InquiryAccess> {
  const staff = await requireStaff(request);
  if (!staff) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Log ind som personale for at bruge dette endpoint." }, { status: 401 }),
    };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("contact_inquiries")
    .select("id, store_id")
    .eq("id", inquiryId)
    .maybeSingle();

  if (error) {
    console.error("[inquiries] access lookup failed:", inquiryId, error);
    return { ok: false, response: NextResponse.json({ error: "Kunne ikke hente henvendelsen" }, { status: 500 }) };
  }
  const storeId = (data as { store_id?: string | null } | null)?.store_id ?? null;
  if (!data || !canAccessStore(staff, storeId)) {
    return { ok: false, response: NextResponse.json({ error: "Henvendelse ikke fundet" }, { status: 404 }) };
  }
  return { ok: true, staff, inquiryStoreId: storeId };
}
