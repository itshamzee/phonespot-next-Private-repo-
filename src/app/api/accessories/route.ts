import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SLUG_TO_ACCESSORY_CATEGORIES, ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const brand = url.searchParams.get("brand");
  const model = url.searchParams.get("model");
  const search = url.searchParams.get("search");
  const type = url.searchParams.get("type");
  const caseType = url.searchParams.get("case_type");
  const protectorType = url.searchParams.get("protector_type");
  const inStore = url.searchParams.get("inStore") === "true";

  const supabase = createAdminClient();

  // Map tilbehoer URL slugs (e.g. "covers") to DB category values (e.g. "cover")
  const dbCategories = category ? SLUG_TO_ACCESSORY_CATEGORIES[category] ?? [category] : null;

  // Query sku_products with category='accessory', excluding spare-parts
  let query = supabase
    .from("sku_products")
    .select("id, title, slug, subcategory, brand, selling_price, cost_price, sale_price, images, barcode, ean, description, status, created_at, updated_at, is_active")
    .eq("status", "published")
    .eq("is_active", true)
    .eq("category", "accessory")
    .neq("subcategory", "spare-part")
    // Spot beskyttelsesglas lives on its own hub at /beskyttelsesglas — don't dump
    // its 70+ model-specific SKUs into the generic /tilbehoer grid.
    .neq("subcategory", "spot-glass")
    .order("created_at", { ascending: false });

  if (dbCategories && category !== "outlet") {
    query = query.in("subcategory", dbCategories);
  }
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (search) query = query.ilike("title", `%${search}%`);

  if (type) {
    const { TYPE_KEYWORDS } = await import("@/lib/tilbehoer-filter-config");
    const keywords = TYPE_KEYWORDS[type];
    if (keywords) {
      query = query.or(keywords.map((k) => `title.ilike.%${k}%`).join(","));
    }
  }

  // Attribute-based filters (JSONB attributes column)
  if (caseType) query = query.eq("attributes->>case_type", caseType);
  if (protectorType) query = query.eq("attributes->>protector_type", protectorType);

  // In-store filter: only show products that have sku_stock > 0
  // (dropshipped products without physical stock are excluded)
  if (inStore) {
    // For in-store, we need products with actual stock entries
    const { data: stockEntries } = await supabase
      .from("sku_stock")
      .select("product_id")
      .gt("quantity", 0);

    const inStockIds = (stockEntries ?? []).map((s) => s.product_id);
    if (inStockIds.length > 0) {
      query = query.in("id", inStockIds);
    } else {
      // No products in stock
      return NextResponse.json([]);
    }
  }

  // If model filter is set, check sku_product_templates for matches
  if (model) {
    const { data: templates } = await supabase
      .from("product_templates")
      .select("id")
      .ilike("display_name", `%${model}%`);

    if (templates?.length) {
      const { data: links } = await supabase
        .from("sku_product_templates")
        .select("sku_product_id")
        .in("template_id", templates.map((t) => t.id));

      const linkedIds = (links ?? []).map((l) => l.sku_product_id);
      if (linkedIds.length > 0) {
        query = query.in("id", linkedIds);
      } else {
        return NextResponse.json([]);
      }
    } else {
      return NextResponse.json([]);
    }
  }

  const { data, error } = await query.limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map sku_products rows to the Accessory shape the frontend expects
  const mapped = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.title,
    slug: p.slug ?? p.id,
    category: ACCESSORY_CATEGORY_TO_SLUG[p.subcategory] ?? p.subcategory ?? "other",
    brand: p.brand,
    compatible_models: [],
    price: p.selling_price ?? 0,
    cost_price: p.cost_price ?? 0,
    sale_price: p.sale_price ?? null,
    sku: p.barcode,
    ean: p.ean,
    image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
    description: p.description,
    online_stock: 99,
    store_stock: 0,
    store_id: null,
    status: p.status,
    created_at: p.created_at,
    updated_at: p.updated_at,
    _source: "sku_product",
  }));

  // Enrich with actual stock data from sku_stock
  const productIds = mapped.map((p: any) => p.id);
  if (productIds.length > 0) {
    const { data: stockData } = await supabase
      .from("sku_stock")
      .select("product_id, quantity")
      .in("product_id", productIds)
      .gt("quantity", 0);

    if (stockData) {
      const stockMap = new Map<string, number>();
      for (const s of stockData) {
        stockMap.set(s.product_id, (stockMap.get(s.product_id) ?? 0) + s.quantity);
      }
      for (const p of mapped) {
        const qty = stockMap.get(p.id) ?? 0;
        p.online_stock = qty > 0 ? qty : 99;
        p.store_stock = qty;
      }
    }
  }

  return NextResponse.json(mapped);
}
