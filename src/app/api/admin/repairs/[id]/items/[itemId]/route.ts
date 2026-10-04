import { NextResponse, type NextRequest } from "next/server";
import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { uuidParam } from "@/lib/repairs/case-schemas";
import { removeCaseItem } from "@/lib/repairs/case-create";
import { caseErrorResponse } from "@/lib/repairs/case-errors";

/** DELETE /api/admin/repairs/:id/items/:itemId: fjern linjen og frigiv delen/enheden. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  if (!uuidParam.safeParse(id).success || !uuidParam.safeParse(itemId).success) {
    return NextResponse.json({ error: "Linjen findes ikke" }, { status: 404 });
  }
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;
  try {
    const result = await removeCaseItem(id, itemId, access.staff);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return caseErrorResponse(err, "Linjen kunne ikke fjernes");
  }
}
