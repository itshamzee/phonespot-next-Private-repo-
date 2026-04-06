import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("sku_products")
    .select(
      "*, spare_part_categories!part_category_id(*), spare_part_quality_tiers!quality_tier_id(*)"
    )
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: stock } = await supabase
    .from("sku_stock")
    .select("*, locations(type, name)")
    .eq("product_id", id);

  return NextResponse.json({ ...data, stock: stock ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const supabase = createServerClient();

  const allowed = [
    "title", "description", "short_description", "part_category_id",
    "quality_tier_id", "warranty_months", "device_brand", "device_series",
    "device_model", "device_model_codes", "selling_price", "cost_price",
    "sale_price", "color_variants", "compatible_models", "specifications",
    "is_inquiry_only", "always_in_stock", "images", "slug", "meta_title",
    "meta_description", "status", "is_active", "b2b_price",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (["selling_price", "cost_price", "sale_price", "b2b_price"].includes(key)) {
        updates[key] = body[key] != null ? Number(body[key]) : null;
      } else {
        updates[key] = body[key];
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from("sku_products").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Stock update: accept stock_online, stock_slagelse, stock_vejle (by location name)
  // Also keep legacy stock_store (maps to first store location) for backwards compat
  const stockFields: Record<string, string> = {
    stock_online: "Online",
    stock_slagelse: "Slagelse",
    stock_vejle: "Vejle",
  };
  const hasStockUpdate = Object.keys(stockFields).some((k) => k in body) || "stock_store" in body;

  if (hasStockUpdate) {
    const { data: locations } = await supabase.from("locations").select("id, name, type");

    const stockRows: { product_id: string; location_id: string; quantity: number }[] = [];

    for (const [field, locName] of Object.entries(stockFields)) {
      if (field in body) {
        const loc = locations?.find(
          (l: { id: string; name: string; type: string }) =>
            l.name.toLowerCase() === locName.toLowerCase(),
        );
        if (loc) {
          stockRows.push({ product_id: id, location_id: loc.id, quantity: Number(body[field]) });
        }
      }
    }

    // Legacy: stock_store → first store location not already covered
    if ("stock_store" in body) {
      const alreadyUpdatedIds = new Set(stockRows.map((r) => r.location_id));
      const storeLoc = locations?.find(
        (l: { id: string; name: string; type: string }) =>
          l.type === "store" && !alreadyUpdatedIds.has(l.id),
      );
      if (storeLoc) {
        stockRows.push({ product_id: id, location_id: storeLoc.id, quantity: Number(body.stock_store) });
      }
    }

    if (stockRows.length > 0) {
      await supabase.from("sku_stock").upsert(stockRows, { onConflict: "product_id,location_id" });
    }
  }

  revalidatePath("/reservedele", "layout");
  const { data } = await supabase.from("sku_products").select("*").eq("id", id).single();
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("sku_products")
    .update({ status: "draft", is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/reservedele", "layout");
  return NextResponse.json({ success: true });
}
