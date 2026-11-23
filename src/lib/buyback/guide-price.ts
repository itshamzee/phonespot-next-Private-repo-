/**
 * Vejledende opkøbspris, som kunden ser i sælg-formularen (ejerbeslutning
 * 2026-11-13: priser på forhånd, faktor 0,70, start med iPhone 12-17).
 *
 * Prisen regnes ud fra vores egne aktuelle salgspriser, hver gang nogen
 * spørger. Når en salgspris ændres, følger opkøbsprisen derfor med af sig selv.
 * Formlen er den fra docs/marketing-2026-11/opkoeb-analyse/02-pris.md, afsnit 4:
 *
 *   B    = median af vores listede salgspris (stand A/B, samme model og lager)
 *   c    = klargøring + (reservedel + arbejdsløn) for hver oplyst fejl
 *   pool = (0,7125 x B - c - fragt) / 0,8      det bud, hvor vi tjener 0 kr.
 *   pris = pool x faktor, rundet ned til 50 kr.
 *
 * 0,7125 = 95 % realiseret salgspris x (1 - 20 % brugtmoms - 2 % gebyr - 3 % garanti).
 * Denne fil er ren beregning uden databasekald, så den kan testes alene.
 */
import { roundOfferDown } from "./rounding";

export const GUIDE_PRICE = {
  /** Andel af listeprisen, der er tilbage efter rabat, brugtmoms, gebyr og garantireserve. */
  netShare: 0.95 * (1 - 0.2 - 0.02 - 0.03),
  /** Brugtmoms regnes af avancen, så hver krone i bud koster os 0,8 kr. */
  bidCostShare: 0.8,
  prepOre: 25_000,
  shippingOre: 5_000,
  laborPerFaultOre: 15_000,
  /** Vi viser ingen pris, hvis vi tjener mindre end dette på enheden. */
  minMarginOre: 20_000,
  /** Vi viser ingen pris under dette beløb. */
  minOfferOre: 30_000,
  /** Over dette beløb ser et menneske på sagen først. */
  maxOfferOre: 800_000,
  /** Små ridser på skærm eller bagside: prisen ganges med dette (Green: Velholdt er ca. 85-90 % af Som ny). */
  wearFactor: 0.9,
  /** Mindste antal listede enheder, før en salgspris tæller som datagrundlag. */
  minDataPoints: 3,
  /** Fradrag pr. lagertrin, når vi kun har pris på en større lagerstørrelse. */
  storageStepOre: 40_000,
  /** Modeller under ca. 12 måneder falder hurtigt i pris og får en lavere faktor. */
  newModelFactor: 0.65,
  newModelFamily: 17,
  minFamily: 12,
  maxFamily: 17,
} as const;

export const DEFAULT_GUIDE_FACTOR = 0.7;

/** Formularens modelnavn → navnet i vores katalog, hvor de to afviger. */
const MODEL_ALIASES: Record<string, string> = {
  "iphone air": "iphone 17 air",
};

export function normalizeModelName(model: string): string {
  const key = (model ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return MODEL_ALIASES[key] ?? key;
}

/** iPhone-generationen (12-17) for en model, eller null hvis modellen ikke er med i første runde. */
export function guideFamily(model: string): number | null {
  const match = normalizeModelName(model).match(/^iphone (\d{2})(e)?( |$)/);
  if (!match) return null;
  const family = Number(match[1]);
  return family >= GUIDE_PRICE.minFamily && family <= GUIDE_PRICE.maxFamily ? family : null;
}

/** "128GB" → 128, "1TB" → 1024. Ukendt tekst giver null. */
export function storageGb(storage: string | null | undefined): number | null {
  const match = (storage ?? "").toUpperCase().match(/(\d+)\s*(GB|TB)/);
  if (!match) return null;
  return Number(match[1]) * (match[2] === "TB" ? 1024 : 1);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

export type BaseSource = "exact" | "smaller-storage" | "larger-storage" | "reference" | "reference-approx";
export type BaseValue = { baseOre: number; dataPoints: number; source: BaseSource; fromGb: number };

/**
 * Finder salgsprisen, buddet regnes ud fra.
 * Har vi ikke nok enheder med kundens lagerstørrelse, bruger vi nærmeste mindre
 * størrelse uden tillæg (forsigtigt), og ellers nærmeste større med et fradrag
 * pr. lagertrin. Uden nok data giver vi ingen pris.
 */
export function baseFromListings(
  listings: { storageGb: number | null; priceOre: number }[],
  wantedGb: number,
): BaseValue | null {
  const byStorage = new Map<number, number[]>();
  for (const item of listings) {
    if (item.storageGb == null || item.priceOre <= 0) continue;
    byStorage.set(item.storageGb, [...(byStorage.get(item.storageGb) ?? []), item.priceOre]);
  }
  const usable = [...byStorage.entries()]
    .filter(([, prices]) => prices.length >= GUIDE_PRICE.minDataPoints)
    .map(([gb, prices]) => ({ gb, baseOre: median(prices), dataPoints: prices.length }));

  const exact = usable.find((entry) => entry.gb === wantedGb);
  if (exact) return { baseOre: exact.baseOre, dataPoints: exact.dataPoints, source: "exact", fromGb: exact.gb };

  const smaller = usable.filter((entry) => entry.gb < wantedGb).sort((a, b) => b.gb - a.gb)[0];
  if (smaller) return { baseOre: smaller.baseOre, dataPoints: smaller.dataPoints, source: "smaller-storage", fromGb: smaller.gb };

  const larger = usable.filter((entry) => entry.gb > wantedGb).sort((a, b) => a.gb - b.gb)[0];
  if (larger) {
    const steps = Math.max(1, Math.round(Math.log2(larger.gb / wantedGb)));
    return {
      baseOre: larger.baseOre - steps * GUIDE_PRICE.storageStepOre,
      dataPoints: larger.dataPoints,
      source: "larger-storage",
      fromGb: larger.gb,
    };
  }
  return null;
}

/**
 * Referencepris: markedets salgspris for en brugt enhed i fin stand (tabellen
 * buyback_prices, Admin → Opkøb → Priser). Bruges, når vi ikke selv har nok
 * salgspriser på modellen, så kunden alligevel får en pris med det samme.
 */
export type ReferencePrice = {
  deviceType: string;
  brand: string;
  model: string;
  storage: string | null;
  ram: string | null;
  baseOre: number;
};

/** Enheder, hvor formularen kun spørger om udvendig stand (gemt i condition.screen). */
export const OUTER_CONDITION_TYPES = new Set(["Konsol", "Controller", "Høretelefoner", "Dyson", "Smart home"]);

const textKey = (value: string | null | undefined) => (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Finder referenceprisen for kundens enhed. Mangler den præcise lagerstørrelse,
 * bruges nærmeste mindre uden tillæg, ellers nærmeste større med fradrag pr.
 * lagertrin, ligesom for vores egne salgspriser. Flere rækker på samme lager
 * (fx forskellig RAM) giver den laveste pris, så vi aldrig lover for meget.
 */
export function baseFromReferences(
  references: ReferencePrice[],
  device: { deviceType: string; brand: string; model: string; storage: string; ram?: string },
): BaseValue | null {
  const ram = textKey(device.ram);
  const candidates = references.filter(
    (row) =>
      row.baseOre > 0 &&
      textKey(row.deviceType) === textKey(device.deviceType) &&
      textKey(row.brand) === textKey(device.brand) &&
      textKey(row.model) === textKey(device.model) &&
      (!ram || !textKey(row.ram) || textKey(row.ram) === ram),
  );
  if (candidates.length === 0) return null;

  const lowest = (rows: ReferencePrice[]) => Math.min(...rows.map((row) => row.baseOre));
  const wantedGb = storageGb(device.storage);
  const sized = candidates
    .map((row) => ({ row, gb: storageGb(row.storage) }))
    .filter((entry): entry is { row: ReferencePrice; gb: number } => entry.gb != null);

  // Enheder uden lagervalg (ure, høretelefoner) eller rækker uden lager.
  if (wantedGb == null || sized.length === 0) {
    const unsized = candidates.filter((row) => storageGb(row.storage) == null);
    if (unsized.length > 0) return { baseOre: lowest(unsized), dataPoints: 0, source: "reference", fromGb: 0 };
    // Kunden har ikke valgt lager: den mindste variant er det sikre bud.
    const smallestGb = Math.min(...sized.map((entry) => entry.gb));
    const smallest = sized.filter((entry) => entry.gb === smallestGb).map((entry) => entry.row);
    return { baseOre: lowest(smallest), dataPoints: 0, source: "reference-approx", fromGb: smallestGb };
  }

  const exact = sized.filter((entry) => entry.gb === wantedGb).map((entry) => entry.row);
  if (exact.length > 0) return { baseOre: lowest(exact), dataPoints: 0, source: "reference", fromGb: wantedGb };

  const smallerGb = Math.max(...sized.filter((entry) => entry.gb < wantedGb).map((entry) => entry.gb), -1);
  if (smallerGb > 0) {
    const rows = sized.filter((entry) => entry.gb === smallerGb).map((entry) => entry.row);
    return { baseOre: lowest(rows), dataPoints: 0, source: "reference-approx", fromGb: smallerGb };
  }

  const largerGb = Math.min(...sized.map((entry) => entry.gb));
  const rows = sized.filter((entry) => entry.gb === largerGb).map((entry) => entry.row);
  const steps = Math.max(1, Math.round(Math.log2(largerGb / wantedGb)));
  return {
    baseOre: lowest(rows) - steps * GUIDE_PRICE.storageStepOre,
    dataPoints: 0,
    source: "reference-approx",
    fromGb: largerGb,
  };
}

const WORN = new Set(["små ridser", "ridser", "buler/ridser"]);

/** Sandt, når skærm eller bagside har ridser, men ikke er i stykker. */
export function isWorn(condition: { screen?: string | null; back?: string | null }): boolean {
  return [condition.screen, condition.back].some((value) => WORN.has((value ?? "").trim().toLowerCase()));
}

export type GuidePrice =
  | { status: "priced"; amountOre: number; marginOre: number; baseOre: number; factor: number }
  | { status: "none"; reason: string };

export function effectiveFactor(family: number, factor: number): number {
  return family >= GUIDE_PRICE.newModelFamily ? Math.min(factor, GUIDE_PRICE.newModelFactor) : factor;
}

/** Selve prisformlen. `partPricesOre` er én reservedelspris pr. oplyst fejl. */
export function computeGuidePrice(input: { baseOre: number; partPricesOre: number[]; factor: number; worn?: boolean }): GuidePrice {
  const { baseOre, partPricesOre } = input;
  const factor = input.worn ? input.factor * GUIDE_PRICE.wearFactor : input.factor;
  if (!(factor > 0 && factor < 1)) return { status: "none", reason: "Ugyldig faktor" };
  if (baseOre <= 0) return { status: "none", reason: "Ingen salgspris" };

  const faultCostOre = partPricesOre.reduce((sum, part) => sum + part + GUIDE_PRICE.laborPerFaultOre, 0);
  const costOre = GUIDE_PRICE.prepOre + faultCostOre + GUIDE_PRICE.shippingOre;
  const poolOre = (GUIDE_PRICE.netShare * baseOre - costOre) / GUIDE_PRICE.bidCostShare;
  // Billige modeller: buddet sænkes, til mindste fortjeneste holder, i stedet for at kunden ingen pris får.
  const marginCapOre = poolOre - GUIDE_PRICE.minMarginOre / GUIDE_PRICE.bidCostShare;
  const amountOre = roundOfferDown(Math.min(poolOre * factor, marginCapOre));
  const marginOre = Math.round(GUIDE_PRICE.bidCostShare * (poolOre - amountOre));

  if (amountOre < GUIDE_PRICE.minOfferOre) return { status: "none", reason: "Under mindste bud" };
  if (marginOre < GUIDE_PRICE.minMarginOre) return { status: "none", reason: "Under mindste fortjeneste" };
  if (amountOre > GUIDE_PRICE.maxOfferOre) return { status: "none", reason: "Over loftet for automatisk pris" };
  return { status: "priced", amountOre, marginOre, baseOre, factor };
}
