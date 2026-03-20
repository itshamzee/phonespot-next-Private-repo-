import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCategory, cleanTitle } from "@/lib/foneday/mapper";
import { autoLinkTemplates } from "@/lib/foneday/sync";

/**
 * POST /api/admin/foneday/link/bulk
 * Bulk link unlinked Foneday products matching a filter.
 * Creates sku_products rows (not legacy accessories).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { filter, use_type, markup_percentage, store_id } = body;

  if (!use_type || !store_id) {
    return NextResponse.json({ error: "use_type and store_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existingLinks } = await supabase
    .from("foneday_sku_link")
    .select("foneday_catalog_id");
  const linkedIds = new Set((existingLinks ?? []).map((l) => l.foneday_catalog_id));

  let query = supabase
    .from("foneday_catalog")
    .select("*")
    .eq("in_stock", true)
    .is("missing_since", null);

  if (filter?.category) query = query.eq("category", filter.category);
  if (filter?.model_brand) query = query.eq("model_brand", filter.model_brand);
  if (filter?.quality) query = query.eq("quality", filter.quality);
  if (filter?.search) query = query.ilike("title", `%${filter.search}%`);

  const { data: products, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out already-linked, cap at 200 to avoid serverless timeout
  const unlinked = (products ?? []).filter((p) => !linkedIds.has(p.id)).slice(0, 200);

  let linked = 0;
  const errors: string[] = [];

  for (const catalog of unlinked) {
    try {
      // Map Foneday category to sku_products category/subcategory
      const rawCategory = await mapCategory(catalog.category);
      const isRepairPart = rawCategory === null;
      const skuCategory = "accessory";
      const skuSubcategory = isRepairPart
        ? "spare-part"
        : (use_type === "repair_part" ? "spare-part" : rawCategory);

      const costDkk = catalog.price_dkk ?? 0;
      const markup = Number(markup_percentage) || 0;
      const sellingPrice = Math.round(costDkk * (1 + markup / 100));
      const title = cleanTitle(catalog.title);
      const brand = catalog.product_brand ?? null;

      const { data: skuProduct, error: skuErr } = await supabase
        .from("sku_products")
        .insert({
          title,
          brand,
          category: skuCategory,
          subcategory: skuSubcategory,
          selling_price: sellingPrice,
          cost_price: costDkk,
          ean: catalog.ean ?? null,
          product_number: catalog.foneday_sku,
          images: catalog.image_url ? [catalog.image_url] : [],
          status: "published",
          is_active: true,
        })
        .select()
        .single();

      if (skuErr) {
        errors.push(`${catalog.foneday_sku}: ${skuErr.message}`);
        continue;
      }

      const { error: linkErr } = await supabase.from("foneday_sku_link").insert({
        foneday_catalog_id: catalog.id,
        sku_product_id: skuProduct.id,
        use_type,
        markup_percentage: markup,
        auto_sync_price: true,
      });

      if (linkErr) {
        errors.push(`${catalog.foneday_sku}: link error: ${linkErr.message}`);
        continue;
      }

      // Auto-populate sku_product_templates from Foneday model compatibility data
      await autoLinkTemplates(supabase, skuProduct.id, catalog.id);

      linked++;
    } catch (err) {
      errors.push(`${catalog.foneday_sku}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ linked, skipped: unlinked.length - linked, errors });
}
