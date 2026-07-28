import { describe, it, expect } from "vitest";
import { lookupFallbackBaseOre } from "../fallback-prices";
import { makeFakeClient } from "./fake-supabase";
import type { BuybackDevice } from "../types";

function device(o: Partial<BuybackDevice> = {}): BuybackDevice {
  return {
    deviceType: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB",
    ram: "", useCustom: false, brandCustom: "", modelCustom: "", ...o,
  };
}

const rows = [
  { device_type: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: null, base_price: 250000, active: true },
  { device_type: "Telefon", brand: "Apple", model: "iPhone 12", storage: "256GB", ram: null, base_price: 290000, active: true },
  { device_type: "Telefon", brand: "Apple", model: "iPhone 11", storage: null, ram: null, base_price: 150000, active: true },
  { device_type: "Telefon", brand: "Apple", model: "iPhone X", storage: "64GB", ram: null, base_price: 90000, active: false },
];

describe("lookupFallbackBaseOre", () => {
  it("matches on device type, brand, model and storage", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device())).toBe(250000);
  });

  it("matches the right storage variant", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ storage: "256GB" }))).toBe(290000);
  });

  it("ignores case and surrounding whitespace", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ brand: "  apple ", model: "IPHONE 12" }))).toBe(250000);
  });

  it("matches a row with no storage when the device has none", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ model: "iPhone 11", storage: "" }))).toBe(150000);
  });

  it("ignores inactive rows", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ model: "iPhone X", storage: "64GB" }))).toBeNull();
  });

  it("returns null when nothing matches", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ model: "iPhone 99" }))).toBeNull();
  });

  it("returns null when the table is empty", async () => {
    const { client } = makeFakeClient({ buyback_prices: [] });
    expect(await lookupFallbackBaseOre(client, device())).toBeNull();
  });
});
