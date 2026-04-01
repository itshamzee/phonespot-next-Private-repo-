import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("spare_part_categories")
    .select("*")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("spare_part_categories")
    .insert({
      name: body.name,
      slug: body.slug,
      icon: body.icon || null,
      description: body.description || null,
      seo_title: body.seo_title || null,
      seo_description: body.seo_description || null,
      seo_text: body.seo_text || null,
      hero_title: body.hero_title || null,
      hero_subtitle: body.hero_subtitle || null,
      quality_guide: body.quality_guide || null,
      faq: body.faq ?? [],
      featured_models: body.featured_models ?? [],
      default_warranty_months: body.default_warranty_months ?? null,
      sort_order: body.sort_order ?? 0,
      active: body.active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/reservedele", "layout");
  return NextResponse.json(data, { status: 201 });
}
