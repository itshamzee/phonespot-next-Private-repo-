import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { BULK_MAX, bulkChangeSchema, chunk, groupByPatch, planBulkChange, type BulkRow } from "@/lib/admin/products/bulk";
import { applyProductListFilter } from "@/lib/admin/products/list-filter";

/**
 * POST /api/admin/products/bulk — masseændring fra admin-listen.
 * Målet er enten en liste af id'er (afkrydsede rækker) eller listens filter
 * ("alle der matcher"). Ændringen er status, bestillingsvare, pris og/eller tilbudspris.
 * Svarer med antal ændrede og de produkter, der blev sprunget over (med grund).
 */

const bodySchema = z
  .object({
    type: z.enum(["accessory", "spare-part"]).default("accessory"),
    ids: z.array(z.string().uuid()).min(1).max(BULK_MAX).optional(),
    filter: z
      .object({
        search: z.string().optional(),
        subcategory: z.string().optional(),
        brand: z.string().optional(),
        status: z.string().optional(),
        stock: z.string().optional(),
      })
      .strict()
      .optional(),
    change: bulkChangeSchema,
  })
  .strict()
  .refine((b) => Boolean(b.ids) !== Boolean(b.filter), { message: "Angiv enten ids eller filter" });

const READ_CHUNK = 100;
const COLUMNS = "id, title, selling_price, sale_price";

export async function POST(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige felter" }, { status: 400 });
  }
  const { type, ids, filter, change } = parsed.data;
  const supabase = createAdminClient();

  // 1. Find produkterne. Typen låses altid, så et id fra en anden liste ikke kan ændres herfra.
  const rows: BulkRow[] = [];
  if (ids) {
    for (const part of chunk([...new Set(ids)], READ_CHUNK)) {
      const { data, error } = await applyProductListFilter(
        supabase.from("checkout_sku_inventory").select(COLUMNS),
        { type },
      ).in("id", part);
      if (error) return NextResponse.json({ error: "Produkterne kunne ikke læses" }, { status: 503 });
      rows.push(...((data ?? []) as BulkRow[]));
    }
  } else {
    const { data, error } = await applyProductListFilter(
      supabase.from("checkout_sku_inventory").select(COLUMNS),
      { type, ...filter },
    )
      .order("created_at", { ascending: false })
      .range(0, BULK_MAX);
    if (error) return NextResponse.json({ error: "Produkterne kunne ikke læses" }, { status: 503 });
    if ((data?.length ?? 0) > BULK_MAX) {
      return NextResponse.json({ error: `Højst ${BULK_MAX} produkter ad gangen. Indsnævr filteret.` }, { status: 400 });
    }
    rows.push(...((data ?? []) as BulkRow[]));
  }
  if (rows.length === 0) return NextResponse.json({ error: "Ingen produkter at ændre" }, { status: 404 });

  // 2. Regn ud og skriv. Ens ændringer skrives samlet.
  const plan = planBulkChange(rows, change);
  const now = new Date().toISOString();
  let updated = 0;
  let failed = 0;
  for (const group of groupByPatch(plan.updates)) {
    for (const part of chunk(group.ids, READ_CHUNK)) {
      const { data, error } = await supabase
        .from("sku_products")
        .update({ ...group.patch, updated_at: now })
        .in("id", part)
        .select("id");
      if (error) failed += part.length;
      else updated += data?.length ?? 0;
    }
  }

  if (updated > 0) {
    revalidatePath(type === "spare-part" ? "/reservedele" : "/tilbehoer", "layout");
    if (type === "accessory") revalidatePath("/lagersalg", "layout");
  }

  return NextResponse.json(
    { updated, failed, matched: rows.length, skipped: plan.skipped },
    { status: failed > 0 && updated === 0 ? 500 : 200 },
  );
}
