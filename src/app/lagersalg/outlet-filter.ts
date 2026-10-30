import { DEVICE_BRANDS, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

/**
 * Filtrering og sortering af lagersalget. Ren logik uden React, så den kan
 * testes og køre i browseren på hele udvalget (det er lille nok til at blive
 * sendt med siden). Filtre inden for samme gruppe er "eller", mellem grupper "og".
 */

export type OutletModel = { slug: string; label: string; brand: string };

/** Varetype på lagersalget: telefoncovers, iPad-covers, tasker og alt andet. */
export type OutletKind = "cover" | "ipad" | "bag" | "other";

export const KIND_LABELS: Record<OutletKind, string> = { cover: "Covers", ipad: "iPad", bag: "Tasker", other: "Andet" };
const KIND_ORDER: OutletKind[] = ["cover", "ipad", "bag", "other"];

/** Bærbar-størrelserne i samme rækkefølge som attributten laptop_size i admin. */
export const LAPTOP_SIZES = ['13"', '14"', '15"/15,6"', '16"', '17"'];

/** Et cover kun til iPads er et iPad-cover; et cover der også passer til en telefon er et telefoncover. */
export function kindOf(row: { subcategory: string | null; models: string[] }): OutletKind {
  if (row.subcategory === "bag") return "bag";
  if (row.subcategory === "cover") {
    return row.models.length > 0 && row.models.every((m) => m.startsWith("ipad-")) ? "ipad" : "cover";
  }
  return "other";
}

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
  kind: OutletKind;
  /** Tasker: største bærbar der passer (attribut laptop_size). */
  laptopSize: string | null;
  /** Tasker: Sleeve, Skuldertaske eller Rygsæk (attribut bag_type). */
  bagType: string | null;
  color: string | null;
  type: string;
  listPriceKr: number | null;
  createdAt: string;
};

export type OutletSort = "relevance" | "price-asc" | "price-desc";

export type OutletFilters = {
  query: string;
  kinds: string[];
  sizes: string[];
  brands: string[];
  models: string[];
  types: string[];
  colors: string[];
  prices: number[];
  sort: OutletSort;
};

export const EMPTY_FILTERS: OutletFilters = { query: "", kinds: [], sizes: [], brands: [], models: [], types: [], colors: [], prices: [], sort: "relevance" };

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

/** Tasker passer til en bærbar, ikke til en telefonmodel: de matcher aldrig model eller mærke. */
const modelsOf = (i: OutletItem) => (i.kind === "bag" ? [] : i.models);

/** Varetyper der hører til en telefon- eller iPad-model. */
export const MODEL_KINDS: OutletKind[] = ["cover", "ipad"];

/**
 * De filtre der faktisk gælder: med præcis én valgt model er siden "Covers til
 * {model}", så kun covers og iPad-covers vises, uanset hvad der ellers er tagget
 * med modellen. Fravælges modellen, falder begrænsningen væk af sig selv.
 */
export function scopeToModel(f: OutletFilters): OutletFilters {
  if (f.models.length !== 1) return f;
  const kinds = f.kinds.filter((k) => (MODEL_KINDS as string[]).includes(k));
  return { ...f, kinds: kinds.length ? kinds : [...MODEL_KINDS], sizes: [] };
}

/**
 * Nyt modelvalg. Ender det på én model, beholdes kun de valgte varetyper hvor
 * modellen faktisk findes (fx iPhone 15 valgt under "iPad" eller "Tasker"
 * nulstiller varetypen i stedet for at give nul resultater).
 */
export function selectModels(items: OutletItem[], f: OutletFilters, models: string[]): OutletFilters {
  if (models.length !== 1) return { ...f, models };
  const available = new Set<string>(items.filter((i) => modelsOf(i).some((m) => m.slug === models[0])).map((i) => i.kind));
  const kinds = f.kinds.filter((k) => (MODEL_KINDS as string[]).includes(k) && available.has(k));
  return { ...f, models, kinds, sizes: [] };
}

type Group = "kinds" | "sizes" | "brands" | "models" | "types" | "colors" | "prices";

function matches(item: OutletItem, f: OutletFilters, skip?: Group): boolean {
  if (skip !== "kinds" && f.kinds.length && !f.kinds.includes(item.kind)) return false;
  if (skip !== "sizes" && f.sizes.length && !(item.laptopSize && f.sizes.includes(item.laptopSize))) return false;
  if (skip !== "brands" && f.brands.length && !modelsOf(item).some((m) => f.brands.includes(m.brand))) return false;
  if (skip !== "models" && f.models.length && !modelsOf(item).some((m) => f.models.includes(m.slug))) return false;
  if (skip !== "types" && f.types.length && !f.types.includes(item.type)) return false;
  if (skip !== "colors" && f.colors.length && !(item.color && f.colors.includes(item.color))) return false;
  if (skip !== "prices" && f.prices.length && !f.prices.includes(item.priceOre)) return false;
  const q = normalizeSearch(f.query);
  if (q) {
    const fields = [item.name, item.color ?? "", item.type, item.laptopSize ?? "", ...modelsOf(item).map((m) => m.label)];
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

const sizeRank = (size: string) => {
  const i = LAPTOP_SIZES.indexOf(size);
  return i === -1 ? LAPTOP_SIZES.length : i;
};

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

  const kindCounts = keep(tally(pool("kinds"), (i) => [i.kind as string]), f.kinds);
  const kinds = KIND_ORDER.filter((k) => kindCounts.has(k)).map((k) => ({ value: k as string, label: KIND_LABELS[k], count: kindCounts.get(k) ?? 0 }));

  const sizeCounts = keep(tally(pool("sizes").filter((i) => i.kind === "bag"), (i) => (i.laptopSize ? [i.laptopSize] : [])), f.sizes);
  const sizes = [...sizeCounts]
    .sort((a, b) => sizeRank(a[0]) - sizeRank(b[0]) || a[0].localeCompare(b[0], "da"))
    .map(([value, count]) => ({ value, label: value, count }));

  // Tasker passer til en bærbar, ikke til en telefonmodel: de tæller ikke med i mærke og model.
  const brandCounts = keep(tally(pool("brands"), (i) => modelsOf(i).map((m) => m.brand)), f.brands);
  const brands = [...brandCounts]
    .sort((a, b) => BRAND_ORDER.indexOf(a[0]) - BRAND_ORDER.indexOf(b[0]))
    .map(([value, count]) => ({ value, label: BRAND_LABEL.get(value) ?? value, count }));

  const modelPool = pool("models");
  const modelLabels = new Map(items.flatMap((i) => modelsOf(i).map((m) => [m.slug, m.label] as const)));
  const modelCounts = keep(tally(modelPool, (i) => modelsOf(i).filter((m) => !f.brands.length || f.brands.includes(m.brand)).map((m) => m.slug)), f.models);
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

  return { kinds, sizes, brands, models, types, colors, prices };
}

export function activeFilterCount(f: OutletFilters): number {
  return f.kinds.length + f.sizes.length + f.brands.length + f.models.length + f.types.length + f.colors.length + f.prices.length;
}
