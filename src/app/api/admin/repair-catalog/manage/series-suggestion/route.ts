import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { requireCatalogEditor } from "@/lib/repairs/catalog-manage";
import { uuidParam } from "@/lib/repairs/case-schemas";

/**
 * GET /api/admin/repair-catalog/manage/series-suggestion?brand_id=&name=
 * Serien den faste regel (repair_series_for) vælger for et modelnavn. Tom, hvis ingen regel passer.
 */
export async function GET(request: Request) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const query = z
    .object({ brand_id: uuidParam, name: z.string().trim().min(1).max(80) })
    .safeParse({ brand_id: url.searchParams.get("brand_id"), name: url.searchParams.get("name") });
  if (!query.success) return NextResponse.json({ series: null });
  try {
    const db = createServerClient();
    const { data: brand } = await db.from("repair_brands").select("slug").eq("id", query.data.brand_id).maybeSingle();
    if (!brand) return NextResponse.json({ series: null });
    const { data, error } = await db.rpc("repair_series_for", {
      p_brand_slug: (brand as { slug: string }).slug,
      p_model_name: query.data.name,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ series: typeof data === "string" && data.trim() ? data : null });
  } catch (err) {
    console.error("[repair-catalog/manage] series-suggestion failed:", err);
    return NextResponse.json({ series: null });
  }
}
