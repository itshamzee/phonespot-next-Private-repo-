import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAccessoryUpdate, modelsForProduct, planTemplateLinks, stockUpserts } from "@/lib/admin/products/update";
import type { LocationRow } from "@/lib/admin/products/create";
import { ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";

type Params = { params: Promise<{ id: string }> };

type TemplateLinkRow = { template_id: string; product_templates: { display_name: string | null } | null };

function publicUrl(row: { slug: string | null; subcategory: string | null }): string | null {
  if (!row.slug) return null;
  return `/tilbehoer/${ACCESSORY_CATEGORY_TO_SLUG[row.subcategory ?? ""] ?? "covers"}/${row.slug}`;
}

/**
 * GET /api/admin/products/[id] — alt redigér-formularen skal bruge i ét kald:
 * produktet, lager pr. lokation og modellerne samlet fra begge kilder
 * (compatible_models og skabelon-koblinger).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = createAdminClient();
  const [{ data: product, error }, { data: stock }, { data: links }] = await Promise.all([
    supabase.from("sku_products").select("*").eq("id", id).maybeSingle(),
    supabase.from("sku_stock").select("quantity, location:locations(name, type)").eq("product_id", id),
    supabase.from("sku_product_templates").select("template_id, product_templates(display_name)").eq("sku_product_id", id),
  ]);
  if (error) return NextResponse.json({ error: "Produktet kunne ikke læses" }, { status: 503 });
  if (!product) return NextResponse.json({ error: "Produktet findes ikke" }, { status: 404 });

  const stockByLocation: Record<string, number> = {};
  for (const row of (stock ?? []) as unknown as { quantity: number; location: { name: string | null; type: string | null } | null }[]) {
    const key = row.location?.type === "online" ? "online" : row.location?.name?.toLowerCase();
    if (key) stockByLocation[key] = (stockByLocation[key] ?? 0) + Math.max(0, row.quantity ?? 0);
  }
  const templateNames = ((links ?? []) as unknown as TemplateLinkRow[]).map((l) => l.product_templates?.display_name).filter((n): n is string => Boolean(n));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { search_vector, ...rest } = product as Record<string, unknown>;

  return NextResponse.json({
    product: rest,
    stock: stockByLocation,
    models: modelsForProduct(product.compatible_models, templateNames),
    url: product.status === "published" ? publicUrl(product) : null,
  });
}

const putSchema = z.object({
  title: z.string().min(1),
  subcategory: z.string().min(1),
  brand: z.string().nullable().optional(),
  models: z.array(z.string()).default([]),
  sellingPrice: z.number().int(),
  salePrice: z.number().int().nullable().optional(),
  costPrice: z.number().int().nullable().optional(),
  ean: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  highlights: z.array(z.string()).max(8).optional(),
  attributes: z.record(z.string(), z.string().nullable().optional()).optional(),
  alwaysInStock: z.boolean().optional(),
  status: z.enum(["published", "draft"]).optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  stock: z
    .object({
      online: z.number().int().min(0).nullable().optional(),
      stores: z.record(z.string(), z.number().int().min(0).nullable().optional()).optional(),
    })
    .optional(),
});

/**
 * PUT /api/admin/products/[id] — gemmer hele redigér-formularen for et
 * tilbehørsprodukt: felter, modeller (begge kilder holdes i takt) og lager.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige felter", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  const { stock, ...input } = parsed.data;

  const supabase = createAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("sku_products")
    .select("id, category, subcategory, slug, attributes, specifications")
    .eq("id", id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "Produktet kunne ikke læses" }, { status: 503 });
  if (!existing) return NextResponse.json({ error: "Produktet findes ikke" }, { status: 404 });

  let row: Record<string, unknown>;
  try {
    row = buildAccessoryUpdate(existing, input);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Ugyldige værdier" }, { status: 400 });
  }

  const { data: saved, error: saveError } = await supabase
    .from("sku_products")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, slug, subcategory, status")
    .maybeSingle();
  if (saveError || !saved) {
    const duplicate = saveError?.code === "23505";
    return NextResponse.json(
      { error: duplicate ? "Stregkoden (EAN) bruges allerede af et andet produkt" : "Ændringerne blev ikke gemt" },
      { status: duplicate ? 409 : 500 },
    );
  }

  // Produktet er gemt. Modeller og lager er følgeskrivninger: fejler de, siger vi det, men ruller ikke tilbage.
  const warnings: string[] = [];

  const [{ data: links }, { data: templates }] = await Promise.all([
    supabase.from("sku_product_templates").select("template_id, product_templates(display_name)").eq("sku_product_id", id),
    supabase.from("product_templates").select("id, display_name"),
  ]);
  const plan = planTemplateLinks(
    ((links ?? []) as unknown as TemplateLinkRow[]).map((l) => ({ template_id: l.template_id, display_name: l.product_templates?.display_name ?? null })),
    input.models,
    (templates ?? []) as { id: string; display_name: string | null }[],
  );
  if (plan.remove.length) {
    const { error } = await supabase.from("sku_product_templates").delete().eq("sku_product_id", id).in("template_id", plan.remove);
    if (error) warnings.push("De fravalgte modeller kunne ikke fjernes helt.");
  }
  if (plan.add.length) {
    const { error } = await supabase.from("sku_product_templates").insert(plan.add.map((template_id) => ({ sku_product_id: id, template_id })));
    if (error) warnings.push("De valgte modeller kunne ikke kobles helt.");
  }

  if (stock && !input.alwaysInStock) {
    const { data: locations } = await supabase.from("locations").select("id, name, type");
    const rows = stockUpserts((locations ?? []) as LocationRow[], stock).map((r) => ({ product_id: id, ...r }));
    if (rows.length) {
      const { error } = await supabase.from("sku_stock").upsert(rows, { onConflict: "product_id,location_id" });
      if (error) warnings.push("Lageret kunne ikke gemmes.");
    }
  }

  revalidatePath("/tilbehoer", "layout");
  return NextResponse.json({ ...saved, url: saved.status === "published" ? publicUrl(saved) : null, warnings });
}

const patchSchema = z
  .object({
    status: z.enum(["published", "draft"]).optional(),
    is_active: z.boolean().optional(),
    selling_price: z.number().int().positive().optional(),
    sale_price: z.number().int().positive().nullable().optional(),
    always_in_stock: z.boolean().optional(),
    /** Fx et fritlagt hovedbillede sat ind i stedet for leverandørens. */
    images: z.array(z.string().url()).max(12).optional(),
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
    .select("id, status, is_active, selling_price, sale_price, always_in_stock, category, images")
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
