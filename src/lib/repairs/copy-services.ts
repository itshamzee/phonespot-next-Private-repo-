/**
 * Henter reparationstyperne fra en søskendemodel (fx iPhone 17 Pro -> iPhone 18 Pro), så delene kan
 * lagerføres, før hjemmesiden har priser. De nye reparationer oprettes INAKTIVE: hjemmesiden og Ny sag
 * viser dem først, når ejeren har sat prisen og aktiveret dem. Reservedelene oprettes af triggeren
 * på repair_services (bootstrap_repair_parts), også for inaktive reparationer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type SourceService = {
  slug: string;
  name: string;
  price_dkk: number;
  estimated_minutes: number | null;
  quality_tier: string | null;
  service_category: string | null;
  info_note: string | null;
  description: string | null;
  warranty_info: string | null;
  includes: string | null;
  estimated_time_label: string | null;
  sort_order: number | null;
};

export type ServiceCopyRow = SourceService & { model_id: string; active: false };

/** Rene regler: kopier alt undtagen det modellen allerede har (samme slug); altid inaktiv. */
export function planServiceCopy(targetModelId: string, source: SourceService[], existingSlugs: string[]): ServiceCopyRow[] {
  const have = new Set(existingSlugs);
  return source.filter((s) => !have.has(s.slug)).map((s) => ({ ...s, model_id: targetModelId, active: false as const }));
}

const COLUMNS =
  "slug, name, price_dkk, estimated_minutes, quality_tier, service_category, info_note, description, warranty_info, includes, estimated_time_label, sort_order";

export async function copyServices(
  db: SupabaseClient,
  targetModelId: string,
  sourceModelId: string,
): Promise<{ created: string[]; skipped: number }> {
  if (targetModelId === sourceModelId) throw new Error("same_model");
  const [{ data: source, error: e1 }, { data: existing, error: e2 }] = await Promise.all([
    db.from("repair_services").select(COLUMNS).eq("model_id", sourceModelId).eq("active", true),
    db.from("repair_services").select("slug").eq("model_id", targetModelId),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  const src = (source ?? []) as SourceService[];
  const rows = planServiceCopy(targetModelId, src, ((existing ?? []) as { slug: string }[]).map((r) => r.slug));
  if (rows.length > 0) {
    const { error } = await db.from("repair_services").insert(rows);
    if (error) throw new Error(error.message);
  }
  return { created: rows.map((r) => r.name), skipped: src.length - rows.length };
}
