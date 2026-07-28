import { describe, it, expect } from "vitest";
import { conditionToFaults, unpriceableBrokenParts, faultCategories, originalQualities } from "../fault-mapping";
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

describe("unpriceableBrokenParts", () => {
  it("returns nothing when no parts are reported", () => {
    expect(unpriceableBrokenParts(cond())).toEqual([]);
  });

  it("returns nothing for parts we can price", () => {
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Opladning"] }))).toEqual([]);
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Skærm-touch"] }))).toEqual([]);
  });

  it("flags every unpriceable part the wizard offers", () => {
    const parts = ["Kamera", "Højtaler", "Mikrofon", "WiFi", "Bluetooth", "Knapper", "Face ID", "Tastatur", "Trackpad", "USB-porte"];
    expect(unpriceableBrokenParts(cond({ brokenParts: parts }))).toEqual(parts);
  });

  it("separates priceable from unpriceable in a mixed list", () => {
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Opladning", "Kamera"] }))).toEqual(["Kamera"]);
  });

  it("treats an unrecognised part as unpriceable", () => {
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Vandskade"] }))).toEqual(["Vandskade"]);
  });
});

describe("catalog maps", () => {
  it("maps every fault type to at least one real catalog category", () => {
    for (const fault of ["screen", "back_glass", "battery", "charging"] as const) {
      expect(faultCategories[fault].length).toBeGreaterThan(0);
    }
  });

  it("uses the exact category names the catalog stores", () => {
    expect(faultCategories.screen).toEqual(["Display"]);
    expect(faultCategories.back_glass).toEqual(["Back Cover"]);
    expect(faultCategories.battery).toEqual(["Battery"]);
    expect(faultCategories.charging).toEqual(["Charging Connector"]);
  });

  it("accepts only the genuine quality tiers we would actually fit", () => {
    expect(originalQualities).toEqual(["service pack", "pulled a", "refurbished"]);
  });

  it("excludes aftermarket and low-grade pulled tiers", () => {
    for (const tier of ["oem-equivalent", "in-cell", "aftermarket", "fdx pro", "pulled b", "pulled c"]) {
      expect(originalQualities).not.toContain(tier);
    }
  });
});
