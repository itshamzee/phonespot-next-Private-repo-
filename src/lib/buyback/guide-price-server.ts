/**
 * Databasedelen af den vejledende opkøbspris: henter vores listede salgspriser
 * og reservedelspriser og fodrer den rene formel i guide-price.ts.
 */
import type { createAdminClient } from "@/lib/supabase/admin";
import type { BuybackCondition, BuybackDevice, BuybackSettings } from "./types";
import { conditionToFaults, unpriceableBrokenParts } from "./fault-mapping";
import { lookupPartPriceOre } from "./parts-lookup";
import { loadBuybackSettings } from "./settings";
import {
  DEFAULT_GUIDE_FACTOR,
  GUIDE_PRICE,
  OUTER_CONDITION_TYPES,
  baseFromListings,
  baseFromReferences,
  computeGuidePrice,
  effectiveFactor,
  guideFamily,
  isWorn,
  normalizeModelName,
  storageGb,
  type BaseValue,
  type GuidePrice,
  type ReferencePrice,
} from "./guide-price";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type GuideListing = { model: string; catalogModel: string; storageGb: number | null; priceOre: number };

/** Alle listede iPhones i stand A/B med salgspris. Én forespørgsel dækker både enkeltpris og oversigt. */
export async function loadGuideListings(client: SupabaseAdmin): Promise<GuideListing[]> {
  const { data: templates } = await client.from("product_templates").select("id, model").ilike("model", "iphone%");
  const byId = new Map<string, string>();
  for (const tpl of (templates ?? []) as { id: string; model: string }[]) byId.set(tpl.id, tpl.model);
  if (byId.size === 0) return [];

  const { data: devices } = await client
    .from("devices")
    .select("template_id, storage, selling_price, grade, status")
    .in("template_id", [...byId.keys()])
    .eq("status", "listed")
    .in("grade", ["A", "B"])
    .gt("selling_price", 0)
    .limit(5000);

  return ((devices ?? []) as { template_id: string; storage: string | null; selling_price: number; grade: string; status: string }[])
    .filter((device) => device.status === "listed" && ["A", "B"].includes(device.grade) && device.selling_price > 0)
    .map((device) => {
      const catalogModel = (byId.get(device.template_id) ?? "").trim();
      return {
        model: normalizeModelName(catalogModel),
        catalogModel,
        storageGb: storageGb(device.storage),
        priceOre: device.selling_price,
      };
    });
}

export function guideFactor(settings: BuybackSettings): number {
  const factor = Number(settings.guidePriceFactor);
  return factor > 0 && factor < 1 ? factor : DEFAULT_GUIDE_FACTOR;
}

/** Aktive referencepriser (markedets salgspris i fin stand) fra Admin → Opkøb → Priser. */
export async function loadReferencePrices(client: SupabaseAdmin): Promise<ReferencePrice[]> {
  const { data, error } = await client
    .from("buyback_prices")
    .select("device_type, brand, model, storage, ram, base_price, active")
    .eq("active", true)
    .limit(5000);
  if (error || !data) return [];
  return (data as { device_type: string; brand: string; model: string; storage: string | null; ram: string | null; base_price: number; active: boolean }[])
    .filter((row) => row.active === true && row.base_price > 0)
    .map((row) => ({
      deviceType: row.device_type,
      brand: row.brand,
      model: row.model,
      storage: row.storage,
      ram: row.ram,
      baseOre: row.base_price,
    }));
}

const lower = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

/** Enheder, hvor prisen afhænger af lagerpladsen, så den skal være oplyst først. */
const STORAGE_TYPES = new Set(["Telefon", "Tablet", "Laptop"]);

/** Årsager til, at en enhed aldrig får en pris på forhånd, uanset data. */
function blockedReason(device: BuybackDevice, condition: BuybackCondition): string | null {
  if (device.useCustom) return "Model skrevet i fritekst";
  if (!device.model.trim() || !device.brand.trim() || !device.deviceType.trim()) return "Model mangler";
  // Mail-assistenten spørger efter lagerplads ud fra netop denne årsag.
  if (STORAGE_TYPES.has(device.deviceType) && storageGb(device.storage) == null) return "Lagerplads mangler";
  if (lower(condition.cloudLocked) === "ja") return "iCloud-låst";
  const screen = lower(condition.screen);
  if (screen === "virker ikke" || screen === "knækket") return "Skærm eller kabinet i stykker";
  if (device.deviceType === "Laptop" && screen === "skærmfejl") return "Skærmfejl på computer";
  if (OUTER_CONDITION_TYPES.has(device.deviceType) && (condition.brokenParts ?? []).length > 0) return "Fejl, vi ikke kan prissætte på forhånd";
  if (unpriceableBrokenParts(condition).length > 0) return "Fejl, vi ikke kan prissætte på forhånd";
  if (lower(condition.allWorking) === "nej" && (condition.brokenParts ?? []).length === 0) return "Ukendt fejl";
  return null;
}

/** iPhone 12-17 med lagerplads: kan prissættes ud fra vores egne salgspriser. */
function ownDataEligible(device: BuybackDevice): boolean {
  return (
    device.deviceType === "Telefon" &&
    lower(device.brand) === "apple" &&
    guideFamily(device.model) != null &&
    storageGb(device.storage) != null
  );
}

export type GuideEstimate = GuidePrice & { base?: BaseValue; topOre?: number };

/**
 * Salgsprisen, buddet regnes ud fra. Rækkefølge: vores egne salgspriser på
 * præcis den lagerstørrelse, referencelisten på præcis den, derefter de
 * tilnærmede (nabolager) fra egne data og til sidst fra referencelisten.
 */
export function chooseBase(
  device: BuybackDevice,
  listings: GuideListing[],
  references: ReferencePrice[],
): { base: BaseValue; catalogModel: string } | null {
  const own = ownDataEligible(device)
    ? listings.filter((listing) => listing.model === normalizeModelName(device.model))
    : [];
  const ownBase = own.length > 0 ? baseFromListings(own, storageGb(device.storage) as number) : null;
  const refBase = baseFromReferences(references, device);
  const catalogModel = own[0]?.catalogModel ?? device.model;
  if (ownBase?.source === "exact") return { base: ownBase, catalogModel };
  // Mere lagerplads må aldrig give en lavere pris end den mindre variant, vi selv sælger.
  if (refBase?.source === "reference" && ownBase?.source === "smaller-storage" && ownBase.baseOre > refBase.baseOre) {
    return { base: ownBase, catalogModel };
  }
  if (refBase?.source === "reference") return { base: refBase, catalogModel };
  if (ownBase) return { base: ownBase, catalogModel };
  if (refBase) return { base: refBase, catalogModel };
  return null;
}

/**
 * Vejledende pris for én enhed. Viser ingen pris, når funktionen er slået fra
 * (medmindre `ignoreSwitch` er sat, som admin-oversigten bruger).
 * `topOre` er prisen for samme enhed i fin stand uden fejl, så formularen kan
 * vise, hvad standen koster.
 */
export async function estimateGuidePrice(
  client: SupabaseAdmin,
  device: BuybackDevice,
  condition: BuybackCondition,
  settings: BuybackSettings,
  options: { ignoreSwitch?: boolean; listings?: GuideListing[]; references?: ReferencePrice[] } = {},
): Promise<GuideEstimate> {
  if (!settings.publicPriceEnabled && !options.ignoreSwitch) return { status: "none", reason: "Slået fra" };
  const blocked = blockedReason(device, condition);
  if (blocked) return { status: "none", reason: blocked };

  const listings = ownDataEligible(device) ? (options.listings ?? (await loadGuideListings(client))) : [];
  const references = options.references ?? (await loadReferencePrices(client));
  const chosen = chooseBase(device, listings, references);
  if (!chosen) return { status: "none", reason: "Ingen salgspris eller referencepris på modellen" };
  const { base, catalogModel } = chosen;

  // Udvendig stand (konsoller m.fl.) har ingen dele at trække fra; fejl er afvist ovenfor.
  const faults = OUTER_CONDITION_TYPES.has(device.deviceType) ? [] : conditionToFaults(condition);
  const partPricesOre: number[] = [];
  for (const fault of faults) {
    const partOre = await lookupPartPriceOre(client, catalogModel, fault);
    if (partOre == null) return { status: "none", reason: `Ingen reservedelspris for ${fault}` };
    partPricesOre.push(partOre);
  }

  const family = guideFamily(device.model);
  const factor = family != null ? effectiveFactor(family, guideFactor(settings)) : guideFactor(settings);
  const price = computeGuidePrice({ baseOre: base.baseOre, partPricesOre, factor, worn: isWorn(condition) });
  const top = computeGuidePrice({ baseOre: base.baseOre, partPricesOre: [], factor });
  return { ...price, base, topOre: top.status === "priced" ? top.amountOre : undefined };
}

/**
 * Pristabel til en offentlig sælg-side. Tom liste, når prisen på forhånd er slået
 * fra, modellen ikke er med, eller databasen ikke svarer: siden virker som før.
 */
export async function loadSellPagePrices(
  client: SupabaseAdmin,
  model: string,
  device: { deviceType: string; brand: string } = { deviceType: "Telefon", brand: "Apple" },
): Promise<ModelPriceRow[]> {
  try {
    const settings = await loadBuybackSettings(client);
    if (!settings.publicPriceEnabled) return [];
    if (device.deviceType === "Telefon" && device.brand === "Apple" && guideFamily(model) != null) {
      const own = guidePricesForModel(await loadGuideListings(client), settings, model);
      if (own.length > 0) return own;
    }
    return referencePricesForModel(await loadReferencePrices(client), settings, { ...device, model });
  } catch {
    return [];
  }
}

/** Som guidePricesForModel, men fra referencelisten: kun lagerstørrelser med egen række. */
export function referencePricesForModel(
  references: ReferencePrice[],
  settings: BuybackSettings,
  device: { deviceType: string; brand: string; model: string },
): ModelPriceRow[] {
  const family = guideFamily(device.model);
  const factor = family != null ? effectiveFactor(family, guideFactor(settings)) : guideFactor(settings);
  const rows: ModelPriceRow[] = [];
  for (const gb of TABLE_STORAGES) {
    const base = baseFromReferences(references, { ...device, storage: `${gb >= 1024 ? gb / 1024 : gb}${gb >= 1024 ? "TB" : "GB"}` });
    if (!base || base.source !== "reference") continue;
    const perfect = computeGuidePrice({ baseOre: base.baseOre, partPricesOre: [], factor });
    if (perfect.status !== "priced") continue;
    const worn = computeGuidePrice({ baseOre: base.baseOre, partPricesOre: [], factor, worn: true });
    rows.push({ storageGb: gb, perfectDkk: perfect.amountOre / 100, wornDkk: worn.status === "priced" ? worn.amountOre / 100 : null });
  }
  return rows;
}

export type ModelPriceRow ={ storageGb: number; perfectDkk: number; wornDkk: number | null };

/**
 * Priser til sælg-siden for én model: fin stand og små ridser pr. lagerstørrelse,
 * uden fejl og med godt batteri. Kun lagerstørrelser, vi har salgspriser på selv
 * (ikke gættet ud fra større varianter), så tabellen aldrig lover for meget.
 */
export function guidePricesForModel(listings: GuideListing[], settings: BuybackSettings, model: string): ModelPriceRow[] {
  const family = guideFamily(model);
  if (family == null) return [];
  const wanted = normalizeModelName(model);
  const own = listings.filter((listing) => listing.model === wanted);
  const factor = effectiveFactor(family, guideFactor(settings));
  const rows: ModelPriceRow[] = [];
  for (const gb of TABLE_STORAGES) {
    const base = baseFromListings(own, gb);
    if (!base || base.source !== "exact") continue;
    const perfect = computeGuidePrice({ baseOre: base.baseOre, partPricesOre: [], factor });
    if (perfect.status !== "priced") continue;
    const worn = computeGuidePrice({ baseOre: base.baseOre, partPricesOre: [], factor, worn: true });
    rows.push({ storageGb: gb, perfectDkk: perfect.amountOre / 100, wornDkk: worn.status === "priced" ? worn.amountOre / 100 : null });
  }
  return rows;
}

export type GuideTableRow = {
  model: string;
  storageGb: number;
  baseDkk: number;
  dataPoints: number;
  source: BaseValue["source"];
  priced: boolean;
  amountDkk: number | null;
  marginDkk: number | null;
  reason: string | null;
};

const TABLE_STORAGES = [64, 128, 256, 512, 1024];

/** Oversigt til admin: prisen i fin stand for hver model og lagerstørrelse, vi har data til. */
export function guidePriceTable(listings: GuideListing[], settings: BuybackSettings): GuideTableRow[] {
  const models = new Map<string, GuideListing[]>();
  for (const listing of listings) {
    if (guideFamily(listing.model) == null) continue;
    models.set(listing.model, [...(models.get(listing.model) ?? []), listing]);
  }
  const rows: GuideTableRow[] = [];
  for (const [model, own] of models) {
    const family = guideFamily(model) as number;
    const sizes = new Set(own.map((listing) => listing.storageGb).filter((gb): gb is number => gb != null));
    const smallest = Math.min(...sizes);
    const largest = Math.max(...sizes);
    for (const gb of TABLE_STORAGES) {
      // Kun lagerstørrelser omkring dem, vi faktisk har set, så tabellen ikke gætter på varianter, der ikke findes.
      if (!sizes.size || gb < smallest / 2 || gb > largest * 2) continue;
      const base = baseFromListings(own, gb);
      if (!base) continue;
      const price = computeGuidePrice({ baseOre: base.baseOre, partPricesOre: [], factor: effectiveFactor(family, guideFactor(settings)) });
      rows.push({
        model: own[0].catalogModel,
        storageGb: gb,
        baseDkk: Math.round(base.baseOre / 100),
        dataPoints: base.dataPoints,
        source: base.source,
        priced: price.status === "priced",
        amountDkk: price.status === "priced" ? price.amountOre / 100 : null,
        marginDkk: price.status === "priced" ? Math.round(price.marginOre / 100) : null,
        reason: price.status === "none" ? price.reason : null,
      });
    }
  }
  return rows.sort((a, b) => a.model.localeCompare(b.model, "da", { numeric: true }) || a.storageGb - b.storageGb);
}

/**
 * Referencelistens rækker til admin-oversigten, i samme form som egne data.
 * Rækker, hvor vi selv har en præcis salgspris, springes over: dér bruges vores egen.
 */
export function referencePriceTable(
  references: ReferencePrice[],
  settings: BuybackSettings,
  ownRows: GuideTableRow[],
): GuideTableRow[] {
  const ownExact = new Set(
    ownRows.filter((row) => row.source === "exact").map((row) => `${normalizeModelName(row.model)}|${row.storageGb}`),
  );
  const rows: GuideTableRow[] = [];
  for (const ref of references) {
    const gb = storageGb(ref.storage) ?? 0;
    if (ref.deviceType === "Telefon" && lower(ref.brand) === "apple" && ownExact.has(`${normalizeModelName(ref.model)}|${gb}`)) continue;
    const family = guideFamily(ref.model);
    const factor = family != null ? effectiveFactor(family, guideFactor(settings)) : guideFactor(settings);
    const price = computeGuidePrice({ baseOre: ref.baseOre, partPricesOre: [], factor });
    const label = lower(ref.model).startsWith(lower(ref.brand)) || lower(ref.brand) === "apple" ? ref.model : `${ref.brand} ${ref.model}`;
    rows.push({
      model: [label, ref.ram ? `${ref.ram} RAM` : ""].filter(Boolean).join(" "),
      storageGb: gb,
      baseDkk: Math.round(ref.baseOre / 100),
      dataPoints: 0,
      source: "reference",
      priced: price.status === "priced",
      amountDkk: price.status === "priced" ? price.amountOre / 100 : null,
      marginDkk: price.status === "priced" ? Math.round(price.marginOre / 100) : null,
      reason: price.status === "none" ? price.reason : null,
    });
  }
  return rows.sort((a, b) => a.model.localeCompare(b.model, "da", { numeric: true }) || a.storageGb - b.storageGb);
}

export { GUIDE_PRICE };
