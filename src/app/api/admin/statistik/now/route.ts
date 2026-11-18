import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { getStoreScope } from "@/lib/auth/store-scope";
import { forbiddenResponse, storeCookieFromHeader, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { statViewer } from "@/lib/admin/statistik/access";
import { loadNowBlock } from "@/lib/admin/statistik/load";

/**
 * GET /api/admin/statistik/now[?butik=vejle|alle]
 *
 * "Lige nu"-blokken på Statistik, hentet igen hvert minut. Adgang og butik
 * afgøres her: kun personale (401), kun med se_statistik (403). ?butik= gives
 * kun til statViewer, som bruger det for ejeren og ignorerer det for alle andre;
 * ejer-tallene er skåret fra for andre end ejeren.
 */
export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return unauthorizedResponse();

  const cookieScope = getStoreScope(staff, storeCookieFromHeader(request.headers.get("cookie")));
  const butik = new URL(request.url).searchParams.get("butik") ?? undefined;
  const viewer = statViewer(staff, cookieScope, butik);
  if (!viewer) return forbiddenResponse("Du har ikke adgang til statistik.");

  try {
    const now = await loadNowBlock(viewer);
    return NextResponse.json(now, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin/statistik/now]", err);
    return NextResponse.json({ error: "Kunne ikke hente tallene." }, { status: 500 });
  }
}
