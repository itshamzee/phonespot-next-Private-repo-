import { NextResponse } from "next/server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { myStoreSlug, queryOverview } from "@/lib/stock/overview";

/**
 * GET /api/admin/stock/overview?q=&kun=1&side=1
 * Varelisten med lager pr. butik. ALLE medarbejdere ser alle butikkers lager (så de kan
 * anmode om varer); kostpris medsendes kun for ejer og manager.
 * kun=1 afgrænser til varer der findes i den aktuelle medarbejders butik.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const url = new URL(request.url);
  const mine = myStoreSlug(ctx.staff, ctx.scope);
  try {
    const result = await queryOverview(ctx.staff, {
      q: url.searchParams.get("q"),
      onlyStore: url.searchParams.get("kun") === "1" ? mine : null,
      page: Number(url.searchParams.get("side") ?? "1") || 1,
    });
    return NextResponse.json({ ...result, myStore: mine }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[stock] overview", err);
    return NextResponse.json({ error: "Varelisten kunne ikke hentes" }, { status: 500 });
  }
}
