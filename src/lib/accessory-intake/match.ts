import type { Identified, IntakeProductType, MatchCandidate } from "./types";

export function subcategoryFor(t: IntakeProductType): "cover" | "screen_protector" | "bag" | "other" {
  if (t === "cover" || t === "flip_cover" || t === "ipad_cover") return "cover";
  return t;
}

const same = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Hvor godt en eksisterende vare matcher det AI'en læste. Model-overlap er et krav;
 * derefter kategori +3, mærke +2, covertype +2 og farve +2 (maks. 9).
 */
export function scoreCandidate(i: Identified, c: Omit<MatchCandidate, "score" | "stock">): number {
  const overlap = (c.compatible_models ?? []).some((m) => i.models.includes(m));
  if (!overlap) return 0;
  let score = 0;
  if (c.subcategory === subcategoryFor(i.productType)) score += 3;
  if (same(c.brand, i.brand)) score += 2;
  if (same(c.attributes?.case_type, i.caseType)) score += 2;
  if (same(c.attributes?.color, i.color)) score += 2;
  return score;
}
