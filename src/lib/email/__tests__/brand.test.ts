import { describe, it, expect } from "vitest";
import {
  BRAND,
  hasGuaranteeQualifyingDevice,
  guaranteeUspLabel,
  qualityTestUspLabel,
  uspsForOrder,
} from "@/lib/email/brand";

describe("hasGuaranteeQualifyingDevice", () => {
  it("returns false for an accessory-only order (item_type sku_product, non-device category)", () => {
    const items = [
      { itemType: "sku_product" as const, category: "accessory" },
      { itemType: "sku_product" as const, category: "spare-part" },
    ];
    expect(hasGuaranteeQualifyingDevice(items)).toBe(false);
  });

  it("returns true for a device item (item_type device)", () => {
    const items = [{ itemType: "device" as const }];
    expect(hasGuaranteeQualifyingDevice(items)).toBe(true);
  });

  it("returns true for a mixed order (device + accessory)", () => {
    const items = [
      { itemType: "device" as const },
      { itemType: "sku_product" as const, category: "accessory" },
    ];
    expect(hasGuaranteeQualifyingDevice(items)).toBe(true);
  });

  it("returns true when a sku_product is in a device category (e.g. a phone sold as a sku_product)", () => {
    const items = [{ itemType: "sku_product" as const, category: "smartphone" }];
    expect(hasGuaranteeQualifyingDevice(items)).toBe(true);
  });

  it("falls back to the SAFE wording (false) when items is null", () => {
    expect(hasGuaranteeQualifyingDevice(null)).toBe(false);
  });

  it("falls back to the SAFE wording (false) when items is undefined", () => {
    expect(hasGuaranteeQualifyingDevice(undefined)).toBe(false);
  });

  it("falls back to the SAFE wording (false) when items is an empty array", () => {
    expect(hasGuaranteeQualifyingDevice([])).toBe(false);
  });

  it("treats a sku_product with a missing/null category as an accessory, not a device", () => {
    const items = [{ itemType: "sku_product" as const, category: null }];
    expect(hasGuaranteeQualifyingDevice(items)).toBe(false);
  });
});

describe("guaranteeUspLabel", () => {
  it("returns the 36-month guarantee wording when a device is present", () => {
    expect(guaranteeUspLabel(true)).toBe("36 mdr. garanti");
  });

  it("returns the statutory reklamationsret wording when no device is present", () => {
    expect(guaranteeUspLabel(false)).toBe("2 års reklamationsret");
  });
});

describe("qualityTestUspLabel", () => {
  it("returns the 30+ quality-test wording when a device is present", () => {
    expect(qualityTestUspLabel(true)).toBe("30+ kvalitetstests");
  });

  it("returns a claim that's true of every order when no device is present", () => {
    expect(qualityTestUspLabel(false)).toBe("Hurtig levering");
  });
});

describe("uspsForOrder", () => {
  it("keeps every other USP unchanged, only swapping the guarantee and quality-test lines", () => {
    const withDevice = uspsForOrder(true);
    const withoutDevice = uspsForOrder(false);

    expect(withDevice).toEqual(BRAND.usps);
    expect(withoutDevice).toEqual([
      "2 års reklamationsret",
      "14 dages returret",
      "Hurtig levering",
      "Gratis afhentning i butik",
    ]);
  });

  it("never contains the 36-month claim when hasDevice is false", () => {
    const usps = uspsForOrder(false);
    expect(usps.some((u) => u.includes("36 mdr"))).toBe(false);
  });

  it("never contains the 30+ quality-test claim when hasDevice is false", () => {
    const usps = uspsForOrder(false);
    expect(usps.some((u) => u.includes("30+"))).toBe(false);
  });

  it("keeps the 30+ quality-test claim when hasDevice is true", () => {
    const usps = uspsForOrder(true);
    expect(usps).toContain("30+ kvalitetstests");
  });
});

// Integration-shaped regression test: exercises the exact call pattern every
// order email uses — uspsForOrder(hasGuaranteeQualifyingDevice(items)) — for
// the three cases that matter for the quality-test claim specifically.
describe("uspsForOrder(hasGuaranteeQualifyingDevice(items)) — quality-test claim by order shape", () => {
  it("drops the 30+ quality-test claim for an accessory-only order", () => {
    const items = [
      { itemType: "sku_product" as const, category: "accessory" },
      { itemType: "sku_product" as const, category: "spare-part" },
    ];
    const usps = uspsForOrder(hasGuaranteeQualifyingDevice(items));
    expect(usps).not.toContain("30+ kvalitetstests");
    expect(usps).toContain("Hurtig levering");
  });

  it("keeps the 30+ quality-test claim for a mixed order (device + accessory)", () => {
    const items = [
      { itemType: "device" as const },
      { itemType: "sku_product" as const, category: "accessory" },
    ];
    const usps = uspsForOrder(hasGuaranteeQualifyingDevice(items));
    expect(usps).toContain("30+ kvalitetstests");
  });

  it("falls back to the SAFE wording (no over-claim) when items is unknown", () => {
    expect(() => uspsForOrder(hasGuaranteeQualifyingDevice(undefined))).not.toThrow();
    expect(() => uspsForOrder(hasGuaranteeQualifyingDevice(null))).not.toThrow();
    expect(() => uspsForOrder(hasGuaranteeQualifyingDevice([]))).not.toThrow();

    const usps = uspsForOrder(hasGuaranteeQualifyingDevice(undefined));
    expect(usps).not.toContain("30+ kvalitetstests");
    expect(usps).not.toContain("36 mdr. garanti");
  });
});
