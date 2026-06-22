import { describe, it, expect } from "vitest";
import { conditionToFaults, faultCategoryKeywords, faultQualityKeywords } from "../fault-mapping";
import type { BuybackCondition } from "../types";

// Defaults use the REAL wizard option strings (sell-device-wizard.tsx).
function cond(overrides: Partial<BuybackCondition> = {}): BuybackCondition {
  return {
    screen: "Perfekt",
    back: "Perfekt",
    battery: "God (80%+)",
    allWorking: "Ja",
    brokenParts: [],
    cloudLocked: "Nej",
    ...overrides,
  };
}

describe("conditionToFaults", () => {
  it("returns no faults for a perfect device (80%+ battery)", () => {
    expect(conditionToFaults(cond())).toEqual([]);
  });

  it("does NOT flag a healthy 80%+ battery as a fault", () => {
    expect(conditionToFaults(cond({ battery: "God (80%+)" }))).not.toContain("battery");
  });

  it("does NOT flag cosmetic 'Små ridser' screen wear", () => {
    expect(conditionToFaults(cond({ screen: "Små ridser" }))).not.toContain("screen");
  });

  it("flags a cracked screen", () => {
    expect(conditionToFaults(cond({ screen: "Revnet" }))).toContain("screen");
  });

  it("flags a non-working screen", () => {
    expect(conditionToFaults(cond({ screen: "Virker ikke" }))).toContain("screen");
  });

  it("flags cracked back glass", () => {
    expect(conditionToFaults(cond({ back: "Revnet" }))).toContain("back_glass");
  });

  it("flags an Okay (60-80%) battery for deduction", () => {
    expect(conditionToFaults(cond({ battery: "Okay (60-80%)" }))).toContain("battery");
  });

  it("flags a poor battery", () => {
    expect(conditionToFaults(cond({ battery: "Dårligt (<60%)" }))).toContain("battery");
  });

  it("maps the real 'Opladning' broken part to charging", () => {
    expect(conditionToFaults(cond({ brokenParts: ["Opladning"] }))).toContain("charging");
  });

  it("does not duplicate a fault present in both fields", () => {
    const faults = conditionToFaults(cond({ screen: "Revnet", brokenParts: ["Skærm-touch"] }));
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
