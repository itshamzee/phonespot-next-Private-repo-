import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCategory, cleanTitle } from "@/lib/foneday/mapper";
import { autoLinkTemplates } from "@/lib/foneday/sync";

/**
 * POST /api/admin/foneday/link
 * Link a Foneday product as a retail accessory or repair part.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { foneday_sku, use_type, markup_percentage, custom_price_oere, auto_sync_price, category_override, store_id } = body;

  if (!foneday_sku || !use_type || !store_id) {
    return NextResponse.json(
      { error: "foneday_sku, use_type, and store_id are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: catalogProduct, error: catErr } = await supabase
    .from("foneday_catalog")
    .select("*")
    .eq("foneday_sku", foneday_sku)
    .single();

  if (catErr || !catalogProduct) {
    return NextResponse.json({ error: "Foneday product not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("foneday_sku_link")
    .select("id")
    .eq("foneday_catalog_id", catalogProduct.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Product already linked" }, { status: 409 });
  }

  let skuProductId: string | null = null;

  // Map Foneday category to sku_products category/subcategory
  const rawCategory = category_override ?? await mapCategory(catalogProduct.category);
  const isRepairPart = rawCategory === null;
  const skuCategory = "accessory";
  const skuSubcategory = isRepairPart
    ? "spare-part"
    : (use_type === "repair_part" ? "spare-part" : rawCategory);
  // rawCategory will be e.g. "cover", "charger", "cable", "audio", "screen_protector", "other"

  const costDkk = catalogProduct.price_dkk ?? 0;
  const markup = Number(markup_percentage) || 0;
  const sellingPrice = custom_price_oere != null
    ? Number(custom_price_oere)
    : Math.round(costDkk * (1 + markup / 100));
  const title = cleanTitle(catalogProduct.title);
  const brand = catalogProduct.product_brand ?? null;

  const { data: skuProduct, error: skuErr } = await supabase
    .from("sku_products")
    .insert({
      title,
      brand,
      category: skuCategory,
      subcategory: skuSubcategory,
      selling_price: sellingPrice,
      cost_price: costDkk,
      ean: catalogProduct.ean ?? null,
      product_number: catalogProduct.foneday_sku,
      images: catalogProduct.image_url ? [catalogProduct.image_url] : [],
      status: "published",
      is_active: true,
    })
    .select()
    .single();

  if (skuErr) {
    return NextResponse.json({ error: skuErr.message }, { status: 500 });
  }

  skuProductId = skuProduct.id;

  const { data: link, error: linkErr } = await supabase
    .from("foneday_sku_link")
    .insert({
      foneday_catalog_id: catalogProduct.id,
      sku_product_id: skuProductId,
      use_type,
      markup_percentage: Number(markup_percentage) || 0,
      auto_sync_price: auto_sync_price !== false,
    })
    .select()
    .single();

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  // Auto-populate sku_product_templates from Foneday model compatibility data.
  if (skuProductId) {
    await autoLinkTemplates(supabase, skuProductId, catalogProduct.id);
  }

  return NextResponse.json({ link, sku_product_id: skuProductId });
}

/**
 * DELETE /api/admin/foneday/link?foneday_sku=XXX
 * Unlink a Foneday product. Archives the accessory.
 */
export async function DELETE(req: NextRequest) {
  const foneday_sku = new URL(req.url).searchParams.get("foneday_sku");

  if (!foneday_sku) {
    return NextResponse.json({ error: "foneday_sku query param required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: catalog } = await supabase
    .from("foneday_catalog")
    .select("id")
    .eq("foneday_sku", foneday_sku)
    .single();

  if (!catalog) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: link } = await supabase
    .from("foneday_sku_link")
    .select("*")
    .eq("foneday_catalog_id", catalog.id)
    .single();

  if (!link) {
    return NextResponse.json({ error: "Not linked" }, { status: 404 });
  }

  if (link.sku_product_id) {
    await supabase
      .from("sku_products")
      .update({ status: "draft", is_active: false })
      .eq("id", link.sku_product_id);
  }

  await supabase.from("foneday_sku_link").delete().eq("id", link.id);

  return NextResponse.json({ success: true });
}
