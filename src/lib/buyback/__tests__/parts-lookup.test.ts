import { describe, it, expect } from "vitest";
import { lookupPartPriceOre } from "../parts-lookup";
import { makeFakeClient } from "./fake-supabase";

// Representative foneday_catalog rows for iPhone 12 (price_dkk in øre).
const catalog = [
  { category: "Display", quality: "FDX Pro", price_dkk: 11000, in_stock: true, model_codes: ["iPhone 12"], suitable_for: "Apple iPhone 12", title: "FDX Pro Display iPhone 12" },
  { category: "Display", quality: "Refurbished", price_dkk: 44000, in_stock: true, model_codes: ["iPhone 12"], suitable_for: "Apple iPhone 12", title: "Display Refurbished iPhone 12" },
  { category: "Display", quality: "Refurbished", price_dkk: 41000, in_stock: false, model_codes: ["iPhone 12"], suitable_for: "Apple iPhone 12", title: "Display Refurbished iPhone 12 (oos)" },
  { category: "Battery", quality: "Pulled", price_dkk: 13000, in_stock: true, model_codes: ["iPhone 12"], suitable_for: "Apple iPhone 12", title: "Battery Pulled iPhone 12" },
  { category: "Charging Connector", quality: "Pulled", price_dkk: 6000, in_stock: true, model_codes: ["iPhone 12"], suitable_for: "Apple iPhone 12", title: "Charging Connector iPhone 12" },
];

describe("lookupPartPriceOre", () => {
  it("returns the cheapest in-stock ORIGINAL display price (ignores FDX aftermarket)", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    const price = await lookupPartPriceOre(client, "iPhone 12", "screen");
    expect(price).toBe(44000); // 41000 is original but out of stock
  });

  it("finds the battery (original) price", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    expect(await lookupPartPriceOre(client, "iPhone 12", "battery")).toBe(13000);
  });

  it("finds the charging connector price", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    expect(await lookupPartPriceOre(client, "iPhone 12", "charging")).toBe(6000);
  });

  it("returns null when no original-quality in-stock part exists", async () => {
    const { client } = makeFakeClient({
      foneday_catalog: [catalog[0]], // FDX only, no original
    });
    expect(await lookupPartPriceOre(client, "iPhone 12", "screen")).toBeNull();
  });

  it("queries foneday_catalog filtered by model and stock", async () => {
    const { client, calls } = makeFakeClient({ foneday_catalog: catalog });
    await lookupPartPriceOre(client, "iPhone 12", "screen");
    const call = calls.find((c) => c.table === "foneday_catalog");
    expect(call).toBeTruthy();
    expect(call?.ops).toContainEqual(["contains", "model_codes", ["iPhone 12"]]);
    expect(call?.ops).toContainEqual(["eq", "in_stock", true]);
  });
});
