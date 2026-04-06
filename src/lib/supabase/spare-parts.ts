import { createServerClient } from "./client";
import type {
  SparePartCategory,
  SparePartQualityTier,
  SparePartProduct,
} from "./platform-types";

// ============================================================
// Categories
// ============================================================

export async function getSparePartCategories(activeOnly = true): Promise<SparePartCategory[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("spare_part_categories")
    .select("*")
    .order("sort_order");
  if (activeOnly) query = query.eq("active", true);
  const { data } = await query;
  return (data as SparePartCategory[]) ?? [];
}

export async function getSparePartCategoryBySlug(slug: string): Promise<SparePartCategory | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("spare_part_categories")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  return (data as SparePartCategory | null) ?? null;
}

// ============================================================
// Quality Tiers
// ============================================================

export async function getQualityTiers(activeOnly = true): Promise<SparePartQualityTier[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("spare_part_quality_tiers")
    .select("*")
    .order("sort_order");
  if (activeOnly) query = query.eq("active", true);
  const { data } = await query;
  return (data as SparePartQualityTier[]) ?? [];
}

export async function getQualityTierBySlug(slug: string): Promise<SparePartQualityTier | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("spare_part_quality_tiers")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  return (data as SparePartQualityTier | null) ?? null;
}

// ============================================================
// Spare Part Products
// ============================================================

export interface SparePartFilters {
  categorySlug?: string;
  partCategorySlug?: string;
  brand?: string;
  series?: string;
  model?: string;
  qualityTierSlug?: string;
  color?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: "stock" | "price_asc" | "price_desc" | "newest";
  limit?: number;
  offset?: number;
}

export async function getSparePartProducts(
  filters: SparePartFilters = {}
): Promise<{ products: SparePartProduct[]; total: number }> {
  const supabase = createServerClient();

  // Determine sort order for the DB query
  const sortOption = filters.sort ?? "stock";
  let orderColumn = "created_at";
  let orderAscending = false;
  if (sortOption === "price_asc") {
    orderColumn = "selling_price";
    orderAscending = true;
  } else if (sortOption === "price_desc") {
    orderColumn = "selling_price";
    orderAscending = false;
  }

  let query = supabase
    .from("sku_products")
    .select(
      "*, spare_part_categories!part_category_id(id, name, slug, default_warranty_months), spare_part_quality_tiers!quality_tier_id(id, name, slug, badge_color, badge_text_color, description, short_description, default_warranty_months, specifications)",
      { count: "exact" }
    )
    .eq("subcategory", "spare-part")
    .eq("status", "published")
    .eq("is_active", true)
    .order(orderColumn, { ascending: orderAscending });

  if (filters.categorySlug) {
    const category = await getSparePartCategoryBySlug(filters.categorySlug);
    if (category) {
      query = query.eq("part_category_id", category.id);
    }
  }

  if (filters.partCategorySlug) {
    const category = await getSparePartCategoryBySlug(filters.partCategorySlug);
    if (category) {
      query = query.eq("part_category_id", category.id);
    }
  }

  if (filters.brand) {
    query = query.ilike("device_brand", filters.brand);
  }

  if (filters.series) {
    query = query.ilike("device_series", filters.series);
  }

  if (filters.model) {
    query = query.ilike("device_model", `%${filters.model}%`);
  }

  if (filters.qualityTierSlug) {
    const tier = await getQualityTierBySlug(filters.qualityTierSlug);
    if (tier) {
      query = query.eq("quality_tier_id", tier.id);
    }
  }

  if (filters.minPrice != null) {
    query = query.gte("selling_price", filters.minPrice);
  }
  if (filters.maxPrice != null) {
    query = query.lte("selling_price", filters.maxPrice);
  }

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,device_model.ilike.%${filters.search}%,device_brand.ilike.%${filters.search}%`
    );
  }

  // For stock-based sorting, fetch more to allow client-side re-sorting
  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;

  if (sortOption === "stock") {
    // Fetch a larger window so we can sort by stock and then paginate
    query = query.range(0, Math.max(offset + limit * 3 - 1, 499));
  } else {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, count } = await query;

  const productIds = (data ?? []).map((r: any) => r.id as string);

  // Enrich with stock totals
  let stockMap = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: stockRows } = await supabase
      .from("sku_stock")
      .select("product_id, quantity")
      .in("product_id", productIds)
      .gt("quantity", 0);

    for (const s of stockRows ?? []) {
      stockMap.set(
        s.product_id,
        (stockMap.get(s.product_id) ?? 0) + (s.quantity ?? 0),
      );
    }
  }

  let products = (data ?? []).map((row: any) => {
    const totalStock = stockMap.get(row.id) ?? 0;
    const inStock = row.always_in_stock || totalStock > 0;
    return {
      ...row,
      part_category: row.spare_part_categories ?? undefined,
      quality_tier: row.spare_part_quality_tiers ?? undefined,
      spare_part_categories: undefined,
      spare_part_quality_tiers: undefined,
      total_stock: totalStock,
      in_stock: inStock,
    };
  }) as SparePartProduct[];

  // If sorting by stock: in-stock first, then by created_at desc within each group
  if (sortOption === "stock") {
    products.sort((a: any, b: any) => {
      if (a.in_stock && !b.in_stock) return -1;
      if (!a.in_stock && b.in_stock) return 1;
      // Within same stock group, sort by created_at desc
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    // Apply pagination after sorting
    products = products.slice(offset, offset + limit);
  }

  return { products, total: count ?? 0 };
}

export async function getSparePartBySlug(slug: string): Promise<SparePartProduct | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("sku_products")
    .select(
      "*, spare_part_categories!part_category_id(*), spare_part_quality_tiers!quality_tier_id(*)"
    )
    .eq("slug", slug)
    .eq("subcategory", "spare-part")
    .eq("status", "published")
    .eq("is_active", true)
    .single();

  if (!data) return null;

  return {
    ...data,
    part_category: (data as any).spare_part_categories ?? undefined,
    quality_tier: (data as any).spare_part_quality_tiers ?? undefined,
    spare_part_categories: undefined,
    spare_part_quality_tiers: undefined,
  } as SparePartProduct;
}

export async function getQualityAlternatives(
  partCategoryId: string,
  deviceModel: string,
  excludeProductId?: string
): Promise<SparePartProduct[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("sku_products")
    .select(
      "*, spare_part_quality_tiers!quality_tier_id(id, name, slug, badge_color, badge_text_color, short_description, default_warranty_months)"
    )
    .eq("part_category_id", partCategoryId)
    .ilike("device_model", deviceModel)
    .eq("subcategory", "spare-part")
    .eq("status", "published")
    .eq("is_active", true)
    .order("selling_price", { ascending: true });

  if (excludeProductId) {
    query = query.neq("id", excludeProductId);
  }

  const { data } = await query;

  return (data ?? []).map((row: any) => ({
    ...row,
    quality_tier: row.spare_part_quality_tiers ?? undefined,
    spare_part_quality_tiers: undefined,
  })) as SparePartProduct[];
}

export async function getSparePartFilterOptions(): Promise<{
  brands: string[];
  series: Array<{ brand: string; series: string[] }>;
  models: Array<{ brand: string; series: string | null; model: string }>;
  colors: string[];
}> {
  const supabase = createServerClient();

  const { data: brandData } = await supabase
    .from("sku_products")
    .select("device_brand")
    .eq("subcategory", "spare-part")
    .eq("status", "published")
    .eq("is_active", true)
    .not("device_brand", "is", null);

  const brands = [
    ...new Set((brandData ?? []).map((r: any) => r.device_brand).filter(Boolean)),
  ].sort() as string[];

  const { data: seriesData } = await supabase
    .from("sku_products")
    .select("device_brand, device_series")
    .eq("subcategory", "spare-part")
    .eq("status", "published")
    .eq("is_active", true)
    .not("device_series", "is", null);

  const seriesMap = new Map<string, Set<string>>();
  for (const row of seriesData ?? []) {
    const brand = (row as any).device_brand as string;
    const s = (row as any).device_series as string;
    if (!brand || !s) continue;
    if (!seriesMap.has(brand)) seriesMap.set(brand, new Set());
    seriesMap.get(brand)!.add(s);
  }
  const series = [...seriesMap.entries()].map(([brand, seriesSet]) => ({
    brand,
    series: [...seriesSet].sort(),
  }));

  const { data: modelData } = await supabase
    .from("sku_products")
    .select("device_brand, device_series, device_model")
    .eq("subcategory", "spare-part")
    .eq("status", "published")
    .eq("is_active", true)
    .not("device_model", "is", null);

  const modelMap = new Map<string, { brand: string; series: string | null; model: string }>();
  for (const row of modelData ?? []) {
    const brand = (row as any).device_brand as string;
    const s = ((row as any).device_series as string | null) ?? null;
    const model = (row as any).device_model as string;
    const key = `${brand}|${s ?? ""}|${model}`;
    if (!modelMap.has(key)) {
      modelMap.set(key, { brand, series: s, model });
    }
  }
  const models = [...modelMap.values()].sort(
    (a, b) =>
      a.brand.localeCompare(b.brand) ||
      (a.series ?? "").localeCompare(b.series ?? "") ||
      a.model.localeCompare(b.model)
  );

  const { data: colorData } = await supabase
    .from("sku_products")
    .select("color_variants")
    .eq("subcategory", "spare-part")
    .eq("status", "published")
    .eq("is_active", true);

  const colorSet = new Set<string>();
  for (const row of colorData ?? []) {
    for (const cv of ((row as any).color_variants as any[]) ?? []) {
      if (cv.color_name) colorSet.add(cv.color_name as string);
    }
  }
  const colors = [...colorSet].sort();

  return { brands, series, models, colors };
}

export function getEffectiveWarranty(product: SparePartProduct): number {
  if (product.warranty_months != null) return product.warranty_months;
  if (product.part_category?.default_warranty_months != null)
    return product.part_category.default_warranty_months;
  if (product.quality_tier?.default_warranty_months != null)
    return product.quality_tier.default_warranty_months;
  return 12;
}
