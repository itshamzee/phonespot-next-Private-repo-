import { NextResponse } from "next/server";
import { isOwner } from "@/lib/auth/store-scope";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { loadOverview } from "@/lib/admin/overview/load";
import { OKONOMI_PERIODS, OVERBLIK_PERIODS, parsePeriod, type PeriodKey } from "@/lib/admin/overview/period";

/**
 * GET /api/admin/overview?periode=dag|uge|maaned[&store=vejle]
 *
 * Nøgletal og paneler til Overblik. Afgrænsningen sker her på serveren:
 * medarbejdere får altid deres egen butik (`?store=` og cookien ignoreres),
 * ejeren får den valgte butik eller samlet overblik. Kvartal og år er kun til
 * Økonomi og kræver ejer.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { staff, scope } = ctx;

  const raw = new URL(request.url).searchParams.get("periode");
  const allowed: PeriodKey[] = isOwner(staff) ? [...OVERBLIK_PERIODS, ...OKONOMI_PERIODS] : OVERBLIK_PERIODS;
  const period = parsePeriod(raw, allowed, scope === "alle" ? "uge" : "dag");

  try {
    const payload = await loadOverview({ scope, isOwner: isOwner(staff) }, period);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin/overview]", err);
    return NextResponse.json({ error: "Kunne ikke hente overblikket." }, { status: 500 });
  }
}
