import { NextResponse, type NextRequest } from "next/server";
import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { removeItemSchema, updateItemSchema, uuidParam } from "@/lib/repairs/case-schemas";
import { removeCaseItem, updateCaseItemPrice } from "@/lib/repairs/case-create";
import { caseErrorResponse } from "@/lib/repairs/case-errors";

type Ctx = { params: Promise<{ id: string; itemId: string }> };
const NO_STORE = { "Cache-Control": "no-store" };

/** Tom body er ok for DELETE (begrundelsen er valgfri her; databasen kræver den hvor det er nødvendigt). */
async function readJson(request: Request): Promise<unknown> {
  try {
    const text = await request.text();
    return text.trim() ? JSON.parse(text) : {};
  } catch {
    return undefined;
  }
}

/**
 * DELETE /api/admin/repairs/:id/items/:itemId  (body: { reason? })
 * Fjern linjen. Reserverede dele frigives; brugte dele gives ikke tilbage til lager og kræver en begrundelse.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id, itemId } = await params;
  if (!uuidParam.safeParse(id).success || !uuidParam.safeParse(itemId).success) {
    return NextResponse.json({ error: "Linjen findes ikke" }, { status: 404 });
  }
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;
  const parsed = removeItemSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Begrundelsen er ugyldig" }, { status: 400 });
  try {
    const result = await removeCaseItem(id, itemId, access.staff, parsed.data.reason);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    return caseErrorResponse(err, "Linjen kunne ikke fjernes");
  }
}

/** PATCH /api/admin/repairs/:id/items/:itemId  (body: { unit_price_oere, reason? }): ret stykprisen. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id, itemId } = await params;
  if (!uuidParam.safeParse(id).success || !uuidParam.safeParse(itemId).success) {
    return NextResponse.json({ error: "Linjen findes ikke" }, { status: 404 });
  }
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;
  const parsed = updateItemSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldig pris" }, { status: 400 });
  }
  try {
    const result = await updateCaseItemPrice(id, itemId, parsed.data.unit_price_oere, parsed.data.reason, access.staff);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    return caseErrorResponse(err, "Prisen kunne ikke rettes");
  }
}
