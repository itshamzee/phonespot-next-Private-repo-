import { NextResponse, type NextRequest } from "next/server";
import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { addItemSchema, uuidParam } from "@/lib/repairs/case-schemas";
import { addCaseItem } from "@/lib/repairs/case-create";
import { caseErrorResponse } from "@/lib/repairs/case-errors";

/** POST /api/admin/repairs/:id/items  { item }: tilføj en linje (reparation, produkt, enhed, fritekst). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;

  const parsed = addItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ugyldig forespørgsel" }, { status: 400 });
  }
  try {
    const result = await addCaseItem(id, parsed.data.item, access.staff);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return caseErrorResponse(err, "Linjen kunne ikke tilføjes");
  }
}
