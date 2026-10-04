import { NextResponse, type NextRequest } from "next/server";
import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { swapPartSchema, uuidParam } from "@/lib/repairs/case-schemas";
import { swapCasePart } from "@/lib/repairs/case-create";
import { caseErrorResponse } from "@/lib/repairs/case-errors";

/**
 * POST /api/admin/repairs/:id/items/:itemId/swap-part  { sku_product_id }
 * itemId er reparationslinjen eller dellinjen. Frigiver den gamle del og reserverer den nye.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  if (!uuidParam.safeParse(id).success || !uuidParam.safeParse(itemId).success) {
    return NextResponse.json({ error: "Linjen findes ikke" }, { status: 404 });
  }
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;
  const parsed = swapPartSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vælg en del" }, { status: 400 });
  try {
    const result = await swapCasePart(id, itemId, parsed.data.sku_product_id, access.staff);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return caseErrorResponse(err, "Delen kunne ikke skiftes");
  }
}
