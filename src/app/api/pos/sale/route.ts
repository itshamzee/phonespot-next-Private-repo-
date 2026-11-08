import { NextRequest, NextResponse } from "next/server";
import { createSaleWithTerminal } from "@/lib/pos/terminal-flow";
import { saleBodySchema } from "@/lib/pos/schemas";
import { resolveRegister } from "@/lib/pos/pos-context";
import { UNAUTHORIZED, parseBody, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";

/**
 * POST /api/pos/sale
 * Create a POS sale. Staff only.
 *
 * Body: {
 *   items: Array<
 *     | { type: "device", deviceId }
 *     | { type: "sku_product", skuProductId, quantity }
 *     | { type: "free_text", description, unitPriceOere, quantity? }      // "Diverse salg", 25 % moms
 *     | { type: "deposit", description?, unitPriceOere }                  // "Depositum", 25 % moms
 *   >,
 *   payments: Array<{ type: kontant|kort_terminal|mobilepay|klarna|faktura|tilgodebevis|gavekort,
 *                     amountOere, reference? }>,    // must sum to the total
 *   registerId, customerId?,   // locationId is ignored: the server uses the register's own location
 *   discountAmount?: number (oere), discountReason?: "Fejl"|"Kundeservice"|"Tilbud"|"Partner"|"Andet",
 *   notes?,
 *   terminalReference?   // only with an integrated terminal: lets the Kasse cancel a pending charge
 * }
 *
 * Manual terminal (default, POS_TERMINAL_PROVIDER unset/"manual"): in-store card
 * payments are taken on the stand-alone terminal first and then recorded here as
 * a "kort_terminal" line; no card is charged by this route.
 * Integrated terminal: the "kort_terminal" lines are charged on the store's
 * terminal before the sale is saved, and the terminal transaction id is stored
 * as the line's reference. A declined/failed charge creates no sale.
 *
 * Returns: { orderId, orderNumber, receiptNumber, total, receiptPdf (base64 | null), warnings }
 */
export async function POST(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();
    const { actor } = pos;

    const parsed = await parseBody(request, saleBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const register = await resolveRegister(actor, body.registerId);

    const result = await createSaleWithTerminal({
      items: body.items,
      payments: body.payments,
      locationId: register.locationId,
      registerId: register.registerId,
      customerId: body.customerId ?? null,
      discountAmount: body.discountAmount ?? 0,
      discountReason: body.discountReason ?? null,
      notes: body.notes ?? null,
      staffId: actor.id,
      terminalReference: body.terminalReference ?? null,
    });

    return NextResponse.json({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      receiptNumber: result.receiptNumber,
      total: result.total,
      receiptPdf: result.receiptPdf ? result.receiptPdf.toString("base64") : null,
      warnings: result.warnings,
    });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved oprettelse af salg");
  }
}
