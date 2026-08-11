import { describe, it, expect } from "vitest";
import {
  BRAND,
  hasGuaranteeQualifyingDevice,
  guaranteeUspLabel,
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

describe("uspsForOrder", () => {
  it("keeps every other USP unchanged, only swapping the guarantee line", () => {
    const withDevice = uspsForOrder(true);
    const withoutDevice = uspsForOrder(false);

    expect(withDevice).toEqual(BRAND.usps);
    expect(withoutDevice).toEqual([
      "2 års reklamationsret",
      ...BRAND.usps.slice(1),
    ]);
  });

  it("never contains the 36-month claim when hasDevice is false", () => {
    const usps = uspsForOrder(false);
    expect(usps.some((u) => u.includes("36 mdr"))).toBe(false);
  });
});
