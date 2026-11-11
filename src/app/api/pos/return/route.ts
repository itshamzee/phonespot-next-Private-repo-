import { NextRequest, NextResponse } from "next/server";
import { findReturnableOrder } from "@/lib/pos/create-return";
import { paymentTerminalKind } from "@/lib/pos/payment-terminal";
import { createReturnWithTerminal } from "@/lib/pos/terminal-flow";
import { returnBodySchema } from "@/lib/pos/schemas";
import { resolveRegister } from "@/lib/pos/pos-context";
import { assertReturnEntity, assertReturnLookupEntity } from "@/lib/pos/return-entity";
import { hasPermission } from "@/lib/auth/permissions";
import { FORBIDDEN, UNAUTHORIZED, parseBody, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";

// An integrated card terminal waits for the customer (Flatpay: up to ~100 s).
export const maxDuration = 120;

/**
 * GET /api/pos/return?q=<receipt number or order number>
 * Finds a POS sale and what can still be returned on each line, plus which card
 * terminal integration is configured (terminalKind) so the page knows whether a
 * card refund is done by hand or sent to the terminal.
 */
export async function GET(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const order = await findReturnableOrder(q);
    await assertReturnLookupEntity(pos.actor, order.id);
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
 *   originalOrderId, registerId,   // locationId is ignored: the server uses the register's own location
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
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();
    const { actor } = pos;
    if (!hasPermission(actor, "lave_retur")) return FORBIDDEN("Du har ikke tilladelse til at lave retur");

    const parsed = await parseBody(request, returnBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const register = await resolveRegister(actor, body.registerId);

    await assertReturnEntity(register.locationId, body.originalOrderId);

    const result = await createReturnWithTerminal({
      originalOrderId: body.originalOrderId,
      locationId: register.locationId,
      registerId: register.registerId,
      staffId: actor.id,
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
