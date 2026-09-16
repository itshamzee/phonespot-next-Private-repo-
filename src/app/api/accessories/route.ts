import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicAccessory } from "@/lib/product/public-accessory";
import { SLUG_TO_ACCESSORY_CATEGORIES, ACCESSORY_CATEGORY_TO_SLUG, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { accessoryModelLabels, accessoryModelSlug, accessorySpotKind } from "@/lib/product/accessory-models";

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
    .select("id, title, slug, subcategory, brand, selling_price, always_in_stock, sale_price, images, compatible_models, variant_label, status, created_at, is_active, store_stock, online_stock")
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
    const modelSlug = accessoryModelSlug(model);
    const modelLabel = accessoryModelLabels([modelSlug])[0];
    const selectedDevice = TILBEHOER_DEVICES.find(device => device.slug === modelSlug);
    let templatesQuery = supabase
      .from("product_templates")
      .select("id")
      .ilike("model", modelLabel);
    if (selectedDevice) templatesQuery = templatesQuery.ilike("brand", selectedDevice.brand);
    const { data: templates, error: templateError } = await templatesQuery;

    const { data: compatible, error: compatibilityError } = await supabase
      .from("sku_products").select("id")
      .eq("status", "published").eq("is_active", true)
      .contains("compatible_models", [modelSlug]);
    if (templateError || compatibilityError) return NextResponse.json({ error: "Modeloplysninger kunne ikke hentes" }, { status: 503 });
    const ids = new Set<string>((compatible ?? []).map(p => p.id));

    if (templates?.length) {
      const { data: links, error: linkError } = await supabase
        .from("sku_product_templates")
        .select("sku_product_id")
        .in("template_id", templates.map((t) => t.id));

      if (linkError) return NextResponse.json({ error: "Modeloplysninger kunne ikke hentes" }, { status: 503 });
      for (const link of links ?? []) ids.add(link.sku_product_id);
    }
    if (!ids.size) return NextResponse.json([]);
    query = query.in("id", [...ids]);
  }

  const { data, error } = await query.limit(200);

  if (error || !data) {
    return NextResponse.json({ error: "Produkter kunne ikke hentes" }, { status: 503 });
  }

  const mapped: PublicAccessory[] = data.map(p => {
    const store = p.store_stock;
    const online = p.online_stock;
    return {
      id: p.id, name: p.title, slug: p.slug ?? null,
      category: ACCESSORY_CATEGORY_TO_SLUG[p.subcategory ?? ""] ?? p.subcategory ?? "other",
      brand: p.brand, price: p.selling_price, sale_price: p.sale_price ?? null,
      image_url: Array.isArray(p.images) ? p.images[0] ?? null : null,
      compatible_models: accessoryModelLabels(p.compatible_models),
      spotKind: accessorySpotKind(p),
      created_at: p.created_at,
      store_stock: store,
      online_stock: online,
      availability: store + online > 0 ? "in_stock" : p.always_in_stock ? "orderable" : "out_of_stock",
    };
  });
  return NextResponse.json(mapped);
}
