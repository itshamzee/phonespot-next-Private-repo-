import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uniqueSlugs } from "@/lib/admin/products/create";

type Params = { params: Promise<{ id: string }> };

/** Felter der aldrig kopieres: identitet, tidsstempler og alt der skal være unikt. */
const NEVER_COPY = new Set(["id", "created_at", "updated_at", "search_vector", "ean", "barcode", "product_number", "slug"]);

/**
 * POST /api/admin/products/[id]/duplicate — kopierer et produkt som kladde med
 * samme billeder, priser, attributter og modeller, plus dets skabelonlinks.
 * Lager kopieres ikke. Titlen får " (kopi)", så den er let at finde og rette.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: source, error } = await supabase.from("sku_products").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Produktet kunne ikke læses" }, { status: 503 });
  if (!source) return NextResponse.json({ error: "Produktet findes ikke" }, { status: 404 });

  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) if (!NEVER_COPY.has(key)) copy[key] = value;
  copy.title = `${source.title} (kopi)`;
  copy.status = "draft";

  const base = source.slug ? `${source.slug}-kopi` : null;
  if (base) {
    const { data: existing } = await supabase.from("sku_products").select("slug").like("slug", `${base}%`);
    copy.slug = uniqueSlugs([base], new Set((existing ?? []).map((r) => r.slug as string)))[0];
  } else {
    copy.slug = null;
  }

  const { data: created, error: insertError } = await supabase
    .from("sku_products")
    .insert(copy)
    .select("id, title, slug")
    .single();
  if (insertError || !created) return NextResponse.json({ error: insertError?.message ?? "Kopien blev ikke oprettet" }, { status: 500 });

  const { data: links } = await supabase.from("sku_product_templates").select("template_id").eq("sku_product_id", id);
  if (links?.length) {
    await supabase.from("sku_product_templates").insert(links.map((l) => ({ sku_product_id: created.id, template_id: l.template_id })));
  }

  return NextResponse.json(created, { status: 201 });
}
