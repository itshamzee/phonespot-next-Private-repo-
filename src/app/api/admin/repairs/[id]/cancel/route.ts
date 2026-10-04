import { NextResponse, type NextRequest } from "next/server";
import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { cancelSchema, uuidParam } from "@/lib/repairs/case-schemas";
import { cancelCase } from "@/lib/repairs/case-create";
import { caseErrorResponse } from "@/lib/repairs/case-errors";

/** POST /api/admin/repairs/:id/cancel  { reason }: frigiver alt og sætter status "annulleret". */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;
  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Skriv hvorfor sagen annulleres" }, { status: 400 });
  }
  try {
    const result = await cancelCase(id, parsed.data.reason, access.staff);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return caseErrorResponse(err, "Sagen kunne ikke annulleres");
  }
}
