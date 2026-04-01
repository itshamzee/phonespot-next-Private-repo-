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
    "meta_description", "status", "is_active",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (["selling_price", "cost_price", "sale_price"].includes(key)) {
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

  if ("stock_online" in body || "stock_store" in body) {
    const { data: locations } = await supabase.from("locations").select("id, type");
    const onlineLoc = locations?.find((l: { id: string; type: string }) => l.type === "online");
    const storeLoc = locations?.find((l: { id: string; type: string }) => l.type === "store");

    const stockRows = [];
    if (onlineLoc && "stock_online" in body) {
      stockRows.push({ product_id: id, location_id: onlineLoc.id, quantity: Number(body.stock_online) });
    }
    if (storeLoc && "stock_store" in body) {
      stockRows.push({ product_id: id, location_id: storeLoc.id, quantity: Number(body.stock_store) });
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
