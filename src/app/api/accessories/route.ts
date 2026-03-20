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

  // Query sku_products with category='accessory'
  let query = supabase
    .from("sku_products")
    .select("*")
    .eq("status", "published")
    .eq("category", "accessory")
    .order("created_at", { ascending: false });

  if (dbCategories && category !== "outlet") {
    query = query.in("subcategory", dbCategories);
  }
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (search) query = query.ilike("title", `%${search}%`);

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

  return NextResponse.json(data ?? []);
}
