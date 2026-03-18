import { createAdminClient } from "./admin";
import type { ProductTemplate, SkuProduct } from "./platform-types";

interface TemplateWithStock extends ProductTemplate {
  device_count: number;
  min_price: number | null;
  locations: { name: string; type: string; count: number }[];
}

// Get published templates with device count and min price
export async function getPublishedTemplates(
  category?: string,
  filters?: {
    brand?: string;
    storage?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }
): Promise<TemplateWithStock[]> {
  const supabase = createAdminClient();

  // Use RPC or manual join. Since Supabase doesn't support aggregated subqueries well,
  // fetch templates then enrich with device counts:
  let query = supabase
    .from("product_templates")
    .select("*")
    .eq("status", "published");

  if (category) query = query.eq("category", category);
  if (filters?.brand) query = query.eq("brand", filters.brand);
  if (filters?.storage) query = query.contains("storage_options", [filters.storage]);

  const { data: templates } = await query.order("display_name");
  if (!templates) return [];

  // Get device counts, min prices, and location info for all templates
  const { data: deviceStats } = await supabase
    .from("devices")
    .select("template_id, selling_price, location:locations(name, type)")
    .in("template_id", templates.map(t => t.id))
    .eq("status", "listed");

  const statsMap = new Map<string, {
    count: number;
    minPrice: number | null;
    locations: Map<string, { name: string; type: string; count: number }>;
  }>();

  for (const d of deviceStats || []) {
    const existing = statsMap.get(d.template_id) || { count: 0, minPrice: null, locations: new Map() };
    existing.count++;
    if (d.selling_price && (existing.minPrice === null || d.selling_price < existing.minPrice)) {
      existing.minPrice = d.selling_price;
    }
    const loc = d.location as unknown as { name: string; type: string } | null;
    if (loc) {
      const locEntry = existing.locations.get(loc.name) || { name: loc.name, type: loc.type, count: 0 };
      locEntry.count++;
      existing.locations.set(loc.name, locEntry);
    }
    statsMap.set(d.template_id, existing);
  }

  let results: TemplateWithStock[] = templates.map(t => {
    const stats = statsMap.get(t.id);
    return {
      ...t,
      device_count: stats?.count ?? 0,
      min_price: stats?.minPrice ?? t.base_price_a ?? null,
      locations: stats ? Array.from(stats.locations.values()) : [],
    };
  });

  if (filters?.inStock) results = results.filter(t => t.device_count > 0);
  if (filters?.minPrice) results = results.filter(t => (t.min_price ?? 0) >= filters.minPrice!);
  if (filters?.maxPrice) results = results.filter(t => (t.min_price ?? Infinity) <= filters.maxPrice!);

  return results;
}

export async function getTemplateBySlug(slug: string): Promise<ProductTemplate | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_templates")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}

export async function getAvailableDevices(templateId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("devices")
    .select("*, location:locations(id, name, type)")
    .eq("template_id", templateId)
    .eq("status", "listed")
    .order("selling_price", { ascending: true });
  return data || [];
}

// Get location-specific stock counts for a template
export async function getTemplateStockByLocation(templateId: string): Promise<
  { locationName: string; locationType: string; count: number }[]
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("devices")
    .select("location:locations(name, type)")
    .eq("template_id", templateId)
    .eq("status", "listed");

  if (!data) return [];

  const counts = new Map<string, { name: string; type: string; count: number }>();
  for (const d of data) {
    const loc = d.location as unknown as { name: string; type: string } | null;
    if (!loc) continue;
    const existing = counts.get(loc.name) || { name: loc.name, type: loc.type, count: 0 };
    existing.count++;
    counts.set(loc.name, existing);
  }

  return Array.from(counts.values()).map((v) => ({
    locationName: v.name,
    locationType: v.type,
    count: v.count,
  }));
}

export async function getPublishedSkuProducts(
  category?: string,
  templateId?: string
): Promise<SkuProduct[]> {
  const supabase = createAdminClient();

  if (templateId) {
    // Get SKU products linked to this template
    const { data: links } = await supabase
      .from("sku_product_templates")
      .select("sku_product_id")
      .eq("template_id", templateId);

    if (!links?.length) return [];

    const { data } = await supabase
      .from("sku_products")
      .select("*")
      .in("id", links.map(l => l.sku_product_id))
      .eq("status", "published");
    return data || [];
  }

  let query = supabase.from("sku_products").select("*").eq("status", "published");
  if (category) query = query.eq("category", category);

  const { data } = await query.order("title");
  return data || [];
}

export async function getSkuProductBySlug(slug: string): Promise<SkuProduct | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sku_products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}

export async function searchProducts(query: string): Promise<{
  templates: ProductTemplate[];
  skuProducts: SkuProduct[];
}> {
  const supabase = createAdminClient();
  const tsQuery = query.trim().split(/\s+/).join(" & ");

  const [templatesRes, skuRes] = await Promise.all([
    supabase
      .from("product_templates")
      .select("*")
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, { type: "plain", config: "danish" })
      .limit(20),
    supabase
      .from("sku_products")
      .select("*")
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, { type: "plain", config: "danish" })
      .limit(20),
  ]);

  return {
    templates: templatesRes.data || [],
    skuProducts: skuRes.data || [],
  };
}
