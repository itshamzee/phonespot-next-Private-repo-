import { describe, it, expect } from "vitest";
import { DEVICE_CATEGORIES, isDeviceCategory } from "../collections";

/**
 * Regression test for the OnePlus-10-Pro bug: [collection]/[product]/page.tsx
 * used to hardcode variant="accessory" for every sku_product, with no
 * category check. Most sku_products ARE accessories/spare parts, but at
 * least one published SKU (oneplus-10-pro-5g-256gb-12gb-rom, category:
 * "smartphone") is a genuine graded device that must get the 36-month
 * PhoneSpot warranty treatment, not the statutory 2-year reklamationsret
 * accessory treatment. isDeviceCategory() is the single source of truth the
 * product page branches on for ImageGalleryWithGrade, ProductInfo,
 * ProductDetails, TrustBar and FAQ selection.
 */
describe("isDeviceCategory", () => {
  it("treats a device-category SKU (e.g. the OnePlus 10 Pro smartphone SKU) as a device", () => {
    expect(isDeviceCategory("smartphone")).toBe(true);
  });

  it("treats every DEVICE_CATEGORIES entry as a device", () => {
    for (const category of DEVICE_CATEGORIES) {
      expect(isDeviceCategory(category)).toBe(true);
    }
  });

  it("treats an accessory-category SKU as an accessory, not a device", () => {
    expect(isDeviceCategory("accessory")).toBe(false);
  });

  it("treats a spare-part-category SKU as an accessory, not a device", () => {
    expect(isDeviceCategory("spare-part")).toBe(false);
  });

  it("treats null/undefined/empty category as an accessory, not a device", () => {
    expect(isDeviceCategory(null)).toBe(false);
    expect(isDeviceCategory(undefined)).toBe(false);
    expect(isDeviceCategory("")).toBe(false);
  });
});
