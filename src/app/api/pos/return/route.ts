import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { createPosReturn, findReturnableOrder } from "@/lib/pos/create-return";
import { returnBodySchema } from "@/lib/pos/schemas";
import { UNAUTHORIZED, parseBody, posErrorResponse } from "@/lib/pos/route-helpers";

/**
 * GET /api/pos/return?q=<receipt number or order number>
 * Finds a POS sale and what can still be returned on each line.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const order = await findReturnableOrder(q);
    return NextResponse.json({ order });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved opslag af salg");
  }
}

/**
 * POST /api/pos/return
 * Return = credit note (kreditnota). The original order is never modified.
 *
 * Body: {
 *   originalOrderId, locationId, registerId,
 *   lines: Array<{ orderItemId, quantity, restock }>,   // restock: accessories back on the shelf /
 *                                                       // device back to "listed"; false parks a device as "returned"
 *   refunds: Array<{ type: kontant|kort_terminal|mobilepay|tilgodebevis, amountOere, reference? }>,
 *   reason, notes?
 * }
 * Refund lines must sum to the credit amount. A card refund is a manual
 * "kort_terminal" line: the staff member refunds on the Worldline terminal.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();

    const parsed = await parseBody(request, returnBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const result = await createPosReturn({
      originalOrderId: body.originalOrderId,
      locationId: body.locationId,
      registerId: body.registerId,
      staffId: staff.id,
      lines: body.lines,
      refunds: body.refunds,
      reason: body.reason,
      notes: body.notes ?? null,
    });

    return NextResponse.json({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      receiptNumber: result.receiptNumber,
      total: result.total,
      refundAmount: result.refundAmount,
      receiptPdf: result.receiptPdf ? result.receiptPdf.toString("base64") : null,
      warnings: result.warnings,
    });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved returnering");
  }
}
