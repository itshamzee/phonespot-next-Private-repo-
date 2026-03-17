import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAccessory, slugify } from "@/lib/supabase/accessories";
import { mapCategory, parseCompatibleModels, cleanTitle } from "@/lib/foneday/mapper";

/**
 * POST /api/admin/foneday/link
 * Link a Foneday product as a retail accessory or repair part.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { foneday_sku, use_type, markup_percentage, category_override, store_id } = body;

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

  let accessoryId: string | null = null;

  if (use_type === "retail") {
    const mappedCategory = category_override ?? await mapCategory(catalogProduct.category);
    if (!mappedCategory) {
      return NextResponse.json(
        { error: "Category maps to repair_part — use use_type='repair_part' instead" },
        { status: 400 }
      );
    }

    const compatibleModels = parseCompatibleModels(catalogProduct.suitable_for);
    const costDkk = catalogProduct.price_dkk ?? 0;
    const markup = Number(markup_percentage) || 0;
    const sellingPrice = Math.round(costDkk * (1 + markup / 100));
    const name = cleanTitle(catalogProduct.title);

    const accessory = await createAccessory({
      name,
      slug: slugify(name),
      category: mappedCategory as any,
      brand: catalogProduct.product_brand ?? "NovaNL",
      compatible_models: compatibleModels,
      price: sellingPrice,
      cost_price: costDkk,
      sku: catalogProduct.foneday_sku,
      ean: catalogProduct.ean,
      image_url: null,
      description: null,
      online_stock: catalogProduct.in_stock ? 99 : 0,
      store_stock: 0,
      store_id,
      status: "published",
    });

    accessoryId = accessory.id;
  }

  const { data: link, error: linkErr } = await supabase
    .from("foneday_sku_link")
    .insert({
      foneday_catalog_id: catalogProduct.id,
      accessory_id: accessoryId,
      use_type,
      markup_percentage: Number(markup_percentage) || 0,
    })
    .select()
    .single();

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({ link, accessory_id: accessoryId });
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

  if (link.accessory_id) {
    await supabase
      .from("accessories")
      .update({ status: "archived", online_stock: 0, updated_at: new Date().toISOString() })
      .eq("id", link.accessory_id);
  }

  await supabase.from("foneday_sku_link").delete().eq("id", link.id);

  return NextResponse.json({ success: true });
}
