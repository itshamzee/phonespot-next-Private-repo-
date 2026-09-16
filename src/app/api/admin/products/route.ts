import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAccessoryRows,
  buildSparePartRow,
  resolveStockRows,
  uniqueSlugs,
  type LocationRow,
  type SkuProductRow,
  type StockSpec,
} from "@/lib/admin/products/create";
import { ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";

/**
 * POST /api/admin/products — ét opret-endpoint for alt der bor i sku_products.
 * Bag middleware (cookie-session). Modtager 1–100 varer i ét kald og opretter
 * dem sammen med lager, så alle opret-flows i admin skriver på samme måde.
 */

const stockSchema = z
  .object({
    online: z.number().int().min(0).nullable().optional(),
    stores: z.record(z.string(), z.number().int().min(0).nullable().optional()).optional(),
  })
  .optional();

const accessoryItem = z.object({
  title: z.string().min(1),
  subcategory: z.string().min(1),
  brand: z.string().nullable().optional(),
  models: z.array(z.string()).default([]),
  mode: z.enum(["per-model", "universal"]).default("universal"),
  sellingPrice: z.number().int(),
  salePrice: z.number().int().nullable().optional(),
  costPrice: z.number().int().nullable().optional(),
  ean: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
  attributes: z.record(z.string(), z.string().nullable().optional()).optional(),
  alwaysInStock: z.boolean().optional(),
  status: z.enum(["published", "draft"]).optional(),
  stock: stockSchema,
});

const sparePartItem = z.object({
  title: z.string().min(1),
  sellingPrice: z.number().int(),
  salePrice: z.number().int().nullable().optional(),
  costPrice: z.number().int().nullable().optional(),
  partCategoryId: z.string().nullable().optional(),
  qualityTierId: z.string().nullable().optional(),
  warrantyMonths: z.number().int().nullable().optional(),
  deviceBrand: z.string().nullable().optional(),
  deviceSeries: z.string().nullable().optional(),
  deviceModel: z.string().nullable().optional(),
  ean: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
  isInquiryOnly: z.boolean().optional(),
  alwaysInStock: z.boolean().optional(),
  status: z.enum(["published", "draft"]).optional(),
  stock: stockSchema,
});

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("accessory"), items: z.array(accessoryItem).min(1).max(100) }),
  z.object({ type: z.literal("spare-part"), items: z.array(sparePartItem).min(1).max(100) }),
]);

export interface CreatedProduct {
  id: string;
  slug: string;
  title: string;
  url: string;
}

function publicUrl(row: { slug: string; category: string; subcategory: string }): string {
  if (row.category === "spare-part") return `/reservedele?soeg=${encodeURIComponent(row.slug)}`;
  const category = ACCESSORY_CATEGORY_TO_SLUG[row.subcategory] ?? "andet";
  return `/tilbehoer/${category}/${row.slug}`;
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldige felter", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const body = parsed.data;

  // 1. Byg rækker rent (kaster med dansk fejltekst ved forkerte værdier).
  const planned: { row: SkuProductRow; stock?: StockSpec }[] = [];
  try {
    if (body.type === "accessory") {
      for (const item of body.items) {
        for (const row of buildAccessoryRows(item)) planned.push({ row, stock: item.stock ?? undefined });
      }
    } else {
      for (const item of body.items) planned.push({ row: buildSparePartRow(item), stock: item.stock ?? undefined });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Kunne ikke bygge produktet" }, { status: 400 });
  }
  if (planned.length > 200) {
    return NextResponse.json({ error: "Højst 200 produkter pr. oprettelse" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 2. Unikke slugs: hent alt der ligner de ønskede slugs, og giv løbenumre.
  const bases = [...new Set(planned.map((p) => p.row.slug))];
  const { data: existing, error: slugError } = await supabase
    .from("sku_products")
    .select("slug")
    .or(bases.map((b) => `slug.like.${b}%`).join(","));
  if (slugError) return NextResponse.json({ error: "Kunne ikke kontrollere links (slugs)" }, { status: 503 });
  const taken = new Set((existing ?? []).map((r) => r.slug as string).filter(Boolean));
  const slugs = uniqueSlugs(planned.map((p) => p.row.slug), taken);
  planned.forEach((p, i) => (p.row.slug = slugs[i]));

  // 3. Opret produkterne i ét kald.
  const { data: inserted, error: insertError } = await supabase
    .from("sku_products")
    .insert(planned.map((p) => p.row))
    .select("id, slug, title, category, subcategory");
  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "Produkterne blev ikke oprettet" }, { status: 500 });
  }

  // 4. Lager. Rækkefølgen fra insert svarer til planned.
  const needsStock = planned.some((p) => p.stock && (p.stock.online || Object.keys(p.stock.stores ?? {}).length));
  if (needsStock) {
    const { data: locations } = await supabase.from("locations").select("id, name, type");
    const stockRows: { product_id: string; location_id: string; quantity: number }[] = [];
    inserted.forEach((product, i) => {
      const spec = planned[i]?.stock;
      if (!spec) return;
      for (const r of resolveStockRows((locations ?? []) as LocationRow[], spec)) {
        stockRows.push({ product_id: product.id, ...r });
      }
    });
    if (stockRows.length) {
      const { error: stockError } = await supabase
        .from("sku_stock")
        .upsert(stockRows, { onConflict: "product_id,location_id" });
      if (stockError) {
        return NextResponse.json(
          { error: "Produkterne er oprettet, men lageret kunne ikke gemmes", created: inserted },
          { status: 207 },
        );
      }
    }
  }

  revalidatePath(body.type === "accessory" ? "/tilbehoer" : "/reservedele", "layout");

  const created: CreatedProduct[] = inserted.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    url: publicUrl(row),
  }));
  return NextResponse.json({ created, count: created.length }, { status: 201 });
}
