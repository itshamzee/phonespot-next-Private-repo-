import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { canAccessStore } from "@/lib/auth/store-scope";
import { findCaseRows, loadPosCase } from "@/lib/pos/case-data";
import { parseCaseReference } from "@/lib/pos/case-lookup";
import { UNAUTHORIZED, posErrorResponse } from "@/lib/pos/route-helpers";

/**
 * GET /api/pos/case?q=<case reference>
 * Finds a repair case for "Hent sag til betaling" / "Depositum på sag".
 * q is a case id (uuid), a case number (PS-2026-0123, also what a scan of the
 * case label gives) or "#1189" / "sag 1189".
 *
 * 200 { case: PosCase }                                   exactly one case in the staff member's store scope
 * 200 { case: null, candidates: [{id, ticketNumber}] }    a bare running number matched several years
 * 404                                                     nothing (or a case in another store: same answer)
 * 400                                                     q is not a case reference
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();

    const q = new URL(request.url).searchParams.get("q") ?? "";
    const ref = parseCaseReference(q);
    if (!ref) return NextResponse.json({ error: "Skriv et sagsnummer, fx PS-2026-0123 eller #1189" }, { status: 400 });

    const rows = (await findCaseRows(ref)).filter((r) => canAccessStore(staff, r.store_id));
    if (rows.length === 0) return NextResponse.json({ error: "Sagen blev ikke fundet" }, { status: 404 });
    if (rows.length > 1) {
      return NextResponse.json({
        case: null,
        candidates: rows.map((r) => ({ id: r.id, ticketNumber: r.ticket_number ?? r.id.slice(0, 8) })),
      });
    }
    const posCase = await loadPosCase(rows[0].id);
    if (!posCase) return NextResponse.json({ error: "Sagen blev ikke fundet" }, { status: 404 });
    return NextResponse.json({ case: posCase, candidates: [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved hentning af sag");
  }
}
