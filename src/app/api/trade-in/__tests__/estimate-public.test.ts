import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/buyback/estimate", () => ({
  estimateBuyback: vi.fn(),
}));

import { estimateBuyback } from "@/lib/buyback/estimate";
import { GET } from "@/app/api/trade-in/estimate-public/route";

function req(qs: string) {
  return new Request(`https://phonespot.dk/api/trade-in/estimate-public?${qs}`);
}

describe("public trade-in estimate", () => {
  it("never leaks margin, floor-margin, deductions or sale value", async () => {
    (estimateBuyback as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "ok", saleValueOre: 1240000, totalDeductionOre: 20000,
      floorMarginOre: 40000, aimOfferOre: 700000, floorOfferOre: 600000,
      expectedMarginUpsideOre: 90000,
    });
    const res = await GET(req("model=MacBook%20Air%2015%20M4"));
    const body = await res.json();
    const keys = Object.keys(body);
    for (const leak of ["saleValueOre", "totalDeductionOre", "floorMarginOre", "aimOfferOre", "expectedMarginUpsideOre"]) {
      expect(keys).not.toContain(leak);
    }
    expect(body.available).toBe(true);
    expect(typeof body.lowOre).toBe("number");
    expect(typeof body.highOre).toBe("number");
  });

  it("publishes a conservative range capped by the floor offer, rounded to whole hundreds of kroner", async () => {
    (estimateBuyback as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "ok", saleValueOre: 1240000, totalDeductionOre: 0,
      floorMarginOre: 0, aimOfferOre: 700000, floorOfferOre: 612345,
      expectedMarginUpsideOre: 0,
    });
    const res = await GET(req("model=MacBook%20Air%2015%20M4"));
    const body = await res.json();
    expect(body.highOre).toBeLessThanOrEqual(612345);
    expect(body.highOre % 10000).toBe(0);
    expect(body.lowOre % 10000).toBe(0);
    expect(body.lowOre).toBeLessThan(body.highOre);
  });

  it("reports unavailable rather than guessing when the engine says manual", async () => {
    (estimateBuyback as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "manual" });
    const res = await GET(req("model=Nokia%203310"));
    expect(await res.json()).toEqual({ available: false });
  });

  it("reports unavailable when no model is supplied", async () => {
    const res = await GET(req(""));
    expect(await res.json()).toEqual({ available: false });
  });
});
