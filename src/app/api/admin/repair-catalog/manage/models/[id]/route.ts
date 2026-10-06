import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { loadManageModel, modelSlugs, requireCatalogEditor, revalidateRepairPages } from "@/lib/repairs/catalog-manage";
import { firstIssue } from "@/lib/repairs/catalog-manage-rules";
import { parseLocationParam } from "@/lib/repairs/availability";
import { uuidParam } from "@/lib/repairs/case-schemas";

const NOT_FOUND = () => NextResponse.json({ error: "Modellen findes ikke" }, { status: 404 });

/** GET /api/admin/repair-catalog/manage/models/:id?location= : model og alle reparationer, også inaktive. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NOT_FOUND();
  // Uden butik vises begge butikkers tal (kataloget er fælles).
  const location = parseLocationParam(new URL(request.url).searchParams.get("location"));
  try {
    const result = await loadManageModel(id, location);
    if (!result) return NOT_FOUND();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[repair-catalog/manage] model failed:", id, err);
    return NextResponse.json({ error: "Kunne ikke hente modellen" }, { status: 500 });
  }
}

const patchSchema = z
  .object({
    name: z.string().trim().min(2, "Skriv et modelnavn").max(80, "Modelnavnet er for langt").optional(),
    series: z.string().trim().max(60, "Serienavnet er for langt").nullable().optional(),
    image_url: z.string().trim().url("Ugyldigt billede").max(500).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();

/**
 * PATCH /api/admin/repair-catalog/manage/models/:id { name?, series?, image_url?, active? }
 * En model kan først vises (active = true), når den har mindst én aktiv reparation med pris.
 * Slug ændres aldrig (hjemmesidens URL'er og SEO).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NOT_FOUND();
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const input = parsed.data;
  if (Object.keys(input).length === 0) return NextResponse.json({ error: "Ingen felter at opdatere" }, { status: 400 });

  try {
    const db = createServerClient();
    const { data: current } = await db.from("repair_models").select("id").eq("id", id).maybeSingle();
    if (!current) return NOT_FOUND();

    if (input.active === true) {
      const { data: services, error } = await db.from("repair_services").select("price_dkk").eq("model_id", id).eq("active", true);
      if (error) throw new Error(error.message);
      const live = ((services ?? []) as Array<{ price_dkk: number | null }>).filter((s) => (s.price_dkk ?? 0) > 0).length;
      if (live === 0) {
        return NextResponse.json(
          { error: "Aktivér mindst én reparation med pris, før modellen vises på hjemmesiden", code: "no_live_services" },
          { status: 422 },
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.series !== undefined) updates.series = input.series?.trim() || null;
    if (input.image_url !== undefined) updates.image_url = input.image_url || null;
    if (input.active !== undefined) updates.active = input.active;

    const { data, error } = await db
      .from("repair_models")
      .update(updates)
      .eq("id", id)
      .select("id, slug, name, series, image_url, active, brand_id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "update failed");
    revalidateRepairPages(await modelSlugs(db, id));
    return NextResponse.json(data);
  } catch (err) {
    console.error("[repair-catalog/manage] patch model failed:", id, err);
    return NextResponse.json({ error: "Kunne ikke gemme modellen" }, { status: 500 });
  }
}
