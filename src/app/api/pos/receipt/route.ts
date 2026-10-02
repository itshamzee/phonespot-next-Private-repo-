import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { renderReceiptPdf } from "@/lib/pos/receipt-data";
import { UNAUTHORIZED, posErrorResponse } from "@/lib/pos/route-helpers";
import { uuidSchema } from "@/lib/pos/schemas";

/**
 * GET /api/pos/receipt?order_id=<id>
 * Re-prints the receipt (or credit note) from the stored data. Staff only.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();

    const orderId = new URL(request.url).searchParams.get("order_id");
    if (!orderId || !uuidSchema.safeParse(orderId).success) {
      return NextResponse.json({ error: "order_id påkrævet" }, { status: 400 });
    }
    const pdf = await renderReceiptPdf(orderId);
    if (!pdf) return NextResponse.json({ error: "Kvitteringen findes ikke" }, { status: 404 });

    return new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="kvittering.pdf"` },
    });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved kvittering");
  }
}
