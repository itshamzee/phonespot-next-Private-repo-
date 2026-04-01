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

    const products = (data ?? []).map((p) => ({
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
      // Exclude Apple (those go to macbooks tab)
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
      categoryFilter = ""; // all categories
      break;
    default:
      categoryFilter = "laptop";
  }

  // Fetch templates
  let query = supabase
    .from("product_templates")
    .select("id, slug, title, brand, category, image, specifications, compare_at_price, status")
    .eq("status", "published");

  if (categoryFilter) {
    query = query.eq("category", categoryFilter);
  }
  if (brandFilter) {
    query = query.ilike("brand", brandFilter);
  }
  // For laptops tab (non-Apple), exclude Apple
  if (tab === "laptops") {
    query = query.not("brand", "ilike", "Apple");
  }

  const { data: templates } = await query;

  if (!templates || templates.length === 0) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // Fetch device stats for all templates
  const templateIds = templates.map((t) => t.id);

  const { data: deviceStats } = await supabase
    .from("devices")
    .select("template_id, price, status, location_id, locations(name, type)")
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

  for (const d of deviceStats ?? []) {
    const existing = statsByTemplate.get(d.template_id) ?? {
      count: 0,
      minPrice: Infinity,
      locations: new Map(),
    };
    existing.count++;
    if (d.price < existing.minPrice) existing.minPrice = d.price;

    const loc = (d as { locations?: { name: string; type: string } | null }).locations;
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

  // Build response, sorted by stock then price
  const products = templates
    .map((t) => {
      const stats = statsByTemplate.get(t.id);
      return {
        id: t.id,
        slug: t.slug,
        title: t.title,
        image: t.image ?? null,
        minPrice: stats?.minPrice ?? null,
        compareAtPrice: t.compare_at_price ?? null,
        deviceCount: stats?.count ?? 0,
        brand: t.brand ?? "",
        category: t.category ?? "",
        inStock: (stats?.count ?? 0) > 0,
        href: `/refurbished/${t.slug}`,
        specifications: t.specifications ?? {},
        locations: [...(stats?.locations?.values() ?? [])],
      };
    })
    .filter((p) => p.inStock) // Only show in-stock products
    .sort((a, b) => {
      // Sort by device count desc, then price asc
      if (b.deviceCount !== a.deviceCount) return b.deviceCount - a.deviceCount;
      return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
    })
    .slice(0, limit);

  return NextResponse.json(products, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
