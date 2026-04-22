import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  selling_price: z.number().int().positive().optional(),
  sale_price: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
  variant_label: z.string().min(1).optional(),
  variant_sort: z.number().int().nonnegative().optional(),
  stock: z.record(z.string(), z.number().int().nonnegative()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { stock, ...productFields } = parsed.data;

  if (Object.keys(productFields).length > 0) {
    const updates = { ...productFields, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("sku_products")
      .update(updates)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (stock) {
    const upserts = Object.entries(stock).map(([location_id, quantity]) => ({
      product_id: id,
      location_id,
      quantity,
    }));
    const { error } = await supabase
      .from("sku_stock")
      .upsert(upserts, { onConflict: "product_id,location_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("sku_products")
    .update({ is_active: false, status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
