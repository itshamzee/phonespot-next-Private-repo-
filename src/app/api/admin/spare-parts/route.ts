import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const supabase = createServerClient();

  let query = supabase
    .from("sku_products")
    .select(
      "*, spare_part_categories!part_category_id(id, name, slug), spare_part_quality_tiers!quality_tier_id(id, name, slug, badge_color, badge_text_color)",
      { count: "exact" }
    )
    .eq("subcategory", "spare-part")
    .order("created_at", { ascending: false });

  const category = url.searchParams.get("category");
  if (category) query = query.eq("part_category_id", category);

  const brand = url.searchParams.get("brand");
  if (brand) query = query.ilike("device_brand", brand);

  const quality = url.searchParams.get("quality");
  if (quality) query = query.eq("quality_tier_id", quality);

  const status = url.searchParams.get("status");
  if (status) query = query.eq("status", status);

  const search = url.searchParams.get("search");
  if (search) {
    query = query.or(`title.ilike.%${search}%,device_model.ilike.%${search}%`);
  }

  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = 50;
  query = query.range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ products: data, total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServerClient();

  const {
    title, description, short_description,
    part_category_id, quality_tier_id, warranty_months,
    device_brand, device_series, device_model, device_model_codes,
    selling_price, cost_price, sale_price,
    color_variants, compatible_models, specifications,
    is_inquiry_only, always_in_stock, images, slug,
    meta_title, meta_description,
    stock_online, stock_store,
  } = body;

  if (!title || selling_price == null) {
    return NextResponse.json({ error: "title and selling_price required" }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from("sku_products")
    .insert({
      title,
      description: description || null,
      short_description: short_description || null,
      category: "spare-part",
      subcategory: "spare-part",
      part_category_id: part_category_id || null,
      quality_tier_id: quality_tier_id || null,
      warranty_months: warranty_months ?? null,
      device_brand: device_brand || null,
      device_series: device_series || null,
      device_model: device_model || null,
      device_model_codes: device_model_codes ?? [],
      selling_price: Number(selling_price),
      cost_price: cost_price ? Number(cost_price) : null,
      sale_price: sale_price ? Number(sale_price) : null,
      color_variants: color_variants ?? [],
      compatible_models: compatible_models ?? [],
      specifications: specifications ?? {},
      is_inquiry_only: is_inquiry_only ?? false,
      always_in_stock: always_in_stock ?? false,
      images: images ?? [],
      slug: slug || null,
      meta_title: meta_title || null,
      meta_description: meta_description || null,
      status: "published",
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (product && (stock_online != null || stock_store != null)) {
    const { data: locations } = await supabase.from("locations").select("id, type");
    const onlineLoc = locations?.find((l: { id: string; type: string }) => l.type === "online");
    const storeLoc = locations?.find((l: { id: string; type: string }) => l.type === "store");

    const stockRows = [];
    if (onlineLoc && stock_online != null) {
      stockRows.push({ product_id: product.id, location_id: onlineLoc.id, quantity: Number(stock_online) });
    }
    if (storeLoc && stock_store != null) {
      stockRows.push({ product_id: product.id, location_id: storeLoc.id, quantity: Number(stock_store) });
    }
    if (stockRows.length > 0) {
      await supabase.from("sku_stock").upsert(stockRows, { onConflict: "product_id,location_id" });
    }
  }

  revalidatePath("/reservedele", "layout");
  return NextResponse.json(product, { status: 201 });
}
