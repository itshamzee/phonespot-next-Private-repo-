import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "laptops";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "8"), 16);

  const supabase = createServerClient();

  // For accessories tab, query sku_products
  if (tab === "accessories") {
    const { data } = await supabase
      .from("sku_products")
      .select("id, slug, title, brand, category, subcategory, selling_price, sale_price, images, status, is_active")
      .eq("category", "accessory")
      .eq("status", "published")
      .eq("is_active", true)
      .neq("subcategory", "spare-part")
      .order("created_at", { ascending: false })
      .limit(limit);

    const products = (data ?? []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      image: p.images?.[0] ?? null,
      minPrice: p.sale_price ?? p.selling_price,
      compareAtPrice: p.sale_price ? p.selling_price : null,
      deviceCount: 1,
      brand: p.brand ?? "",
      category: p.category ?? "accessory",
      inStock: true,
      href: `/tilbehoer/${p.subcategory ?? "covers"}/${p.slug}`,
      specifications: {},
      locations: [],
    }));

    return NextResponse.json(products, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // For device tabs, query product_templates + devices
  let categoryFilter: string;
  let brandFilter: string | null = null;

  switch (tab) {
    case "macbooks":
      categoryFilter = "laptop";
      brandFilter = "Apple";
      break;
    case "laptops":
      categoryFilter = "laptop";
      break;
    case "iphones":
      categoryFilter = "iphone";
      break;
    case "ipads":
      categoryFilter = "ipad";
      break;
    case "smartwatches":
      categoryFilter = "smartwatch";
      break;
    case "bestsellers":
      categoryFilter = "";
      break;
    default:
      categoryFilter = "laptop";
  }

  // Fetch templates — use correct column names
  let query = supabase
    .from("product_templates")
    .select("id, slug, display_name, brand, category, images, specifications, base_price_a, status")
    .eq("status", "published");

  if (categoryFilter) {
    query = query.eq("category", categoryFilter);
  }
  if (brandFilter) {
    query = query.ilike("brand", brandFilter);
  }
  if (tab === "laptops") {
    query = query.not("brand", "ilike", "Apple");
  }

  const { data: templates } = await query;

  if (!templates || templates.length === 0) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // Fetch device stats — use selling_price not price
  const templateIds = templates.map((t: any) => t.id);

  const { data: deviceStats } = await supabase
    .from("devices")
    .select("template_id, selling_price, status, location_id, locations(name, type)")
    .in("template_id", templateIds)
    .eq("status", "listed");

  // Group by template
  const statsByTemplate = new Map<
    string,
    {
      count: number;
      minPrice: number;
      locations: Map<string, { name: string; type: string; count: number }>;
    }
  >();

  for (const d of (deviceStats ?? []) as any[]) {
    const existing = statsByTemplate.get(d.template_id) ?? {
      count: 0,
      minPrice: Infinity,
      locations: new Map(),
    };
    existing.count++;
    if (d.selling_price < existing.minPrice) existing.minPrice = d.selling_price;

    const loc = d.locations as { name: string; type: string } | null;
    if (loc) {
      const locKey = loc.name;
      const locEntry = existing.locations.get(locKey) ?? {
        name: loc.name,
        type: loc.type,
        count: 0,
      };
      locEntry.count++;
      existing.locations.set(locKey, locEntry);
    }

    statsByTemplate.set(d.template_id, existing);
  }

  // Build response
  const products = templates
    .map((t: any) => {
      const stats = statsByTemplate.get(t.id);
      const minPrice = stats?.minPrice !== Infinity ? stats?.minPrice ?? null : null;
      return {
        id: t.id,
        slug: t.slug,
        title: t.display_name,
        image: t.images?.[0] ?? null,
        minPrice,
        compareAtPrice: t.base_price_a ?? null,
        deviceCount: stats?.count ?? 0,
        brand: t.brand ?? "",
        category: t.category ?? "",
        inStock: (stats?.count ?? 0) > 0,
        href: `/refurbished/${t.slug}`,
        specifications: t.specifications ?? {},
        locations: [...(stats?.locations?.values() ?? [])],
      };
    })
    .filter((p: any) => p.inStock)
    .sort((a: any, b: any) => {
      if (b.deviceCount !== a.deviceCount) return b.deviceCount - a.deviceCount;
      return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
    })
    .slice(0, limit);

  return NextResponse.json(products, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
