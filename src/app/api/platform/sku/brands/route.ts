// GET /api/platform/sku/brands — returns distinct non-null brand values from sku_products

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("sku_products")
    .select("brand")
    .not("brand", "is", null)
    .order("brand");
  const brands = [
    ...new Set((data ?? []).map((p: { brand: string | null }) => p.brand).filter(Boolean)),
  ].sort() as string[];
  return NextResponse.json(brands);
}
