import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SLUG_TO_ACCESSORY_CATEGORIES } from "@/lib/tilbehoer-config";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const brand = url.searchParams.get("brand");
  const model = url.searchParams.get("model");
  const search = url.searchParams.get("search");
  const inStore = url.searchParams.get("inStore") === "true";

  const supabase = createAdminClient();

  // Map tilbehoer URL slugs (e.g. "covers") to DB category values (e.g. "cover")
  const dbCategories = category ? SLUG_TO_ACCESSORY_CATEGORIES[category] ?? [category] : null;

  // ── 1. Query the legacy accessories table ──
  let legacyQuery = supabase
    .from("accessories")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (dbCategories) legacyQuery = legacyQuery.in("category", dbCategories);
  if (brand) legacyQuery = legacyQuery.ilike("brand", `%${brand}%`);
  if (model) legacyQuery = legacyQuery.contains("compatible_models", [model]);
  if (search) legacyQuery = legacyQuery.ilike("name", `%${search}%`);
  if (inStore) legacyQuery = legacyQuery.or("store_stock.gt.0,always_in_stock.eq.true");

  // ── 2. Query sku_products with category='accessory' (Foneday-linked products) ──
  let skuQuery = supabase
    .from("sku_products")
    .select("*")
    .eq("status", "published")
    .eq("category", "accessory")
    .order("created_at", { ascending: false });

  if (brand) skuQuery = skuQuery.ilike("brand", `%${brand}%`);
  if (search) skuQuery = skuQuery.ilike("title", `%${search}%`);
  // Note: subcategory filtering for sku_products if category slug provided
  if (dbCategories && category !== "outlet") {
    // Keep subcategory IS NULL fallback so legacy untagged products still show until backfill migration runs
    skuQuery = skuQuery.or(`subcategory.in.(${dbCategories.join(",")}),subcategory.is.null`);
  }

  const [legacyResult, skuResult] = await Promise.all([
    legacyQuery.limit(100),
    skuQuery.limit(100),
  ]);

  if (legacyResult.error) {
    return NextResponse.json({ error: legacyResult.error.message }, { status: 500 });
  }

  // ── 3. Normalize sku_products into the Accessory shape ──
  const skuProducts = (skuResult.data ?? []).map((sp) => ({
    id: sp.id,
    name: sp.title,
    slug: sp.slug ?? sp.id,
    category: sp.subcategory ?? "other",
    brand: sp.brand,
    compatible_models: [] as string[],
    price: sp.sale_price ?? sp.selling_price,
    cost_price: sp.cost_price ?? 0,
    sku: sp.product_number,
    ean: sp.ean,
    image_url: sp.images?.[0] ?? null,
    description: sp.description,
    online_stock: 99, // Foneday products are dropshipped, always available
    store_stock: 0,
    store_id: "",
    status: sp.status,
    created_at: sp.created_at,
    updated_at: sp.updated_at,
    always_in_stock: true,
    _source: "sku_product" as const,
  }));

  // ── 4. If model filter is set, also check sku_product_templates for matches ──
  let skuFilteredByModel = skuProducts;
  if (model && skuProducts.length > 0) {
    // Find templates matching the model name
    const { data: templates } = await supabase
      .from("product_templates")
      .select("id")
      .ilike("display_name", `%${model}%`);

    if (templates?.length) {
      const { data: links } = await supabase
        .from("sku_product_templates")
        .select("sku_product_id")
        .in("template_id", templates.map((t) => t.id));

      const linkedIds = new Set((links ?? []).map((l) => l.sku_product_id));
      skuFilteredByModel = skuProducts.filter((sp) => linkedIds.has(sp.id));
    } else {
      skuFilteredByModel = [];
    }
  }

  // ── 5. Merge results ──
  // When "in store" filter is active, exclude dropshipped sku_products
  const skuToInclude = inStore ? [] : skuFilteredByModel;
  const merged = [...(legacyResult.data || []), ...skuToInclude];

  return NextResponse.json(merged);
}
