import { NextResponse } from "next/server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { loadModelServices } from "@/lib/repairs/catalog";
import { canSeeCost } from "@/lib/repairs/availability";
import { resolveLocation } from "@/lib/repairs/route-utils";
import { uuidParam } from "@/lib/repairs/case-schemas";

/** GET /api/admin/repair-catalog/models/:id/services?location=vejle|slagelse */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NextResponse.json({ error: "Modellen findes ikke" }, { status: 404 });
  const location = resolveLocation(ctx, new URL(request.url).searchParams.get("location"));
  try {
    const result = await loadModelServices(id, location, canSeeCost(ctx.staff.role));
    if (!result) return NextResponse.json({ error: "Modellen findes ikke" }, { status: 404 });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[repair-catalog] services failed:", id, err);
    return NextResponse.json({ error: "Kunne ikke hente reparationerne" }, { status: 500 });
  }
}
