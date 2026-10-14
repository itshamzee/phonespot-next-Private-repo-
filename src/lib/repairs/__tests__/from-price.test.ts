import { describe, expect, it } from "vitest";
import { countsTowardFromPrice } from "../from-price";

describe("countsTowardFromPrice", () => {
  it("skips diagnostics and free services", () => {
    expect(countsTowardFromPrice({ price_dkk: 248, service_category: "Diagnostik" })).toBe(false);
    expect(countsTowardFromPrice({ price_dkk: 249, name: "Diagnose" })).toBe(false);
    expect(countsTowardFromPrice({ price_dkk: 0, service_category: "Skærmskift" })).toBe(false);
  });

  it("counts real repairs", () => {
    expect(countsTowardFromPrice({ price_dkk: 399, service_category: "Højttaler" })).toBe(true);
  });
});
