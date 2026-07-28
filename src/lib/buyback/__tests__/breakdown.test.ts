import { describe, it, expect } from "vitest";
import { explainPricing } from "../breakdown";
import type { PricingResult } from "../types";

function result(o: Partial<PricingResult> = {}): PricingResult {
  return {
    status: "ok",
    saleValueOre: 300000,
    faults: [],
    totalDeductionOre: 0,
    targetMarginPct: 0.4,
    floorMarginOre: 90000,
    aimOfferOre: 180000,
    floorOfferOre: 210000,
    ceilingOfferOre: null,
    expectedMarginUpsideOre: 0,
    ...o,
  };
}

describe("explainPricing", () => {
  it("explains a device with no faults", () => {
    expect(explainPricing(result())).toBe("Egen salgspris 3.000 − margin 1.200 = 1.800 kr");
  });

  it("names each fault deduction", () => {
    const r = result({
      faults: [{ type: "screen", partPriceOre: 33000, cleaningProbability: 0 }],
      totalDeductionOre: 33000,
      aimOfferOre: 145000,
    });
    expect(explainPricing(r)).toBe("Egen salgspris 3.000 − margin 1.220 − skærm 330 = 1.450 kr");
  });

  it("lists several faults in order", () => {
    const r = result({
      faults: [
        { type: "screen", partPriceOre: 33000, cleaningProbability: 0 },
        { type: "battery", partPriceOre: 13000, cleaningProbability: 0 },
      ],
      totalDeductionOre: 46000,
      aimOfferOre: 130000,
    });
    expect(explainPricing(r)).toContain("− skærm 330 − batteri 130");
  });

  it("returns an empty string for a manual result", () => {
    expect(explainPricing(result({ status: "manual", manualReason: "iCloud-låst" }))).toBe("");
  });

  it("returns an empty string when there is no base value", () => {
    expect(explainPricing(result({ saleValueOre: null }))).toBe("");
  });
});
