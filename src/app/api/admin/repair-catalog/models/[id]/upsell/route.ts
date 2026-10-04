import { NextResponse } from "next/server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { loadUpsell } from "@/lib/repairs/catalog";
import { resolveLocation } from "@/lib/repairs/route-utils";
import { uuidParam } from "@/lib/repairs/case-schemas";

/** GET /api/admin/repair-catalog/models/:id/upsell?location=&q= : tilbehør til modellen (eller søgning i sortimentet). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NextResponse.json({ error: "Modellen findes ikke" }, { status: 404 });
  const url = new URL(request.url);
  const location = resolveLocation(ctx, url.searchParams.get("location"));
  try {
    const result = await loadUpsell(id, location, url.searchParams.get("q"));
    if (!result) return NextResponse.json({ error: "Modellen findes ikke" }, { status: 404 });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[repair-catalog] upsell failed:", id, err);
    return NextResponse.json({ error: "Kunne ikke hente tilkøb" }, { status: 500 });
  }
}
