import { describe, it, expect } from "vitest";
import { hasFoxwayDevice, type ValidatedItem } from "../validate";

function mk(overrides: Partial<ValidatedItem>): ValidatedItem {
  return {
    item: { type: "device", deviceId: "d1", templateId: "t1", title: "X", grade: "A", color: "Sort", storage: "256GB SSD", image: null, price: 100000, reservedAt: "" },
    serverPrice: 100000,
    available: true,
    ...overrides,
  } as ValidatedItem;
}

describe("hasFoxwayDevice", () => {
  it("returns true when an available device comes from foxway", () => {
    expect(hasFoxwayDevice([mk({ deviceSource: "foxway" })])).toBe(true);
  });
  it("returns false for internal devices and sku items", () => {
    expect(hasFoxwayDevice([mk({ deviceSource: null })])).toBe(false);
    expect(hasFoxwayDevice([])).toBe(false);
  });
  it("ignores unavailable items", () => {
    expect(hasFoxwayDevice([mk({ deviceSource: "foxway", available: false })])).toBe(false);
  });
});
