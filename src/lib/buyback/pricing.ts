import type { BuybackSettings, PricingInputs, PricingResult, ResolvedFault } from "./types";
import { roundOfferDown } from "./rounding";

export function computeBuybackPrice(
  inputs: PricingInputs,
  settings: BuybackSettings,
): PricingResult {
  const base: Omit<PricingResult, "status" | "manualReason"> = {
    saleValueOre: inputs.saleValueOre,
    faults: [],
    totalDeductionOre: 0,
    targetMarginPct: settings.targetMarginPct,
    floorMarginOre: 0,
    aimOfferOre: 0,
    floorOfferOre: 0,
    ceilingOfferOre: inputs.competitorCeilingOre ?? null,
    expectedMarginUpsideOre: 0,
  };

  const manual = (reason: string): PricingResult => ({ ...base, status: "manual", manualReason: reason });

  if (inputs.cloudLocked) return manual("Enheden er iCloud-låst");
  if (!inputs.isApple) return manual("Ikke-Apple enhed — kræver manuel vurdering");
  if (!inputs.knownModel) return manual("Ukendt model — kræver manuel vurdering");
  if (inputs.saleValueOre == null) return manual("Ingen egen salgspris for modellen");

  const sale = inputs.saleValueOre;

  // Resolve faults; any unpriced reported fault → manual.
  const resolved: ResolvedFault[] = [];
  for (const f of inputs.faults) {
    if (f.partPriceOre == null) {
      return manual(`Ukendt reservedelspris for fejl: ${f.type}`);
    }
    resolved.push({
      type: f.type,
      partPriceOre: f.partPriceOre,
      cleaningProbability: settings.cleaningProbability[f.type] ?? 0,
    });
  }

  const totalDeductionOre = resolved.reduce((s, f) => s + f.partPriceOre, 0);
  const expectedMarginUpsideOre = resolved.reduce(
    (s, f) => s + Math.round(f.partPriceOre * f.cleaningProbability),
    0,
  );

  const floorMarginOre = Math.max(Math.round(sale * settings.floorMarginPct), settings.floorMarginMinOre);
  // Aim margin can never be smaller than the floor margin (e.g. on cheap models the kr-floor dominates).
  const aimMarginOre = Math.max(Math.round(sale * settings.targetMarginPct), floorMarginOre);

  // Round before the profitability check: an offer that only survives on
  // sub-50-kr precision is not an offer we should send.
  const aimOfferOre = roundOfferDown(sale - aimMarginOre - totalDeductionOre);
  const floorOfferOre = roundOfferDown(sale - floorMarginOre - totalDeductionOre);

  if (floorOfferOre <= 0 || aimOfferOre <= 0) {
    return manual("Enheden er for lidt værd til et rentabelt opkøb");
  }

  return {
    ...base,
    status: "ok",
    faults: resolved,
    totalDeductionOre,
    floorMarginOre,
    aimOfferOre,
    floorOfferOre,
    expectedMarginUpsideOre,
  };
}
