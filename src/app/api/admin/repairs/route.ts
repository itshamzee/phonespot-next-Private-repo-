import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { applyStoreScope, requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";

/**
 * GET /api/admin/repairs — sagslisten, afgrænset til personalets butik
 * (ejeren: den butik der er valgt i topbjælken, eller alle).
 * Listen henter bevidst ikke fotos, tjekliste eller noter; de hører til detaljesiden.
 */
const LIST_COLUMNS =
  "id, ticket_number, customer_name, customer_email, customer_phone, device_type, device_model, service_type, status, paid, on_hold_reason, is_urgent, store_id, created_at";

export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();

  const supabase = createServerClient();
  const { data, error } = await applyStoreScope(
    supabase.from("repair_tickets").select(LIST_COLUMNS).order("created_at", { ascending: false }),
    ctx.scope,
  );

  if (error) {
    console.error("[admin/repairs] list failed:", error);
    return NextResponse.json({ error: "Kunne ikke hente sagerne" }, { status: 500 });
  }
  return NextResponse.json({ tickets: data ?? [], scope: ctx.scope }, { headers: { "Cache-Control": "no-store" } });
}
