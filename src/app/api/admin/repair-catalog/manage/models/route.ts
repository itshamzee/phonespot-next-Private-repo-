import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { requireCatalogEditor } from "@/lib/repairs/catalog-manage";
import { firstIssue, slugifyModel, uniqueSlug } from "@/lib/repairs/catalog-manage-rules";
import { uuidParam } from "@/lib/repairs/case-schemas";

const createSchema = z.object({
  name: z.string({ error: "Skriv et modelnavn" }).trim().min(2, "Skriv et modelnavn").max(80, "Modelnavnet er for langt"),
  brand_id: uuidParam,
  series: z.string().trim().max(60, "Serienavnet er for langt").nullish(),
  image_url: z.string().trim().url("Ugyldigt billede").max(500).nullish(),
});

/**
 * POST /api/admin/repair-catalog/manage/models { name, brand_id, series?, image_url? }
 * Opretter en model som INAKTIV: den vises hverken på hjemmesiden eller i Ny sag, før den har
 * aktive reparationer med pris og ejeren aktiverer den. Tom serie udfyldes af databasens regel.
 */
export async function POST(request: Request) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const input = parsed.data;
  const base = slugifyModel(input.name);
  if (!base) return NextResponse.json({ error: "Skriv et modelnavn" }, { status: 400 });

  try {
    const db = createServerClient();
    const { data: brand } = await db.from("repair_brands").select("id").eq("id", input.brand_id).maybeSingle();
    if (!brand) return NextResponse.json({ error: "Mærket findes ikke" }, { status: 400 });

    const { data: siblings, error: sibError } = await db.from("repair_models").select("name").eq("brand_id", input.brand_id);
    if (sibError) throw new Error(sibError.message);
    const lower = input.name.toLowerCase();
    if (((siblings ?? []) as Array<{ name: string }>).some((s) => s.name.trim().toLowerCase() === lower)) {
      return NextResponse.json({ error: "Modellen findes allerede under mærket" }, { status: 409 });
    }

    const { data: taken, error: takenError } = await db.from("repair_models").select("slug").ilike("slug", `${base}%`);
    if (takenError) throw new Error(takenError.message);
    const slug = uniqueSlug(
      base,
      ((taken ?? []) as Array<{ slug: string }>).map((r) => r.slug),
    );

    const { data, error } = await db
      .from("repair_models")
      .insert({
        brand_id: input.brand_id,
        slug,
        name: input.name,
        series: input.series?.trim() || null,
        image_url: input.image_url || null,
        sort_order: 0,
        active: false,
      })
      .select("id, slug, name, series, image_url, active, brand_id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[repair-catalog/manage] create model failed:", err);
    return NextResponse.json({ error: "Kunne ikke oprette modellen" }, { status: 500 });
  }
}
