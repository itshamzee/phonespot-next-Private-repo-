/**
 * Modelkataloget bag enhedsvalget på et opkøb: hentes én gang pr. sidevisning
 * og deles mellem alle enheder på sedlen. Grupperingen er ren, så den kan testes.
 */
import { staffFetch } from "@/lib/buyback/admin-fetch";

export type Template = {
  id: string;
  brand: string | null;
  model: string | null;
  display_name: string | null;
  category?: string | null;
  storage_options?: string[] | null;
};

export type GroupKey = "iphone" | "ipad" | "samsung" | "telefon" | "mac" | "computer" | "tablet" | "ur";

export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "iphone", label: "iPhone" },
  { key: "ipad", label: "iPad" },
  { key: "samsung", label: "Samsung" },
  { key: "telefon", label: "Andre telefoner" },
  { key: "mac", label: "MacBook" },
  { key: "computer", label: "Computer" },
  { key: "tablet", label: "Tablet" },
  { key: "ur", label: "Ur" },
];

/** Kategorien på den "Andet"-skabelon, som en fritekstmodel i gruppen lægges på. */
const OTHER_CATEGORY: Record<GroupKey, string> = {
  iphone: "smartphone",
  samsung: "smartphone",
  telefon: "smartphone",
  ipad: "tablet",
  tablet: "tablet",
  mac: "laptop",
  computer: "laptop",
  ur: "smartwatch",
};

/** Lagervalg, når modellen ikke selv har nogen. Ure har ingen. */
const DEFAULT_STORAGE: Record<GroupKey, string[]> = {
  iphone: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  samsung: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  telefon: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  ipad: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  tablet: ["64GB", "128GB", "256GB", "512GB"],
  mac: ["256GB", "512GB", "1TB", "2TB"],
  computer: ["256GB", "512GB", "1TB"],
  ur: [],
};

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/** "Andet (telefon)" og lignende: bærer fritekstmodeller, vises ikke i listen. */
export function isOther(t: Template): boolean {
  return norm(t.brand) === "andet";
}

export function groupOf(t: Template): GroupKey {
  const category = norm(t.category);
  const brand = norm(t.brand);
  const name = norm(t.display_name ?? t.model);
  if (category === "iphone" || (brand === "apple" && category === "smartphone") || name.includes("iphone")) return "iphone";
  if (category === "ipad" || name.includes("ipad")) return "ipad";
  if (category === "smartwatch") return "ur";
  if (category === "laptop") return brand === "apple" ? "mac" : "computer";
  if (category === "tablet") return "tablet";
  if (brand === "samsung") return "samsung";
  return "telefon";
}

/** "Apple" + "Apple iPhone 13" skal stå som "Apple iPhone 13", ikke med mærket to gange. */
export function templateLabel(t: { brand: string | null; model: string | null; display_name?: string | null }): string {
  const name = (t.display_name ?? t.model ?? "").trim();
  const brand = (t.brand ?? "").trim();
  if (!brand || name.toLowerCase().startsWith(brand.toLowerCase())) return name || brand;
  return `${brand} ${name}`.trim();
}

/** Navnet uden mærke, til knapperne under en gruppe, hvor mærket er givet ("iPhone 13 Pro"). */
export function shortLabel(t: Template, group: GroupKey): string {
  const full = templateLabel(t);
  const brand = (t.brand ?? "").trim();
  const brandGiven = group === "iphone" || group === "ipad" || group === "samsung" || group === "mac";
  if (brandGiven && brand && full.toLowerCase().startsWith(`${brand.toLowerCase()} `)) return full.slice(brand.length + 1);
  return full;
}

const byName = new Intl.Collator("da", { numeric: true, sensitivity: "base" });

/** Modellerne i en gruppe. Telefoner, tablets og ure med nyeste først; computere alfabetisk. */
export function modelsIn(catalog: Template[], group: GroupKey): Template[] {
  const list = catalog.filter((t) => !isOther(t) && groupOf(t) === group);
  const newestFirst = group !== "computer";
  // Modeller uden nummer ("iPhone SE") sidst, ikke forrest.
  const num = (t: Template) => Number(/\b\d{1,3}\b/.exec(shortLabel(t, group))?.[0] ?? -1);
  return list.sort((a, b) => {
    const order = byName.compare(shortLabel(a, group), shortLabel(b, group));
    if (!newestFirst) return order;
    return num(b) - num(a) || -order;
  });
}

/** Grupper, der har mindst én model, i fast rækkefølge. */
export function groupsWithModels(catalog: Template[]): { key: GroupKey; label: string }[] {
  const present = new Set(catalog.filter((t) => !isOther(t)).map(groupOf));
  return GROUPS.filter((g) => present.has(g.key));
}

/** Alle ord i søgningen skal findes i navnet: "iph 13 pro" finder "Apple iPhone 13 Pro". */
export function searchCatalog(catalog: Template[], query: string, limit = 8): Template[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const hits = catalog.filter((t) => {
    if (isOther(t)) return false;
    const hay = `${norm(t.brand)} ${norm(t.display_name)} ${norm(t.model)}`;
    return words.every((w) => hay.includes(w));
  });
  // Korteste navn først: "iPhone 13" før "iPhone 13 Pro Max".
  return hits.sort((a, b) => templateLabel(a).length - templateLabel(b).length || byName.compare(templateLabel(a), templateLabel(b))).slice(0, limit);
}

/** Skabelonen, en fritekstmodel i gruppen gemmes på. null, hvis kataloget ikke har en. */
export function otherTemplate(catalog: Template[], group: GroupKey): Template | null {
  return catalog.find((t) => isOther(t) && norm(t.category) === OTHER_CATEGORY[group]) ?? null;
}

/** Lagervalgene for en valgt model: modellens egne, ellers gruppens standard. */
export function storageChoices(t: Template | null, fallback: string[]): string[] {
  const own = (t?.storage_options ?? []).filter(Boolean);
  if (own.length > 0) return own;
  if (fallback.length > 0) return fallback;
  return t ? DEFAULT_STORAGE[groupOf(t)] : [];
}

let cache: Promise<Template[]> | null = null;

/** Hele kataloget i den slanke udgave. Én hentning deles; en fejl huskes ikke. */
export function loadCatalog(): Promise<Template[]> {
  if (!cache) {
    cache = (async () => {
      const res = await staffFetch("/api/platform/templates?fields=slim");
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as Template[];
    })();
    cache.catch(() => {
      cache = null;
    });
  }
  return cache;
}

/** Kun til tests: glem det hentede katalog. */
export function resetCatalogCache() {
  cache = null;
}
