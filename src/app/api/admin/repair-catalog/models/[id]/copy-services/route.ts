import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { canSeeCost } from "@/lib/repairs/availability";
import { uuidParam } from "@/lib/repairs/case-schemas";
import { copyServices } from "@/lib/repairs/copy-services";

/**
 * POST /api/admin/repair-catalog/models/:id/copy-services  { from_model_id }
 * Kopierer en søskendemodels reparationstyper til en model uden (fx en ny iPhone), som INAKTIVE
 * reparationer, så reservedelene kan lagerføres pr. butik før priserne er sat. Kun manager og owner.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  if (!canSeeCost(ctx.staff.role)) return NextResponse.json({ error: "Kun managere og ejere kan gøre dette" }, { status: 403 });
  const { id } = await params;
  const body = z.object({ from_model_id: uuidParam }).safeParse(await request.json().catch(() => null));
  if (!uuidParam.safeParse(id).success || !body.success) return NextResponse.json({ error: "Vælg en model at kopiere fra" }, { status: 400 });
  try {
    const result = await copyServices(createServerClient(), id, body.data.from_model_id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[repair-catalog] copy-services failed:", id, err);
    return NextResponse.json({ error: "Kunne ikke kopiere reparationerne" }, { status: 500 });
  }
}
