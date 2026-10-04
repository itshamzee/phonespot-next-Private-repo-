import { NextResponse } from "next/server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { loadUpsellDevices } from "@/lib/repairs/catalog";
import { resolveLocation } from "@/lib/repairs/route-utils";

/** GET /api/admin/repair-catalog/devices?location=&q= : refurb-enheder (listed) i butikken til tilkøb. */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const url = new URL(request.url);
  const location = resolveLocation(ctx, url.searchParams.get("location"));
  try {
    const result = await loadUpsellDevices(location, url.searchParams.get("q"));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[repair-catalog] devices failed:", err);
    return NextResponse.json({ error: "Kunne ikke hente enheder" }, { status: 500 });
  }
}
