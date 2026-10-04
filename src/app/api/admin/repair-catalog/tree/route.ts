import { NextResponse } from "next/server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { loadCatalogTree } from "@/lib/repairs/catalog";

/** GET /api/admin/repair-catalog/tree: mærker (under forælder), serier og modeller til "Ny sag". */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  try {
    const tree = await loadCatalogTree();
    return NextResponse.json(tree, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    console.error("[repair-catalog] tree failed:", err);
    return NextResponse.json({ error: "Kunne ikke hente kataloget" }, { status: 500 });
  }
}
