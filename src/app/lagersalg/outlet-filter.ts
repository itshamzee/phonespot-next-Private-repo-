import { DEVICE_BRANDS, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

/**
 * Filtrering og sortering af lagersalget. Ren logik uden React, så den kan
 * testes og køre i browseren på hele udvalget (det er lille nok til at blive
 * sendt med siden). Filtre inden for samme gruppe er "eller", mellem grupper "og".
 */

export type OutletModel = { slug: string; label: string; brand: string };

export type OutletItem = {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  /** Producenten af selve coveret, ofte ukendt. */
  brand: string | null;
  /** Den pris kunden betaler, i øre. */
  priceOre: number;
  imageUrl: string | null;
  /** Stk. på lager i butikkerne og online. */
  stock: number;
  /** Kan bestilles uden lager (always_in_stock). */
  orderable: boolean;
  models: OutletModel[];
  color: string | null;
  type: string;
  listPriceKr: number | null;
  createdAt: string;
};

export type OutletSort = "relevance" | "price-asc" | "price-desc";

export type OutletFilters = {
  query: string;
  brands: string[];
  models: string[];
  types: string[];
  colors: string[];
  prices: number[];
  sort: OutletSort;
};

export const EMPTY_FILTERS: OutletFilters = { query: "", brands: [], models: [], types: [], colors: [], prices: [], sort: "relevance" };

export const SORT_LABELS: Record<OutletSort, string> = {
  relevance: "Relevans",
  "price-asc": "Pris: lav til høj",
  "price-desc": "Pris: høj til lav",
};

/** Danske navne på covertyperne fra hurtig tilbehørsoptagelsen (attribut case_type). */
const CASE_TYPE_LABELS: Record<string, string> = {
  Flip: "Flipcover",
  Wallet: "Pungcover",
  Clear: "Gennemsigtigt cover",
  Slim: "Tyndt cover",
  Rugged: "Stødsikkert cover",
  Bumper: "Bumper",
};

export function caseTypeLabel(caseType: string | null | undefined): string {
  return (caseType && CASE_TYPE_LABELS[caseType]) || "Cover";
}

/** "Galaxy S21 FE" og "s21fe" skal finde det samme. */
export function normalizeSearch(text: string): string {
  return text.toLowerCase().replace(/galaxy/g, "").replace(/[^a-z0-9æøå+]/g, "");
}

type Group = "brands" | "models" | "types" | "colors" | "prices";

function matches(item: OutletItem, f: OutletFilters, skip?: Group): boolean {
  if (skip !== "brands" && f.brands.length && !item.models.some((m) => f.brands.includes(m.brand))) return false;
  if (skip !== "models" && f.models.length && !item.models.some((m) => f.models.includes(m.slug))) return false;
  if (skip !== "types" && f.types.length && !f.types.includes(item.type)) return false;
  if (skip !== "colors" && f.colors.length && !(item.color && f.colors.includes(item.color))) return false;
  if (skip !== "prices" && f.prices.length && !f.prices.includes(item.priceOre)) return false;
  const q = normalizeSearch(f.query);
  if (q) {
    const fields = [item.name, item.color ?? "", item.type, ...item.models.map((m) => m.label)];
    if (!fields.some((field) => normalizeSearch(field).includes(q))) return false;
  }
  return true;
}

export function applyOutletFilters(items: OutletItem[], f: OutletFilters): OutletItem[] {
  const out = items.filter((item) => matches(item, f));
  if (f.sort === "price-asc") return [...out].sort((a, b) => a.priceOre - b.priceOre);
  if (f.sort === "price-desc") return [...out].sort((a, b) => b.priceOre - a.priceOre);
  return out;
}

export type FacetOption<T = string> = { value: T; label: string; count: number };

const BRAND_ORDER = DEVICE_BRANDS.map((b) => b.slug as string);
const BRAND_LABEL = new Map(DEVICE_BRANDS.map((b) => [b.slug as string, b.label]));
const MODEL_ORDER = new Map(TILBEHOER_DEVICES.map((d, i) => [d.slug, i]));

function tally<T>(rows: OutletItem[], keys: (item: OutletItem) => T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const row of rows) for (const key of new Set(keys(row))) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

/**
 * Valgmuligheder pr. filtergruppe med antal, regnet under de andre gruppers
 * aktive filtre. Kun værdier der findes i data kommer med; en valgt værdi
 * bliver stående, også når den giver 0, så den kan fravælges igen.
 */
export function facetOptions(items: OutletItem[], f: OutletFilters) {
  const pool = (skip: Group) => items.filter((item) => matches(item, f, skip));
  const keep = <T,>(counts: Map<T, number>, selected: T[]) => {
    for (const s of selected) if (!counts.has(s)) counts.set(s, 0);
    return counts;
  };

  const brandCounts = keep(tally(pool("brands"), (i) => i.models.map((m) => m.brand)), f.brands);
  const brands = [...brandCounts]
    .sort((a, b) => BRAND_ORDER.indexOf(a[0]) - BRAND_ORDER.indexOf(b[0]))
    .map(([value, count]) => ({ value, label: BRAND_LABEL.get(value) ?? value, count }));

  const modelPool = pool("models");
  const modelLabels = new Map(items.flatMap((i) => i.models.map((m) => [m.slug, m.label] as const)));
  const modelCounts = keep(tally(modelPool, (i) => i.models.filter((m) => !f.brands.length || f.brands.includes(m.brand)).map((m) => m.slug)), f.models);
  const models = [...modelCounts]
    .sort((a, b) => (MODEL_ORDER.get(a[0]) ?? 999) - (MODEL_ORDER.get(b[0]) ?? 999))
    .map(([value, count]) => ({ value, label: modelLabels.get(value) ?? value, count }));

  const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0], "da");
  const types = [...keep(tally(pool("types"), (i) => [i.type]), f.types)].sort(byCount).map(([value, count]) => ({ value, label: value, count }));
  const colors = [...keep(tally(pool("colors"), (i) => (i.color ? [i.color] : [])), f.colors)]
    .sort(byCount)
    .map(([value, count]) => ({ value, label: value, count }));
  const prices = [...keep(tally(pool("prices"), (i) => [i.priceOre]), f.prices)]
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ value, label: `${(value / 100).toLocaleString("da-DK")} kr.`, count }));

  return { brands, models, types, colors, prices };
}

export function activeFilterCount(f: OutletFilters): number {
  return f.brands.length + f.models.length + f.types.length + f.colors.length + f.prices.length;
}
