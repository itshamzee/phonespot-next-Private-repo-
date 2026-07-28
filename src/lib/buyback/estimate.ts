import type { createAdminClient } from "@/lib/supabase/admin";
import type { BuybackCondition, BuybackDevice, BuybackSettings, PricingInputs, PricingResult } from "./types";
import { normalizeModel } from "./model-normalize";
import { conditionToFaults, unpriceableBrokenParts } from "./fault-mapping";
import { lookupBaseValueOre } from "./base-value";
import { lookupPartPriceOre } from "./parts-lookup";
import { computeBuybackPrice } from "./pricing";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export async function estimateBuyback(
  client: SupabaseAdmin,
  device: BuybackDevice,
  condition: BuybackCondition,
  settings: BuybackSettings,
): Promise<PricingResult> {
  const { templateModel, isApple, knownModel } = normalizeModel(device.brand, device.model);
  const cloudLocked = (condition.cloudLocked ?? "").trim().toLowerCase() === "ja";

  // Short-circuit cases that don't need DB lookups.
  // NOTE: `knownModel` only means a non-empty model string was supplied — NOT that
  // the model exists in our catalog. A non-empty but unknown model (e.g. "iPhone 99")
  // passes this guard and is caught downstream when lookupBaseValueOre returns null
  // (computeBuybackPrice then flags manual via its saleValueOre == null branch).
  const earlyInputs: PricingInputs = {
    saleValueOre: null,
    faults: [],
    isApple,
    knownModel,
    cloudLocked,
  };
  if (cloudLocked || !isApple || !knownModel) {
    return computeBuybackPrice(earlyInputs, settings);
  }

  // Reported faults we have no part price for must never be auto-priced: the
  // device would be valued as if the fault did not exist.
  const unpriceable = unpriceableBrokenParts(condition);
  if (unpriceable.length > 0) {
    return {
      ...computeBuybackPrice(earlyInputs, settings),
      status: "manual",
      manualReason: `Defekte dele kan ikke prissættes: ${unpriceable.join(", ")}`,
    };
  }

  const saleValueOre = await lookupBaseValueOre(client, templateModel, device.storage);

  const faultTypes = conditionToFaults(condition);
  const faults = await Promise.all(
    faultTypes.map(async (type) => ({
      type,
      partPriceOre: await lookupPartPriceOre(client, templateModel, type),
    })),
  );

  return computeBuybackPrice(
    { saleValueOre, faults, isApple, knownModel, cloudLocked },
    settings,
  );
}
