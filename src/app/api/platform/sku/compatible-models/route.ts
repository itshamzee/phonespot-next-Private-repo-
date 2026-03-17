// GET /api/platform/sku/compatible-models
// Returns only the device templates that have at least one SKU product linked to
// them via sku_product_templates. Used to populate the "compatible device" filter
// dropdown in the admin product list with meaningful entries instead of all templates.

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("sku_product_templates")
    .select("template:product_templates(id, display_name, brand, category)")
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deduplicate by template id and sort alphabetically.
  const seen = new Set<string>();
  const templates = (data ?? [])
    .map((row: any) => row.template)
    .filter((t: any): t is { id: string; display_name: string; brand: string | null; category: string } => {
      if (!t || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json(templates);
}
