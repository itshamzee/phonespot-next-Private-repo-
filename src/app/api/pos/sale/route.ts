import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { createPosSale } from "@/lib/pos/create-sale";
import { saleBodySchema } from "@/lib/pos/schemas";
import { UNAUTHORIZED, parseBody, posErrorResponse } from "@/lib/pos/route-helpers";

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
 *   locationId, registerId, customerId?,
 *   discountAmount?: number (oere), discountReason?: "Fejl"|"Kundeservice"|"Tilbud"|"Andet",
 *   notes?
 * }
 *
 * In-store card payments are taken on the stand-alone terminal first and then
 * recorded here as a "kort_terminal" line; no card is ever charged by this route.
 *
 * Returns: { orderId, orderNumber, receiptNumber, total, receiptPdf (base64 | null), warnings }
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();

    const parsed = await parseBody(request, saleBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const result = await createPosSale({
      items: body.items,
      payments: body.payments,
      locationId: body.locationId,
      registerId: body.registerId,
      customerId: body.customerId ?? null,
      discountAmount: body.discountAmount ?? 0,
      discountReason: body.discountReason ?? null,
      notes: body.notes ?? null,
      staffId: staff.id,
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
