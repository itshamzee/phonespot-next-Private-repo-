import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { modelSlugs, requireCatalogEditor, revalidateRepairPages } from "@/lib/repairs/catalog-manage";
import { MAX_PRICE_DKK, activationGuard, firstIssue } from "@/lib/repairs/catalog-manage-rules";
import { uuidParam } from "@/lib/repairs/case-schemas";

const patchServiceSchema = z
  .object({
    price_dkk: z
      .number({ error: "Prisen skal være et tal" })
      .int("Prisen skal være i hele kroner")
      .min(1, "Prisen skal være over 0 kr.")
      .max(MAX_PRICE_DKK, "Prisen er for høj")
      .optional(),
    active: z.boolean().optional(),
    estimated_minutes: z.number().int("Minutter skal være et helt tal").min(0).max(1440, "Tiden er for lang").nullable().optional(),
    warranty_info: z.string().trim().max(200, "Garantiteksten er for lang").nullable().optional(),
  })
  .strict();

/**
 * PATCH /api/admin/repair-catalog/manage/services/:id { price_dkk?, active?, estimated_minutes?, warranty_info? }
 * Aktive reparationer er live på hjemmesiden og i Ny sag, så en reparation kan kun aktiveres med pris over 0.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NextResponse.json({ error: "Reparationen findes ikke" }, { status: 404 });
  const parsed = patchServiceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const input = parsed.data;
  if (Object.keys(input).length === 0) return NextResponse.json({ error: "Ingen felter at opdatere" }, { status: 400 });

  try {
    const db = createServerClient();
    const { data: current, error: readError } = await db
      .from("repair_services")
      .select("id, model_id, price_dkk, active")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) return NextResponse.json({ error: "Reparationen findes ikke" }, { status: 404 });
    const row = current as { id: string; model_id: string; price_dkk: number | null; active: boolean };

    if (input.active === true) {
      const guard = activationGuard(input.price_dkk ?? row.price_dkk);
      if (!guard.ok) return NextResponse.json({ error: guard.message, code: "price_required" }, { status: 422 });
    }

    const updates: Record<string, unknown> = {};
    if (input.price_dkk !== undefined) updates.price_dkk = input.price_dkk;
    if (input.active !== undefined) updates.active = input.active;
    if (input.estimated_minutes !== undefined) updates.estimated_minutes = input.estimated_minutes;
    if (input.warranty_info !== undefined) updates.warranty_info = input.warranty_info?.trim() || null;

    const { data, error } = await db
      .from("repair_services")
      .update(updates)
      .eq("id", id)
      .select("id, model_id, price_dkk, active, estimated_minutes, warranty_info")
      .single();
    if (error || !data) throw new Error(error?.message ?? "update failed");
    revalidateRepairPages(await modelSlugs(db, row.model_id));
    return NextResponse.json(data);
  } catch (err) {
    console.error("[repair-catalog/manage] patch service failed:", id, err);
    return NextResponse.json({ error: "Kunne ikke gemme reparationen" }, { status: 500 });
  }
}
