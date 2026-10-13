/**
 * Reservedele sælges ikke længere på phonespot.dk (spec 2026-10-13 §4.1).
 * Filtreres i JS og ikke med PostgREST `neq`, fordi `subcategory <> 'spare-part'`
 * også smider rækker med subcategory NULL væk — det er de fleste tilbehør.
 */
export type SparePartShape = { category?: string | null; subcategory?: string | null };

export function isSparePart(p: SparePartShape): boolean {
  return p.subcategory === "spare-part" || p.category === "spare-part";
}

export function withoutSpareParts<T extends SparePartShape>(rows: T[]): T[] {
  return rows.filter((r) => !isSparePart(r));
}
