import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const skuProductId = request.nextUrl.searchParams.get("sku_product_id");
  const templateId = request.nextUrl.searchParams.get("template_id");
  const supabase = createAdminClient();

  let query = supabase.from("sku_product_templates").select("*, template:product_templates(id, display_name, brand)");

  if (skuProductId) query = query.eq("sku_product_id", skuProductId);
  if (templateId) query = query.eq("template_id", templateId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { sku_product_id, template_id } = await request.json();

  if (!sku_product_id || !template_id) {
    return NextResponse.json({ error: "sku_product_id and template_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sku_product_templates")
    .insert({ sku_product_id, template_id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const skuProductId = request.nextUrl.searchParams.get("sku_product_id");
  const templateId = request.nextUrl.searchParams.get("template_id");

  if (!skuProductId || !templateId) {
    return NextResponse.json({ error: "sku_product_id and template_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("sku_product_templates")
    .delete()
    .eq("sku_product_id", skuProductId)
    .eq("template_id", templateId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
