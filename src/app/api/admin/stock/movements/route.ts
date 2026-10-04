import { NextResponse } from "next/server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { queryMovements } from "@/lib/stock/movements";

/** GET /api/admin/stock/movements?side=1 — lagerbevægelser, afgrænset til medarbejderens butik (ejer: valgt scope). */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const page = Number(new URL(request.url).searchParams.get("side") ?? "1") || 1;
  try {
    const result = await queryMovements(ctx.staff, ctx.scope, { page });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[stock] movements", err);
    return NextResponse.json({ error: "Lagerbevægelserne kunne ikke hentes" }, { status: 500 });
  }
}
