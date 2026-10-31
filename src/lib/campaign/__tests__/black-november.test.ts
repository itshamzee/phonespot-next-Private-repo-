import { describe, expect, it } from "vitest";
import {
  BLACK_NOVEMBER,
  blackNovemberDevicePrice,
  blackNovemberSkuPrice,
  isBlackNovember,
  isCampaignAccessory,
  repairDiscountIsCampaign,
  repairDiscountPercent,
  withBlackNovemberSku,
} from "../black-november";

const before = Date.parse("2026-10-31T23:59:59+01:00");
const first = Date.parse("2026-11-01T00:00:00+01:00");
const mid = Date.parse("2026-11-15T12:00:00+01:00");
const last = Date.parse("2026-11-30T23:59:59+01:00");
const after = Date.parse("2026-12-01T00:00:00+01:00");

describe("Black November window", () => {
  it("runs 1.–30. november in Danish time", () => {
    expect(isBlackNovember(before)).toBe(false);
    expect(isBlackNovember(first)).toBe(true);
    expect(isBlackNovember(last)).toBe(true);
    expect(isBlackNovember(after)).toBe(false);
  });
});

describe("repairs", () => {
  it("gives 10 % from the first repair and keeps 15 % for three or more", () => {
    expect(repairDiscountPercent(0, mid)).toBe(0);
    expect(repairDiscountPercent(1, mid)).toBe(10);
    expect(repairDiscountPercent(2, mid)).toBe(10);
    expect(repairDiscountPercent(3, mid)).toBe(15);
    expect(repairDiscountIsCampaign(1, mid)).toBe(true);
    expect(repairDiscountIsCampaign(3, mid)).toBe(false);
  });
  it("falls back to the volume discount outside November", () => {
    expect(repairDiscountPercent(1, after)).toBe(0);
    expect(repairDiscountPercent(2, after)).toBe(10);
    expect(repairDiscountIsCampaign(1, after)).toBe(false);
  });
});

describe("used devices", () => {
  it("takes 5 % and rounds down to whole kroner", () => {
    expect(blackNovemberDevicePrice(499900, "A", mid)).toBe(474900);
    expect(blackNovemberDevicePrice(345000, "B", mid)).toBe(327700);
  });
  it("leaves factory-new devices and other months alone", () => {
    expect(blackNovemberDevicePrice(499900, "N", mid)).toBe(499900);
    expect(blackNovemberDevicePrice(499900, "A", after)).toBe(499900);
  });
});

describe("covers and glass", () => {
  const glass = { category: "accessory", subcategory: "screen_protector", title: "Rixus Privacy glas" };
  const cover = { category: "accessory", subcategory: "cover", title: "Rixus Armor-X cover", attributes: { case_type: "Clear" } };
  const wallet = { category: "accessory", subcategory: "cover", title: "Rixus Duo pungcover", attributes: { case_type: "Wallet" } };
  const lagersalg = { category: "accessory", subcategory: "cover", title: "Samsung silikonecover", attributes: { udsalg: "Ja" } };
  const charger = { category: "accessory", subcategory: "charger", title: "Oplader" };

  it("caps covers and glass at 199 kr. without raising cheaper items", () => {
    expect(blackNovemberSkuPrice(glass, 34900, mid)).toBe(19900);
    expect(blackNovemberSkuPrice(cover, 24900, mid)).toBe(19900);
    expect(blackNovemberSkuPrice(cover, 12900, mid)).toBe(12900);
  });
  it("excludes book cases, lagersalg and other categories", () => {
    expect(isCampaignAccessory(wallet)).toBe(false);
    expect(isCampaignAccessory({ ...wallet, attributes: {}, title: "Flipcover til Galaxy S21" })).toBe(false);
    expect(isCampaignAccessory(lagersalg)).toBe(false);
    expect(isCampaignAccessory({ ...cover, lagersalg: true })).toBe(false);
    expect(isCampaignAccessory(charger)).toBe(false);
    // Glas er aldrig lagersalg, heller ikke med udsalg-attributten.
    expect(isCampaignAccessory({ ...glass, attributes: { udsalg: "Ja" } })).toBe(true);
  });
  it("writes the campaign price as sale_price and keeps the list price", () => {
    const row = withBlackNovemberSku({ ...cover, selling_price: 27900, sale_price: null }, mid);
    expect(row.sale_price).toBe(BLACK_NOVEMBER.accessoryPriceOere);
    expect(row.selling_price).toBe(27900);
    expect(row.black_november).toBe(true);
    const outside = withBlackNovemberSku({ ...cover, selling_price: 27900, sale_price: null }, after);
    expect(outside.sale_price).toBeNull();
  });
});
