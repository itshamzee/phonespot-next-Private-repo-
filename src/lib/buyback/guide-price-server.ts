/**
 * Databasedelen af den vejledende opkøbspris: henter vores listede salgspriser
 * og reservedelspriser og fodrer den rene formel i guide-price.ts.
 */
import type { createAdminClient } from "@/lib/supabase/admin";
import type { BuybackCondition, BuybackDevice, BuybackSettings } from "./types";
import { conditionToFaults, unpriceableBrokenParts } from "./fault-mapping";
import { lookupPartPriceOre } from "./parts-lookup";
import {
  DEFAULT_GUIDE_FACTOR,
  GUIDE_PRICE,
  baseFromListings,
  computeGuidePrice,
  effectiveFactor,
  guideFamily,
  normalizeModelName,
  storageGb,
  type BaseValue,
  type GuidePrice,
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

/** Årsager til, at en enhed aldrig får en pris på forhånd, uanset data. */
function blockedReason(device: BuybackDevice, condition: BuybackCondition): string | null {
  if (device.useCustom) return "Model skrevet i fritekst";
  if ((device.deviceType ?? "") !== "Telefon" || (device.brand ?? "").trim().toLowerCase() !== "apple") return "Kun iPhone i første runde";
  if (guideFamily(device.model) == null) return "Model uden for iPhone 12-17";
  if (storageGb(device.storage) == null) return "Lagerplads mangler";
  if ((condition.cloudLocked ?? "").trim().toLowerCase() === "ja") return "iCloud-låst";
  if ((condition.screen ?? "").trim().toLowerCase() === "virker ikke") return "Skærmen virker ikke";
  if (unpriceableBrokenParts(condition).length > 0) return "Fejl, vi ikke kan prissætte på forhånd";
  return null;
}

export type GuideEstimate = GuidePrice & { base?: BaseValue };

/**
 * Vejledende pris for én enhed. Viser ingen pris, når funktionen er slået fra
 * (medmindre `ignoreSwitch` er sat, som admin-oversigten bruger).
 */
export async function estimateGuidePrice(
  client: SupabaseAdmin,
  device: BuybackDevice,
  condition: BuybackCondition,
  settings: BuybackSettings,
  options: { ignoreSwitch?: boolean; listings?: GuideListing[] } = {},
): Promise<GuideEstimate> {
  if (!settings.publicPriceEnabled && !options.ignoreSwitch) return { status: "none", reason: "Slået fra" };
  const blocked = blockedReason(device, condition);
  if (blocked) return { status: "none", reason: blocked };

  const family = guideFamily(device.model) as number;
  const wantedGb = storageGb(device.storage) as number;
  const listings = options.listings ?? (await loadGuideListings(client));
  const model = normalizeModelName(device.model);
  const own = listings.filter((listing) => listing.model === model);
  const base = baseFromListings(own, wantedGb);
  if (!base) return { status: "none", reason: "For få salgspriser på modellen" };

  const catalogModel = own[0]?.catalogModel ?? device.model;
  const partPricesOre: number[] = [];
  for (const fault of conditionToFaults(condition)) {
    const partOre = await lookupPartPriceOre(client, catalogModel, fault);
    if (partOre == null) return { status: "none", reason: `Ingen reservedelspris for ${fault}` };
    partPricesOre.push(partOre);
  }

  return { ...computeGuidePrice({ baseOre: base.baseOre, partPricesOre, factor: effectiveFactor(family, guideFactor(settings)) }), base };
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

export { GUIDE_PRICE };
