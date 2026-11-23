import { posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { loadReceiptForActor } from "@/lib/opkoeb/receipt-access";
import { loadSlutseddelData } from "@/lib/opkoeb/slutseddel-data";
import { renderSlutseddelPdf } from "@/lib/pdf/slutseddel";

/**
 * GET /api/trade-in/receipts/[id]/pdf: slutsedlen som PDF, til personalet i
 * sedlens butik (ejeren ser alle). Renderes på forespørgsel, så den altid
 * svarer til rækken; pdf_url kan ikke skrives efter bekræftelsen.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { id } = await params;
    await loadReceiptForActor(staff.actor, id);
    const { data } = await loadSlutseddelData(id);
    const pdf = await renderSlutseddelPdf(data);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Slutseddel-${data.receipt_number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke lave PDF'en");
  }
}
