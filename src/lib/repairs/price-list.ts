import { countsTowardFromPrice } from "./from-price";

// Den fulde prisliste: alle aktive mærker, modeller og ydelser direkte fra
// databasen. Bruges af /reparation/priser og /llms-full.txt, så AI-søgning og
// kunder altid ser samme priser som modelsiderne, også på nye modeller.

export type PriceListService = {
  name: string;
  category: string | null;
  qualityTier: "standard" | "premium" | "original" | null;
  price: number;
};

export type PriceListModel = {
  slug: string;
  name: string;
  services: PriceListService[];
};

export type PriceListBrand = {
  slug: string;
  name: string;
  models: PriceListModel[];
};

/** Kolonnerne i prisoversigten, i den rækkefølge kunderne oftest spørger. */
export const SUMMARY_CATEGORIES = [
  "Skærmskift",
  "Batteriskift",
  "Opladerstik",
  "Bagglas",
  "Kamera",
] as const;

export type ModelSummary = {
  /** Billigste skærmskift (alle kvaliteter). */
  screenFrom: number | null;
  /** Billigste skærmskift i original kvalitet. */
  screenOriginal: number | null;
  /** Billigste pris pr. kategori i SUMMARY_CATEGORIES. */
  byCategory: Partial<Record<(typeof SUMMARY_CATEGORIES)[number], number>>;
};

const min = (values: number[]) => (values.length ? Math.min(...values) : null);

export function summarizeModel(services: PriceListService[]): ModelSummary {
  const priced = services.filter((s) => countsTowardFromPrice({ price_dkk: s.price, service_category: s.category, name: s.name }));
  const screens = priced.filter((s) => s.category === "Skærmskift");
  const byCategory: ModelSummary["byCategory"] = {};
  for (const category of SUMMARY_CATEGORIES) {
    const from = min(priced.filter((s) => s.category === category).map((s) => s.price));
    if (from !== null) byCategory[category] = from;
  }
  return {
    screenFrom: min(screens.map((s) => s.price)),
    screenOriginal: min(screens.filter((s) => s.qualityTier === "original").map((s) => s.price)),
    byCategory,
  };
}

/** Kolonner der har mindst én pris for mærket, så tomme kolonner ikke vises. */
export function columnsForBrand(brand: PriceListBrand): (typeof SUMMARY_CATEGORIES)[number][] {
  const summaries = brand.models.map((m) => summarizeModel(m.services));
  return SUMMARY_CATEGORIES.filter((c) => summaries.some((s) => s.byCategory[c] !== undefined));
}

export const formatKr = (value: number) => `${value.toLocaleString("da-DK")} kr.`;

/**
 * Prislisten som ren tekst (markdown), én linje pr. ydelse, så en AI kan
 * svare "Hvad koster skærmskift på iPhone 17 Pro hos PhoneSpot?" direkte.
 */
export function priceListToText(brands: PriceListBrand[], site: string): string {
  const out: string[] = [];
  for (const brand of brands) {
    const models = brand.models.filter((m) => m.services.length > 0);
    if (models.length === 0) continue;
    out.push(`## ${brand.name}`, "");
    for (const model of models) {
      out.push(`### ${model.name}`, `Side: ${site}/reparation/${brand.slug}/${model.slug}`);
      for (const s of model.services) out.push(`- ${s.name}: ${formatKr(s.price)}`);
      out.push("");
    }
  }
  return out.join("\n");
}
