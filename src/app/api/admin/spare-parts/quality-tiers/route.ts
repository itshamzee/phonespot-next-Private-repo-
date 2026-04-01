import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("spare_part_quality_tiers")
    .select("*")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("spare_part_quality_tiers")
    .insert({
      name: body.name,
      slug: body.slug,
      badge_color: body.badge_color || "#86868B",
      badge_text_color: body.badge_text_color || "#FFFFFF",
      description: body.description,
      short_description: body.short_description || null,
      specifications: body.specifications ?? {},
      default_warranty_months: body.default_warranty_months ?? 12,
      sort_order: body.sort_order ?? 0,
      active: body.active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/reservedele", "layout");
  return NextResponse.json(data, { status: 201 });
}
