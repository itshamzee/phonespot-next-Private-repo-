import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicAccessory, AccessoryStockRow } from "@/lib/product/public-accessory";
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
    .select("id, title, slug, subcategory, brand, selling_price, always_in_stock, sale_price, images, barcode, ean, description, status, created_at, updated_at, is_active")
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

  let storeStock: AccessoryStockRow[] | null = null;
  if (inStore) {
    const { data, error } = await supabase.from("sku_stock")
      .select("product_id, quantity, location:locations(type)").gt("quantity", 0);
    if (error || !data) return NextResponse.json({ error: "Lagerstatus kunne ikke hentes" }, { status: 503 });
    storeStock = data as unknown as AccessoryStockRow[];
    const ids = [...new Set(storeStock.filter(s => s.quantity > 0 && s.location?.type === "store").map(s => s.product_id))];
    if (!ids.length) return NextResponse.json([]);
    query = query.in("id", ids);
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

  const productIds = (data ?? []).map(p => p.id);
  const stockResult = storeStock !== null ? { data: storeStock, error: null }
    : productIds.length ? await supabase.from("sku_stock")
      .select("product_id, quantity, location:locations(type)").in("product_id", productIds)
    : { data: [], error: null };
  const stockKnown = !stockResult.error && stockResult.data !== null;
  const stockRows = (stockResult.data ?? []) as unknown as AccessoryStockRow[];
  const mapped: PublicAccessory[] = (data ?? []).map(p => {
    const rows = stockRows.filter(row => row.product_id === p.id);
    const store = rows.filter(row => row.location?.type === "store").reduce((n, row) => n + Math.max(0, row.quantity), 0);
    const online = rows.filter(row => row.location?.type !== "store").reduce((n, row) => n + Math.max(0, row.quantity), 0);
    return {
      id: p.id, name: p.title, slug: p.slug ?? null,
      category: ACCESSORY_CATEGORY_TO_SLUG[p.subcategory ?? ""] ?? p.subcategory ?? "other",
      brand: p.brand, price: p.selling_price, sale_price: p.sale_price ?? null,
      image_url: Array.isArray(p.images) ? p.images[0] ?? null : null,
      created_at: p.created_at,
      store_stock: stockKnown ? store : null,
      online_stock: stockKnown ? online : null,
      availability: stockKnown && store + online > 0 ? "in_stock" : p.always_in_stock ? "orderable" : stockKnown ? "out_of_stock" : "unknown",
    };
  });
  return NextResponse.json(inStore ? mapped.filter(p => (p.store_stock ?? 0) > 0) : mapped);
}
