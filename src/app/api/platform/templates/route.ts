// GET /api/platform/templates — list product templates for select dropdowns
// Supports optional ?search=... query param for filtering

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const search = request.nextUrl.searchParams.get("search");

  let query = supabase
    .from("product_templates")
    .select("id, brand, model, category, display_name, storage_options, colors")
    .order("brand")
    .order("model");

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
