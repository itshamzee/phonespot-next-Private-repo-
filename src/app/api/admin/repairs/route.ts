import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { buildCaseList, fetchScopedTickets, parseListParams } from "@/lib/repairs/case-query";

/**
 * GET /api/admin/repairs — sagsstyring, afgrænset til personalets butik
 * (ejeren: den butik der er valgt i topbjælken, eller alle).
 *
 * Query: tab = igang | klar | afventer | web | alle, q = søgning (navn, telefon,
 * sagsnummer, IMEI, beskrivelse), page, pageSize, ansvarlig.
 * Svar: { rows, counts, total, page, pageSize, assignees, scope }. Rækkerne er
 * sorteret efter afhentningsdag og sideinddelt her på serveren.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();

  const params = parseListParams(new URL(request.url));
  const supabase = createServerClient();
  const { tickets, error } = await fetchScopedTickets(supabase, ctx.scope);

  if (error) {
    console.error("[admin/repairs] list failed:", error);
    return NextResponse.json({ error: "Kunne ikke hente sagerne" }, { status: 500 });
  }

  const result = buildCaseList(tickets, params);
  return NextResponse.json({ ...result, scope: ctx.scope }, { headers: { "Cache-Control": "no-store" } });
}
