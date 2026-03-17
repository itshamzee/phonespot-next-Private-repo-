import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAccessory, slugify } from "@/lib/supabase/accessories";
import { mapCategory, parseCompatibleModels, cleanTitle } from "@/lib/foneday/mapper";

/**
 * POST /api/admin/foneday/link/bulk
 * Bulk link unlinked Foneday products matching a filter.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { filter, use_type, markup_percentage, store_id } = body;

  if (!use_type || !store_id) {
    return NextResponse.json({ error: "use_type and store_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existingLinks } = await supabase
    .from("foneday_sku_link")
    .select("foneday_catalog_id");
  const linkedIds = new Set((existingLinks ?? []).map((l) => l.foneday_catalog_id));

  let query = supabase
    .from("foneday_catalog")
    .select("*")
    .eq("in_stock", true)
    .is("missing_since", null);

  if (filter?.category) query = query.eq("category", filter.category);
  if (filter?.model_brand) query = query.eq("model_brand", filter.model_brand);
  if (filter?.quality) query = query.eq("quality", filter.quality);
  if (filter?.search) query = query.ilike("title", `%${filter.search}%`);

  const { data: products, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out already-linked, cap at 200 to avoid serverless timeout
  const unlinked = (products ?? []).filter((p) => !linkedIds.has(p.id)).slice(0, 200);

  let linked = 0;
  const errors: string[] = [];

  for (const product of unlinked) {
    try {
      let accessoryId: string | null = null;

      if (use_type === "retail") {
        const mappedCategory = await mapCategory(product.category);
        if (!mappedCategory) continue;

        const compatibleModels = parseCompatibleModels(product.suitable_for);
        const costDkk = product.price_dkk ?? 0;
        const markup = Number(markup_percentage) || 0;
        const sellingPrice = Math.round(costDkk * (1 + markup / 100));
        const name = cleanTitle(product.title);

        const accessory = await createAccessory({
          name,
          slug: slugify(name),
          category: mappedCategory as any,
          brand: product.product_brand ?? "NovaNL",
          compatible_models: compatibleModels,
          price: sellingPrice,
          cost_price: costDkk,
          sku: product.foneday_sku,
          ean: product.ean,
          image_url: null,
          description: null,
          online_stock: product.in_stock ? 99 : 0,
          store_stock: 0,
          store_id,
          status: "published",
        });
        accessoryId = accessory.id;
      }

      await supabase.from("foneday_sku_link").insert({
        foneday_catalog_id: product.id,
        accessory_id: accessoryId,
        use_type,
        markup_percentage: Number(markup_percentage) || 0,
      });
      linked++;
    } catch (err) {
      errors.push(`${product.foneday_sku}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ linked, skipped: unlinked.length - linked, errors });
}
