import { withBlackNovemberDevice } from "@/lib/campaign/black-november";
import { effectiveGrade, gradeDisplayLabel, GRADE_SHORT_LABEL } from "@/lib/grades";
import { FORBIDDEN_WORDS } from "@/lib/mail-agent/knowledge";
import { normalizeStoreId, storeLabel, type StoreId } from "@/lib/stores";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { MAX_FIKS_PRODUCTS, type FiksProduct } from "./products-shared";
import { formatKroner } from "./quote-shared";

/** The device categories the shop lists (product_templates.category). "laptop" is the site's "bærbar". */
export const DEVICE_CATEGORIES = ["iphone", "smartphone", "ipad", "laptop", "smartwatch"] as const;
export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export const DEVICE_GRADES = ["N", "P", "A", "B", "C"] as const;
export type FindGrade = (typeof DEVICE_GRADES)[number];

export interface FindDevicesInput {
  query?: string;
  category?: DeviceCategory;
  /** Kroner. */
  max_price?: number;
  min_storage_gb?: number;
  grade?: FindGrade;
  in_store?: StoreId;
}

/** The fields find_devices reads from getPublishedTemplates. Nothing else is passed on. */
export interface TemplateRow {
  id: string;
  slug: string;
  display_name: string;
  brand: string;
  model?: string | null;
  category: string;
  images: string[] | null;
  /** Øre; the "fra" price the category pages show. */
  min_price: number | null;
  device_count: number;
  locations: { name: string; type: string; count: number }[];
}

type LocationJoin = { name: string; type: string } | { name: string; type: string }[] | null | undefined;

/** One listed unit. Prices in øre, after the campaign price function, like the product page. */
export interface DeviceRow {
  template_id: string;
  grade: string | null;
  condition_notes?: string | null;
  selling_price: number | null;
  storage: string | null;
  location?: LocationJoin;
}

export interface FindDevicesDeps {
  loadTemplates: (category?: DeviceCategory) => Promise<TemplateRow[]>;
  loadDevices: (templateIds: string[]) => Promise<DeviceRow[]>;
}

/**
 * Same filters as getAvailableDevices (the product page), for many templates
 * in one query. Only the columns find_devices needs: never source, supplier or
 * purchase fields.
 */
async function loadListedDevices(templateIds: string[]): Promise<DeviceRow[]> {
  if (templateIds.length === 0) return [];
  const { data, error } = await createAdminClient()
    .from("devices")
    .select("template_id, grade, condition_notes, selling_price, storage, location:locations(name, type)")
    .in("template_id", templateIds)
    .eq("status", "listed")
    .not("selling_price", "is", null)
    .gt("selling_price", 0);
  if (error) throw new Error(`device lookup failed: ${error.message}`);
  return ((data ?? []) as unknown as DeviceRow[]).map((d) => withBlackNovemberDevice(d));
}

export const defaultFindDevicesDeps: FindDevicesDeps = {
  // The category pages' own loader: published, in stock, "fra" price incl. campaign.
  loadTemplates: (category) => getPublishedTemplates(category, { inStock: true }),
  loadDevices: loadListedDevices,
};

/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
  "apple", "refurbished", "brugt", "brugte", "ny", "nye", "telefon", "telefoner", "mobil", "mobiltelefon",
  "en", "et", "til", "med", "og", "eller", "fra", "stand", "model", "gb", "tb",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/([a-zæøå])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zæøå])/g, "$1 $2")
    .replace(/[^a-z0-9æøå+]+/g, " ")
    .trim();
}

/** Query words that name a model or brand. Storage ("128 GB") is a filter, not part of the name. */
export function queryTokens(query: string | undefined): string[] {
  if (!query) return [];
  const withoutStorage = query.replace(/\b\d+\s*(?:gb|tb)\b/gi, " ");
  return [...new Set(normalize(withoutStorage).split(" "))].filter((t) => t && !STOP_WORDS.has(t));
}

function nameTokens(t: TemplateRow): Set<string> {
  return new Set(normalize(`${t.brand} ${t.display_name} ${t.model ?? ""}`).split(" ").filter(Boolean));
}

/** "128GB" → 128, "1 TB" → 1024; null when there is no size. */
export function storageGb(storage: string | null | undefined): number | null {
  const m = (storage ?? "").match(/(\d+(?:[.,]\d+)?)\s*(tb|gb)/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return m[2].toLowerCase() === "tb" ? n * 1024 : n;
}

function tidyStorage(storage: string): string {
  return storage.replace(/\s+/g, "").toUpperCase();
}

function storeOf(loc: LocationJoin): StoreId | null {
  const l = Array.isArray(loc) ? loc[0] : loc;
  if (!l || l.type !== "store") return null;
  return normalizeStoreId(l.name);
}

function storesText(stores: Set<StoreId>): string | undefined {
  if (stores.size === 0) return undefined;
  return [...stores].sort().map((s) => storeLabel(s)).join(" og ");
}

function hasForbiddenWord(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_WORDS.some((w) => lower.includes(w));
}

const GRADE_ORDER: Record<string, number> = { N: 0, P: 1, A: 2, B: 3, C: 4 };
const byGrade = (a: string, b: string) => (GRADE_ORDER[a] ?? 9) - (GRADE_ORDER[b] ?? 9);

/** "Fabriksny", "Stand A, B og C", "Fabriksny og stand A". */
function gradesSummary(grades: string[]): string | undefined {
  if (grades.length === 0) return undefined;
  if (grades.length === 1) return gradeDisplayLabel(grades[0]);
  const used = grades.filter((g) => g !== "N");
  const listed = used.length === 1 ? used[0] : `${used.slice(0, -1).join(", ")} og ${used.at(-1)}`;
  return grades.includes("N") ? `${GRADE_SHORT_LABEL.N} og stand ${listed}` : `Stand ${listed}`;
}

function storageSummary(storages: string[]): string | undefined {
  if (storages.length === 0) return undefined;
  if (storages.length <= 3) return storages.join(", ");
  return `${storages[0]} til ${storages.at(-1)}`;
}

const kroner = (ore: number) => Math.round(ore / 100);

interface Filters {
  grade?: FindGrade;
  minStorageGb?: number;
  maxPriceOre?: number;
  store?: StoreId;
}

interface Hit {
  product: FiksProduct;
  /** For the model: every stand in stock with its lowest price. */
  gradePrices: { grade: string; price: number }[];
  storages: string[];
  extraWords: number;
  priceOre: number;
}

function activeFilters(f: Filters): boolean {
  return Boolean(f.grade || f.minStorageGb || f.maxPriceOre || f.store);
}

function summarize(t: TemplateRow, devices: DeviceRow[], f: Filters, queryWords: string[]): Hit | null {
  const units = devices
    .filter((d) => typeof d.selling_price === "number" && d.selling_price > 0)
    .map((d) => ({ grade: effectiveGrade(d), price: d.selling_price as number, storage: d.storage, store: storeOf(d.location) }));

  const fits = units.filter(
    (u) =>
      (!f.grade || u.grade === f.grade) &&
      (!f.minStorageGb || (storageGb(u.storage) ?? 0) >= f.minStorageGb) &&
      (!f.maxPriceOre || u.price <= f.maxPriceOre) &&
      (!f.store || u.store === f.store),
  );
  const filtered = activeFilters(f);
  if (filtered && fits.length === 0) return null;

  const cheapest = fits.reduce<(typeof fits)[number] | null>((best, u) => (!best || u.price < best.price ? u : best), null);
  // Without filters the card shows the same "fra" price as the category page.
  const priceOre = filtered ? cheapest!.price : (t.min_price ?? cheapest?.price ?? null);
  if (!priceOre || priceOre <= 0) return null;

  const gradeMin = new Map<string, number>();
  for (const u of units) {
    const cur = gradeMin.get(u.grade);
    if (cur === undefined || u.price < cur) gradeMin.set(u.grade, u.price);
  }
  const gradePrices = [...gradeMin.entries()].sort((a, b) => byGrade(a[0], b[0])).map(([grade, price]) => ({ grade, price }));
  const storages = [...new Set(units.map((u) => u.storage).filter((s): s is string => Boolean(s)).map(tidyStorage))].sort(
    (a, b) => (storageGb(a) ?? 0) - (storageGb(b) ?? 0),
  );

  const stores = new Set<StoreId>();
  for (const u of filtered ? fits : units) if (u.store) stores.add(u.store);
  if (units.length === 0) {
    for (const l of t.locations) {
      const s = l.type === "store" && l.count > 0 ? normalizeStoreId(l.name) : null;
      if (s) stores.add(s);
    }
  }

  const fitGrades = [...new Set((filtered ? fits : units).map((u) => u.grade))].sort(byGrade);
  const fitStorages = [...new Set((filtered ? fits : units).map((u) => u.storage).filter((s): s is string => Boolean(s)).map(tidyStorage))].sort(
    (a, b) => (storageGb(a) ?? 0) - (storageGb(b) ?? 0),
  );
  const storage = f.minStorageGb && cheapest?.storage ? tidyStorage(cheapest.storage) : storageSummary(fitStorages);
  const gradeLabel = f.grade ? gradeDisplayLabel(f.grade) : gradesSummary(fitGrades);
  const inStore = storesText(stores);
  const url = `https://phonespot.dk/refurbished/${encodeURIComponent(t.slug)}${f.grade ? `?grade=${f.grade}` : ""}`;

  const words = nameTokens(t);
  const extraWords = [...words].filter((w) => !queryWords.includes(w) && !STOP_WORDS.has(w)).length;

  return {
    product: {
      name: t.display_name,
      url,
      image: t.images?.[0] ?? null,
      priceFrom: kroner(priceOre),
      ...(f.grade ? { grade: f.grade } : {}),
      ...(gradeLabel ? { gradeLabel } : {}),
      ...(storage ? { storage } : {}),
      ...(inStore ? { inStore } : {}),
    },
    gradePrices,
    storages,
    extraWords,
    priceOre,
  };
}

function lineFor(i: number, h: Hit): string {
  const p = h.product;
  const grades = h.gradePrices.map((g) => `${gradeDisplayLabel(g.grade)} fra ${formatKroner(kroner(g.price))}`).join(", ");
  const parts = [
    `${i + 1}. ${p.name}: fra ${formatKroner(p.priceFrom)}${p.grade || p.storage ? ` (${[p.grade ? p.gradeLabel : null, p.storage].filter(Boolean).join(", ")})` : ""}.`,
    grades ? `Stande på lager: ${grades}.` : null,
    h.storages.length ? `Lagerplads: ${h.storages.join(", ")}.` : null,
    p.inStore ? `Kan ses og hentes i butikken i ${p.inStore}.` : "Ikke i butikkerne lige nu; kan bestilles online.",
  ];
  return parts.filter(Boolean).join(" ");
}

const FOOTER =
  "Kortene under dit svar viser billede, pris, stand og link til hver enhed; skriv ikke adresserne. Lageret kan ændre sig, så sig \"på lager lige nu\". Fabriksny betyder ny og forseglet, ikke refurbished.";

export interface FindDevicesResult {
  text: string;
  products: FiksProduct[];
}

/**
 * In-stock devices for the chat: the category pages' loader for templates and
 * "fra" prices, one batched query for the units (stand, storage, store), best
 * match first, then cheapest. At most MAX_FIKS_PRODUCTS. When nothing fits,
 * the nearest in-stock alternatives (same model family, then without the
 * filters), clearly labelled. Never invents stock.
 */
export async function findDevicesImpl(
  input: FindDevicesInput,
  deps: FindDevicesDeps = defaultFindDevicesDeps,
): Promise<FindDevicesResult> {
  const category = input.category && (DEVICE_CATEGORIES as readonly string[]).includes(input.category) ? input.category : undefined;
  const templates = (await deps.loadTemplates(category)).filter(
    (t) =>
      (DEVICE_CATEGORIES as readonly string[]).includes(t.category) &&
      t.device_count > 0 &&
      t.slug &&
      !hasForbiddenWord(t.display_name),
  );
  if (templates.length === 0) {
    return { text: "Ingen enheder i den kategori er på lager lige nu. Nævn ingen modeller eller priser; tilbyd at en kollega vender tilbage.", products: [] };
  }

  const devices = await deps.loadDevices(templates.map((t) => t.id));
  const byTemplate = new Map<string, DeviceRow[]>();
  for (const d of devices) {
    const list = byTemplate.get(d.template_id);
    if (list) list.push(d);
    else byTemplate.set(d.template_id, [d]);
  }

  const filters: Filters = {
    grade: input.grade && (DEVICE_GRADES as readonly string[]).includes(input.grade) ? input.grade : undefined,
    minStorageGb: input.min_storage_gb && input.min_storage_gb > 0 ? input.min_storage_gb : undefined,
    maxPriceOre: input.max_price && input.max_price > 0 ? Math.round(input.max_price * 100) : undefined,
    store: input.in_store ? (normalizeStoreId(input.in_store) ?? undefined) : undefined,
  };

  const search = (words: string[], f: Filters): Hit[] =>
    templates
      .filter((t) => {
        const names = nameTokens(t);
        return words.every((w) => names.has(w));
      })
      .map((t) => summarize(t, byTemplate.get(t.id) ?? [], f, words))
      .filter((h): h is Hit => h !== null)
      .sort((a, b) => a.extraWords - b.extraWords || a.priceOre - b.priceOre)
      .slice(0, MAX_FIKS_PRODUCTS);

  const words = queryTokens(input.query);
  let hits = search(words, filters);
  let exact = true;
  if (hits.length === 0) {
    exact = false;
    const families = words.map((_, i) => words.slice(0, words.length - 1 - i)).filter((w) => w.length > 0);
    const attempts: [string[], Filters][] = [
      ...families.map((w): [string[], Filters] => [w, filters]),
      ...(activeFilters(filters) ? [[words, {}] as [string[], Filters], ...families.map((w): [string[], Filters] => [w, {}])] : []),
    ];
    for (const [w, f] of attempts) {
      hits = search(w, f);
      if (hits.length) break;
    }
  }

  if (hits.length === 0) {
    return {
      text: "Ingen enheder på lager matcher lige nu, og der er ingen nære alternativer. Nævn ingen modeller eller priser; sig at lageret skifter, og tilbyd at en kollega vender tilbage.",
      products: [],
    };
  }

  const header = exact
    ? "På lager lige nu, bedste match først. Priser inkl. moms."
    : "Ingen enheder på lager matcher alle ønskerne. Sig det tydeligt. Nærmeste alternativer på lager lige nu:";
  return {
    text: [header, ...hits.map((h, i) => lineFor(i, h)), FOOTER].join("\n"),
    products: hits.map((h) => h.product),
  };
}
