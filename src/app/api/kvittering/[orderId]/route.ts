import { NextRequest, NextResponse } from "next/server";
import { renderReceiptPdf } from "@/lib/pos/receipt-data";
import { verifyReceiptToken } from "@/lib/pos/receipt-link";
import { uuidSchema } from "@/lib/pos/schemas";

/**
 * GET /api/kvittering/<orderId>?t=<token>
 * Public, signed receipt PDF (the link in the "send kvittering på SMS" button).
 * Deliberately outside /api/pos, which is staff-only behind the middleware.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = new URL(request.url).searchParams.get("t");
  if (!uuidSchema.safeParse(orderId).success || !verifyReceiptToken(orderId, token)) {
    return NextResponse.json({ error: "Linket er ugyldigt" }, { status: 404 });
  }
  const pdf = await renderReceiptPdf(orderId);
  if (!pdf) return NextResponse.json({ error: "Kvitteringen findes ikke" }, { status: 404 });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="kvittering.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
