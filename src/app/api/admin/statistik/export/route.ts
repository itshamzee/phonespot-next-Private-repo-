import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { getStoreScope } from "@/lib/auth/store-scope";
import { forbiddenResponse, storeCookieFromHeader, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { statViewer } from "@/lib/admin/statistik/access";
import { exportFileName, toCsv, toXlsx } from "@/lib/admin/statistik/export";
import { firstOrderDate, loadStatistik } from "@/lib/admin/statistik/load";
import { parseStatQuery } from "@/lib/admin/statistik/range";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * GET /api/admin/statistik/export?format=csv|xlsx[&periode=…|&fra=…&til=…][&butik=…]
 *
 * Statistik som fil, med samme forespørgsel som siden. Adgang som på siden:
 * kun personale (401), kun med se_statistik (403) og desuden eksportere (403).
 * Payloaden bygges for viewer med loadStatistik, så ejer-tallene er skåret fra
 * for alle andre end ejeren, og ?butik= bruges kun af ejeren.
 */
export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return unauthorizedResponse();

  const params = new URL(request.url).searchParams;
  const cookieScope = getStoreScope(staff, storeCookieFromHeader(request.headers.get("cookie")));
  const viewer = statViewer(staff, cookieScope, params.get("butik") ?? undefined);
  if (!viewer) return forbiddenResponse("Du har ikke adgang til statistik.");
  if (!viewer.canExport) return forbiddenResponse("Du har ikke adgang til at eksportere.");

  const format = params.get("format");
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Ukendt format. Brug csv eller xlsx." }, { status: 400 });
  }

  try {
    const now = new Date();
    const minDate = await firstOrderDate();
    const range = parseStatQuery(
      { periode: params.get("periode") ?? undefined, fra: params.get("fra") ?? undefined, til: params.get("til") ?? undefined },
      now,
      minDate,
    );
    const payload = await loadStatistik(viewer, range, now);
    const headers = {
      "Content-Disposition": `attachment; filename="${exportFileName(payload, format)}"`,
      "Cache-Control": "no-store",
    };

    if (format === "csv") {
      return new NextResponse(toCsv(payload), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
    }
    const bytes = await toXlsx(payload);
    return new NextResponse(bytes as Uint8Array<ArrayBuffer>, { headers: { ...headers, "Content-Type": XLSX_TYPE } });
  } catch (err) {
    console.error("[admin/statistik/export]", err);
    return NextResponse.json({ error: "Kunne ikke lave filen." }, { status: 500 });
  }
}
