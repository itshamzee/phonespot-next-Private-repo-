import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { loadDailySummary } from "@/lib/pos/daily-summary-data";
import { copenhagenDateString, isValidDateString } from "@/lib/pos/copenhagen";
import { summaryToCsv } from "@/lib/pos/summary-csv";
import { renderDailySummaryPdf } from "@/lib/pos/summary-pdf";
import { UNAUTHORIZED, posErrorResponse } from "@/lib/pos/route-helpers";
import { uuidSchema } from "@/lib/pos/schemas";

/**
 * GET /api/pos/daily-summary?register_id=<id>|location_id=<id>&date=<YYYY-MM-DD>&format=json|csv|pdf
 * The daily summary per register and Copenhagen day: totals per payment type,
 * standard VAT and brugtmoms, discount, refunds, receipt number range, cash
 * sessions. CSV is a Dinero journal with placeholder accounts.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();

    const { searchParams } = new URL(request.url);
    const registerId = searchParams.get("register_id");
    const locationId = searchParams.get("location_id");
    const date = searchParams.get("date") ?? copenhagenDateString();
    const format = searchParams.get("format") ?? "json";

    if (!registerId && !locationId) {
      return NextResponse.json({ error: "register_id eller location_id påkrævet" }, { status: 400 });
    }
    for (const id of [registerId, locationId]) {
      if (id && !uuidSchema.safeParse(id).success) {
        return NextResponse.json({ error: "Ugyldigt id" }, { status: 400 });
      }
    }
    if (!isValidDateString(date)) return NextResponse.json({ error: "Ugyldig dato" }, { status: 400 });
    if (!["json", "csv", "pdf"].includes(format)) {
      return NextResponse.json({ error: "Ugyldigt format" }, { status: 400 });
    }

    const summary = await loadDailySummary({ date, registerId, locationId });
    const scope = (summary.registerName ?? "alle-kasser").toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (format === "csv") {
      return new NextResponse(summaryToCsv(summary), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="dagsopgoerelse-${date}-${scope}.csv"`,
        },
      });
    }
    if (format === "pdf") {
      const pdf = await renderDailySummaryPdf(summary);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="dagsopgoerelse-${date}-${scope}.pdf"`,
        },
      });
    }
    return NextResponse.json({ summary });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved dagsopgørelse");
  }
}
