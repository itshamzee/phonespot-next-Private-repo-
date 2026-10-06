import { NextResponse } from "next/server";
import { loadManageTree, requireCatalogEditor } from "@/lib/repairs/catalog-manage";

/** GET /api/admin/repair-catalog/manage/tree: mærke, serie og model inkl. inaktive, med antal reparationer. */
export async function GET(request: Request) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json(await loadManageTree(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[repair-catalog/manage] tree failed:", err);
    return NextResponse.json({ error: "Kunne ikke hente kataloget" }, { status: 500 });
  }
}
