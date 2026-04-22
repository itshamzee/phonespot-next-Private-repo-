import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";

const RowSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  variant_label: z.string().min(1),
  variant_sort: z.number().int().nonnegative(),
  selling_price: z.number().int().positive(),
  sale_price: z.number().int().positive().nullable(),
  compatible_models: z.array(z.string().min(1)).min(1),
  images: z.array(z.string()).default([]),
});

const BodySchema = z.object({
  variant_group: z.string().min(1),
  rows: z.array(RowSchema).min(1),
  initialStock: z.object({
    vejle: z.number().int().nonnegative().default(0),
    slagelse: z.number().int().nonnegative().default(0),
    online: z.number().int().nonnegative().default(0),
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const insertRows = parsed.data.rows.map((r) => ({
    ...r,
    category: "accessory",
    subcategory: "spot-glass",
    variant_group: parsed.data.variant_group,
    is_active: true,
    status: "active",
  }));

  const { data: inserted, error } = await supabase
    .from("sku_products")
    .insert(insertRows)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: locations, error: locErr } = await supabase
    .from("locations")
    .select("id, name");

  if (locErr) return NextResponse.json({ error: locErr.message }, { status: 500 });

  const stockRows: Array<{ product_id: string; location_id: string; quantity: number }> = [];

  for (const row of inserted ?? []) {
    for (const loc of locations ?? []) {
      const locName = (loc.name as string).toLowerCase();
      const qty =
        locName === "vejle"
          ? parsed.data.initialStock.vejle
          : locName === "slagelse"
            ? parsed.data.initialStock.slagelse
            : locName === "online"
              ? parsed.data.initialStock.online
              : 0;
      stockRows.push({ product_id: row.id, location_id: loc.id, quantity: qty });
    }
  }

  if (stockRows.length > 0) {
    const { error: stockErr } = await supabase.from("sku_stock").insert(stockRows);
    if (stockErr) return NextResponse.json({ error: stockErr.message }, { status: 500 });
  }

  return NextResponse.json(
    { created: inserted?.length ?? 0, variant_group: parsed.data.variant_group },
    { status: 201 },
  );
}
