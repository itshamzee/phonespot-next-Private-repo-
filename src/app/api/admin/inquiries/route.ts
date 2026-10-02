import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { applyStoreScope, requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";

/**
 * GET /api/admin/inquiries[?source=saelg-enhed] — henvendelser (og opkøbssager,
 * som er henvendelser med source "saelg-enhed"), afgrænset til personalets butik.
 * Ejeren ser den butik der er valgt i topbjælken, eller alle.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();

  const source = new URL(request.url).searchParams.get("source");
  const supabase = createServerClient();

  let query = supabase.from("contact_inquiries").select("*").order("created_at", { ascending: false });
  if (source) query = query.eq("source", source);

  const { data, error } = await applyStoreScope(query, ctx.scope);
  if (error) {
    console.error("[admin/inquiries] list failed:", error);
    return NextResponse.json({ error: "Kunne ikke hente henvendelserne" }, { status: 500 });
  }
  return NextResponse.json({ inquiries: data ?? [], scope: ctx.scope }, { headers: { "Cache-Control": "no-store" } });
}
