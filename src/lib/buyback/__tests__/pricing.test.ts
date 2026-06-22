import { describe, it, expect } from "vitest";
import { computeBuybackPrice } from "../pricing";
import type { BuybackSettings, PricingInputs } from "../types";

const settings: BuybackSettings = {
  targetMarginPct: 0.4,
  floorMarginPct: 0.3,
  floorMarginMinOre: 40000, // 400 kr
  cleaningProbability: { screen: 0, back_glass: 0, battery: 0, charging: 0.9 },
};

function inputs(overrides: Partial<PricingInputs> = {}): PricingInputs {
  return {
    saleValueOre: 300000, // 3000 kr
    faults: [],
    isApple: true,
    knownModel: true,
    cloudLocked: false,
    ...overrides,
  };
}

describe("computeBuybackPrice", () => {
  it("prices a perfect device: aim=40% margin, floor=30% margin", () => {
    const r = computeBuybackPrice(inputs(), settings);
    expect(r.status).toBe("ok");
    expect(r.totalDeductionOre).toBe(0);
    expect(r.floorMarginOre).toBe(90000); // max(30% of 3000kr, 400kr) = 900kr
    expect(r.aimOfferOre).toBe(180000); // 3000 − 1200(40%) − 0
    expect(r.floorOfferOre).toBe(210000); // 3000 − 900(30%) − 0
    expect(r.expectedMarginUpsideOre).toBe(0);
  });

  it("subtracts a screen part deduction", () => {
    const r = computeBuybackPrice(
      inputs({ faults: [{ type: "screen", partPriceOre: 33000 }] }),
      settings,
    );
    expect(r.totalDeductionOre).toBe(33000);
    expect(r.aimOfferOre).toBe(147000); // 180000 − 33000
    expect(r.floorOfferOre).toBe(177000); // 210000 − 33000
  });

  it("computes cleaning-margin upside for a charging fault (internal only)", () => {
    const r = computeBuybackPrice(
      inputs({ faults: [{ type: "charging", partPriceOre: 6000 }] }),
      settings,
    );
    expect(r.totalDeductionOre).toBe(6000); // customer-facing deduction is full part price
    expect(r.aimOfferOre).toBe(174000); // 180000 − 6000
    expect(r.expectedMarginUpsideOre).toBe(5400); // 6000 × 0.9
  });

  it("applies the absolute kr floor on cheap models (floor margin = 400 kr)", () => {
    const r = computeBuybackPrice(inputs({ saleValueOre: 100000 }), settings);
    expect(r.floorMarginOre).toBe(40000); // max(30% of 1000kr=300kr, 400kr) = 400kr
    expect(r.aimOfferOre).toBe(60000); // 1000 − 400(aim clamped up to floor) − 0
    expect(r.floorOfferOre).toBe(60000); // 1000 − 400 − 0  (no negotiation room)
  });

  it("flags manual when iCloud-locked", () => {
    const r = computeBuybackPrice(inputs({ cloudLocked: true }), settings);
    expect(r.status).toBe("manual");
    expect(r.manualReason).toMatch(/icloud|låst/i);
  });

  it("flags manual for non-Apple", () => {
    expect(computeBuybackPrice(inputs({ isApple: false }), settings).status).toBe("manual");
  });

  it("flags manual when base value is missing", () => {
    expect(computeBuybackPrice(inputs({ saleValueOre: null }), settings).status).toBe("manual");
  });

  it("flags manual when a reported fault has no part price", () => {
    const r = computeBuybackPrice(
      inputs({ faults: [{ type: "screen", partPriceOre: null }] }),
      settings,
    );
    expect(r.status).toBe("manual");
    expect(r.manualReason).toMatch(/reservedel|part|screen/i);
  });

  it("flags manual when the device is worth too little to buy profitably", () => {
    const r = computeBuybackPrice(
      inputs({ saleValueOre: 50000, faults: [{ type: "screen", partPriceOre: 33000 }] }),
      settings,
    );
    expect(r.status).toBe("manual"); // floor offer would be ≤ 0
  });

  it("carries competitor ceiling through untouched (Plan 3 consumes it)", () => {
    const r = computeBuybackPrice(inputs({ competitorCeilingOre: 250000 }), settings);
    expect(r.ceilingOfferOre).toBe(250000);
  });
});
