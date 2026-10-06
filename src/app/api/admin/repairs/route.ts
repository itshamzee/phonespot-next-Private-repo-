import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { buildCaseList, fetchScopedTickets, parseListParams } from "@/lib/repairs/case-query";
import { createCaseGroupSchema, createCaseSchema, parseIdempotencyKey } from "@/lib/repairs/case-schemas";
import { createRepairCase, createRepairCaseGroup } from "@/lib/repairs/case-create";
import { caseErrorResponse } from "@/lib/repairs/case-errors";
import type { CreateCaseBody, CreateCaseGroupBody } from "@/lib/repairs/case-schemas";
import { IDEMPOTENCY_HEADER } from "@/lib/repairs/new-case-types";

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

/**
 * POST /api/admin/repairs: opret sag (Ny sag). Header `Idempotency-Key` er paakraevet: samme noegle og
 * samme body giver det samme svar igen (replayed: true), saa et dobbeltklik aldrig laver to sager.
 * Butik afgoeres paa serveren (egen butik; ejeren vaelger). 201 ny sag, 200 gentaget svar.
 * Se src/lib/repairs/new-case-types.ts for kontrakten.
 */
export async function POST(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();

  const key = parseIdempotencyKey(request.headers.get(IDEMPOTENCY_HEADER));
  if (!key) {
    return NextResponse.json({ error: `Headeren ${IDEMPOTENCY_HEADER} mangler eller er ugyldig` }, { status: 400 });
  }
  const json = await request.json().catch(() => null);
  // Flere enheder: { customer, devices: [...] } (maks. 10). Ellers den uændrede enkelt-enhedsform.
  const isGroup = Boolean(json) && typeof json === "object" && "devices" in (json as object);
  const parsed = isGroup ? createCaseGroupSchema.safeParse(json) : createCaseSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message || "Ugyldig forespørgsel", path: issue?.path.join(".") },
      { status: 400 },
    );
  }

  try {
    const result = isGroup
      ? await createRepairCaseGroup(parsed.data as CreateCaseGroupBody, ctx, key)
      : await createRepairCase(parsed.data as CreateCaseBody, ctx, key);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return caseErrorResponse(err, "Sagen kunne ikke oprettes");
  }
}
