// GET /api/platform/devices/brands — distinct brands for device templates
// Used by the stock list's brand filter dropdown.

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("product_templates")
    .select("brand")
    .neq("category", "accessory");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const brands = [...new Set((data ?? []).map((r) => r.brand).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "da"),
  );

  return NextResponse.json({ brands });
}
