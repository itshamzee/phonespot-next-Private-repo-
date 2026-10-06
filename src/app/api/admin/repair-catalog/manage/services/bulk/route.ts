import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { modelSlugs, requireCatalogEditor, revalidateRepairPages } from "@/lib/repairs/catalog-manage";
import { MAX_PRICE_DKK, activationGuard, bulkPriceSummary, firstIssue, previewBulkPrice } from "@/lib/repairs/catalog-manage-rules";
import { uuidParam } from "@/lib/repairs/case-schemas";

const ids = z.array(uuidParam).min(1, "Vælg mindst én reparation").max(200, "For mange reparationer på én gang");

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("price"),
    model_id: uuidParam,
    ids,
    op: z.object({
      mode: z.enum(["delta", "percent"]),
      amount: z.number({ error: "Skriv et beløb" }).finite().min(-100000).max(100000),
    }),
  }),
  z.object({ action: z.literal("set_active"), model_id: uuidParam, ids, active: z.boolean() }),
  z.object({ action: z.literal("activate_priced"), model_id: uuidParam }),
]);

type Row = { id: string; price_dkk: number | null; active: boolean };

/**
 * POST /api/admin/repair-catalog/manage/services/bulk
 *  { action: "price", model_id, ids, op: { mode: "delta" | "percent", amount } }  prisændring i én forespørgsel
 *  { action: "set_active", model_id, ids, active }                              slå flere til/fra
 *  { action: "activate_priced", model_id }                                       aktivér alle inaktive med pris
 * Prisen regnes med samme funktion som forhåndsvisningen. Alt valideres før noget skrives:
 * en ny pris skal være over 0, og aktivering kræver en pris.
 */
export async function POST(request: Request) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  const parsed = bulkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const input = parsed.data;
  if (input.action === "price" && input.op.mode === "percent" && input.op.amount < -99) {
    return NextResponse.json({ error: "Procenten kan ikke være under -99" }, { status: 400 });
  }

  try {
    const db = createServerClient();
    const { data: rows, error } = await db.from("repair_services").select("id, price_dkk, active").eq("model_id", input.model_id);
    if (error) throw new Error(error.message);
    const all = (rows ?? []) as Row[];

    let updated = 0;
    if (input.action === "activate_priced") {
      const targets = all.filter((r) => !r.active && activationGuard(r.price_dkk).ok);
      if (targets.length > 0) {
        const { error: upError } = await db
          .from("repair_services")
          .update({ active: true })
          .eq("model_id", input.model_id)
          .in(
            "id",
            targets.map((r) => r.id),
          );
        if (upError) throw new Error(upError.message);
      }
      updated = targets.length;
    } else {
      const byId = new Map(all.map((r) => [r.id, r]));
      const selected = [...new Set(input.ids)].map((id) => byId.get(id));
      if (selected.some((r) => !r)) {
        return NextResponse.json({ error: "En eller flere reparationer hører ikke til modellen" }, { status: 400 });
      }
      const picked = selected as Row[];

      if (input.action === "set_active") {
        if (input.active) {
          const unpriced = picked.filter((r) => !activationGuard(r.price_dkk).ok);
          if (unpriced.length > 0) {
            return NextResponse.json(
              { error: `${unpriced.length} reparationer mangler en pris over 0 kr. og kan ikke aktiveres`, code: "price_required" },
              { status: 422 },
            );
          }
        }
        const { error: upError } = await db
          .from("repair_services")
          .update({ active: input.active })
          .eq("model_id", input.model_id)
          .in(
            "id",
            picked.map((r) => r.id),
          );
        if (upError) throw new Error(upError.message);
        updated = picked.length;
      } else {
        const preview = previewBulkPrice(
          picked.map((r) => ({ id: r.id, price_dkk: r.price_dkk ?? 0 })),
          input.op,
        );
        const summary = bulkPriceSummary(preview);
        if (summary.invalid > 0) {
          return NextResponse.json(
            { error: `${summary.invalid} reparationer ville få en pris under 1 kr. eller over ${MAX_PRICE_DKK} kr.`, code: "invalid_price" },
            { status: 422 },
          );
        }
        // Én opdatering pr. ny pris; typisk få forskellige priser.
        const byPrice = new Map<number, string[]>();
        for (const p of preview) {
          if (p.to === p.from) continue;
          byPrice.set(p.to, [...(byPrice.get(p.to) ?? []), p.id]);
        }
        for (const [price, priceIds] of byPrice) {
          const { error: upError } = await db.from("repair_services").update({ price_dkk: price }).eq("model_id", input.model_id).in("id", priceIds);
          if (upError) throw new Error(upError.message);
        }
        updated = summary.changed;
      }
    }

    if (updated > 0) revalidateRepairPages(await modelSlugs(db, input.model_id));
    return NextResponse.json({ updated });
  } catch (err) {
    console.error("[repair-catalog/manage] bulk failed:", err);
    return NextResponse.json({ error: "Kunne ikke gemme ændringerne" }, { status: 500 });
  }
}
