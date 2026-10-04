import { NextResponse } from "next/server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { receiveGoods } from "@/lib/stock/goods-receipt";
import { badRequest, goodsReceiptSchema, readJson, transferErrorResponse } from "@/lib/transfers/route-helpers";

/**
 * POST /api/admin/stock/receive — varemodtagelse (faktura) til en butiks lager.
 * Body: { locationSlug, invoiceNo?, invoiceDate? (YYYY-MM-DD), lines: [{ skuProductId, qty, costPriceOere? }] }
 * Manager eller ejer; manager kun for egen butik.
 */
export async function POST(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const parsed = goodsReceiptSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Ugyldig varemodtagelse", parsed.error.issues);
  try {
    const result = await receiveGoods(ctx.staff, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return transferErrorResponse(err, "Varemodtagelsen kunne ikke gemmes");
  }
}
