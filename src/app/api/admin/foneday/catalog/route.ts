import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/foneday/catalog
 * Browse the Foneday catalog with filters and pagination.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const modelBrand = url.searchParams.get("model_brand");
  const inStock = url.searchParams.get("in_stock");
  const search = url.searchParams.get("search");
  const linked = url.searchParams.get("linked");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  // If filtering by linked status, get the set of linked catalog IDs first
  // and apply the filter at the DB level (before pagination)
  let linkedCatalogIds: string[] | null = null;
  if (linked !== null) {
    const { data: links } = await supabase
      .from("foneday_sku_link")
      .select("foneday_catalog_id");
    linkedCatalogIds = (links ?? []).map((l) => l.foneday_catalog_id);
  }

  let query = supabase
    .from("foneday_catalog")
    .select("*", { count: "exact" })
    .is("missing_since", null)
    .order("title", { ascending: true });

  if (category) query = query.eq("category", category);
  if (modelBrand) query = query.eq("model_brand", modelBrand);
  if (inStock === "true") query = query.eq("in_stock", true);
  if (inStock === "false") query = query.eq("in_stock", false);
  if (search) query = query.or(`title.ilike.%${search}%,foneday_sku.ilike.%${search}%`);

  // Apply linked/unlinked filter at DB level before pagination
  if (linkedCatalogIds !== null) {
    if (linked === "true" && linkedCatalogIds.length > 0) {
      query = query.in("id", linkedCatalogIds);
    } else if (linked === "true" && linkedCatalogIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    } else if (linked === "false" && linkedCatalogIds.length > 0) {
      query = query.not("id", "in", `(${linkedCatalogIds.join(",")})`);
    }
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = data ?? [];

  // Get link info for returned rows
  const ids = results.map((r) => r.id);
  const { data: linkData } = await supabase
    .from("foneday_sku_link")
    .select("foneday_catalog_id, accessory_id, sku_product_id, use_type")
    .in("foneday_catalog_id", ids.length > 0 ? ids : ["__none__"]);

  const linkMap = new Map(
    (linkData ?? []).map((l) => [l.foneday_catalog_id, l])
  );

  const enriched = results.map((row) => ({
    ...row,
    link: linkMap.get(row.id) ?? null,
  }));

  return NextResponse.json({
    data: enriched,
    total: count ?? 0,
    page,
    limit,
  });
}
