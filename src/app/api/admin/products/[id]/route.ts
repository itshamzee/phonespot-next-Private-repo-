import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    status: z.enum(["published", "draft"]).optional(),
    is_active: z.boolean().optional(),
    selling_price: z.number().int().positive().optional(),
    sale_price: z.number().int().positive().nullable().optional(),
    always_in_stock: z.boolean().optional(),
  })
  .strict();

/** PATCH /api/admin/products/[id] — små, hurtige rettelser fra listen (status, priser, bestillingsvare). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Ugyldige felter" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sku_products")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status, is_active, selling_price, sale_price, always_in_stock, category")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Ændringen blev ikke gemt" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Produktet findes ikke" }, { status: 404 });
  revalidatePath(data.category === "spare-part" ? "/reservedele" : "/tilbehoer", "layout");
  return NextResponse.json(data);
}

/** DELETE /api/admin/products/[id] — sletter et produkt, der aldrig er solgt. Ellers 409: brug kladde i stedet. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("sku_product_id", id);
  if (countError) return NextResponse.json({ error: "Kunne ikke kontrollere ordrer" }, { status: 503 });
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Produktet findes på ordrer og kan ikke slettes. Gem det som kladde i stedet." },
      { status: 409 },
    );
  }
  await supabase.from("sku_stock").delete().eq("product_id", id);
  await supabase.from("sku_product_templates").delete().eq("sku_product_id", id);
  const { data, error } = await supabase.from("sku_products").delete().eq("id", id).select("id, category").maybeSingle();
  if (error) return NextResponse.json({ error: "Produktet blev ikke slettet" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Produktet findes ikke" }, { status: 404 });
  revalidatePath(data.category === "spare-part" ? "/reservedele" : "/tilbehoer", "layout");
  return NextResponse.json({ deleted: true });
}
