import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicAccessory } from "@/lib/product/public-accessory";
import { SLUG_TO_ACCESSORY_CATEGORIES } from "@/lib/tilbehoer-config";
import { PUBLIC_ACCESSORY_COLUMNS, findAccessoryIdsForModel, toPublicAccessory } from "@/lib/product/model-accessories";

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
    .from("checkout_sku_inventory")
    .select(PUBLIC_ACCESSORY_COLUMNS)
    .eq("status", "published")
    .eq("is_active", true)
    .eq("category", "accessory")
    .neq("subcategory", "spare-part")
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

  if (inStore) query = query.gt("store_stock", 0);

  // Both compatibility sources are used: template links and model-specific SKUs.
  if (model) {
    let ids: Set<string>;
    try {
      ids = await findAccessoryIdsForModel(supabase, model);
    } catch {
      return NextResponse.json({ error: "Modeloplysninger kunne ikke hentes" }, { status: 503 });
    }
    if (!ids.size) return NextResponse.json([]);
    query = query.in("id", [...ids]);
  }

  const { data, error } = await query.limit(200);

  if (error || !data) {
    return NextResponse.json({ error: "Produkter kunne ikke hentes" }, { status: 503 });
  }

  const mapped: PublicAccessory[] = data.map(toPublicAccessory);
  return NextResponse.json(mapped);
}
