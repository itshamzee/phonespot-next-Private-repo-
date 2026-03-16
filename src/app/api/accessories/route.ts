import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const brand = url.searchParams.get("brand");
  const model = url.searchParams.get("model");
  const search = url.searchParams.get("search");
  const inStore = url.searchParams.get("inStore") === "true";

  const supabase = createAdminClient();
  let query = supabase
    .from("accessories")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (model) query = query.contains("compatible_models", [model]);
  if (search) query = query.ilike("name", `%${search}%`);
  if (inStore) query = query.gt("store_stock", 0);

  const { data, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
