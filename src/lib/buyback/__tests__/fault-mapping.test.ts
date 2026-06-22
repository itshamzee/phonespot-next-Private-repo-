import { describe, it, expect } from "vitest";
import { conditionToFaults, faultCategoryKeywords, faultQualityKeywords } from "../fault-mapping";
import type { BuybackCondition } from "../types";

function cond(overrides: Partial<BuybackCondition> = {}): BuybackCondition {
  return {
    screen: "Perfekt",
    back: "Perfekt",
    battery: "God",
    allWorking: "Ja",
    brokenParts: [],
    cloudLocked: "Nej",
    ...overrides,
  };
}

describe("conditionToFaults", () => {
  it("returns no faults for a perfect device", () => {
    expect(conditionToFaults(cond())).toEqual([]);
  });

  it("flags a cracked screen", () => {
    expect(conditionToFaults(cond({ screen: "Revnet" }))).toContain("screen");
  });

  it("flags broken back glass", () => {
    expect(conditionToFaults(cond({ back: "Knust" }))).toContain("back_glass");
  });

  it("flags a worn battery", () => {
    expect(conditionToFaults(cond({ battery: "Dårlig" }))).toContain("battery");
  });

  it("maps a 'Ladestik' broken part to charging", () => {
    expect(conditionToFaults(cond({ brokenParts: ["Ladestik"] }))).toContain("charging");
  });

  it("does not duplicate a fault present in both fields", () => {
    const faults = conditionToFaults(cond({ screen: "Knust", brokenParts: ["Skærm"] }));
    expect(faults.filter((f) => f === "screen")).toHaveLength(1);
  });
});

describe("keyword maps", () => {
  it("has category keywords for every fault type", () => {
    expect(faultCategoryKeywords.screen.length).toBeGreaterThan(0);
    expect(faultCategoryKeywords.charging.length).toBeGreaterThan(0);
  });

  it("original quality keywords include genuine tiers", () => {
    expect(faultQualityKeywords).toContain("pulled");
    expect(faultQualityKeywords).toContain("refurbished");
    expect(faultQualityKeywords).toContain("service");
  });
});
