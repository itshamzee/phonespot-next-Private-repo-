import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { findReturnableOrder } from "@/lib/pos/create-return";
import { paymentTerminalKind } from "@/lib/pos/payment-terminal";
import { createReturnWithTerminal } from "@/lib/pos/terminal-flow";
import { returnBodySchema } from "@/lib/pos/schemas";
import { UNAUTHORIZED, parseBody, posErrorResponse } from "@/lib/pos/route-helpers";

/**
 * GET /api/pos/return?q=<receipt number or order number>
 * Finds a POS sale and what can still be returned on each line, plus which card
 * terminal integration is configured (terminalKind) so the page knows whether a
 * card refund is done by hand or sent to the terminal.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const order = await findReturnableOrder(q);
    return NextResponse.json({ order, terminalKind: paymentTerminalKind() });
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
 * Refund lines must sum to the credit amount. With the manual terminal a card
 * refund is a "kort_terminal" line and the staff member refunds on the Worldline
 * terminal by hand. With an integrated terminal the refund is sent to the
 * terminal first and its transaction id is saved as the line's reference.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();

    const parsed = await parseBody(request, returnBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const result = await createReturnWithTerminal({
      originalOrderId: body.originalOrderId,
      locationId: body.locationId,
      registerId: body.registerId,
      staffId: staff.id,
      lines: body.lines,
      refunds: body.refunds,
      reason: body.reason,
      notes: body.notes ?? null,
      terminalReference: body.terminalReference ?? null,
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
