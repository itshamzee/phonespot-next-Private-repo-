import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("foneday_category_map")
    .select("*")
    .order("map_type")
    .order("foneday_value");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  const { mappings } = await req.json();
  if (!Array.isArray(mappings)) {
    return NextResponse.json({ error: "mappings array required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("foneday_category_map")
    .upsert(
      mappings.map((m: any) => ({
        map_type: m.map_type,
        foneday_value: m.foneday_value,
        phonespot_value: m.phonespot_value,
        display_label: m.display_label ?? null,
      })),
      { onConflict: "map_type,foneday_value" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
