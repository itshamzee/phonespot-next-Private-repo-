import { describe, it, expect } from "vitest";
import { lookupPartPriceOre, catalogModelName } from "../parts-lookup";
import { makeFakeClient } from "./fake-supabase";

// Rows shaped like the real foneday_catalog, verified against live data on
// 2026-07-28: model_codes hold manufacturer part numbers, suitable_for holds the
// marketing name as a comma-separated list, price_dkk is øre.
const catalog = [
  { category: "Display", quality: "OEM-Equivalent", price_dkk: 11000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Display OEM-Equivalent" },
  { category: "Display", quality: "Refurbished", price_dkk: 44000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Display Refurbished" },
  { category: "Display", quality: "Refurbished", price_dkk: 41000, in_stock: false, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Display Refurbished (oos)" },
  { category: "Display", quality: "Service Pack", price_dkk: 74000, in_stock: true, model_codes: ["A2484"], suitable_for: "iPhone 13 Pro Max", title: "Display Service Pack" },
  { category: "Battery", quality: "Pulled A", price_dkk: 13000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12, iPhone 12 Pro", title: "Battery Pulled A" },
  { category: "Battery", quality: "Pulled C", price_dkk: 4000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Battery Pulled C" },
  { category: "Charging Connector", quality: "Pulled A", price_dkk: 6000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Charging Connector Pulled A" },
  { category: "Back Cover", quality: "Refurbished", price_dkk: 32000, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Back Cover Refurbished" },
  // Traps: cheap rows that a loose category+title substring match would pick up.
  { category: "Adhesive tapes", quality: "Service Pack", price_dkk: 600, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Adhesive tape for Back Cover" },
  { category: "Softcase", quality: "Service Pack", price_dkk: 900, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Back cover case, clear" },
  { category: "Camera Lens", quality: "Service Pack", price_dkk: 500, in_stock: true, model_codes: ["A2172"], suitable_for: "iPhone 12", title: "Rear camera lens glass" },
];

describe("catalogModelName", () => {
  it("passes a plain model through", () => {
    expect(catalogModelName("iPhone 12")).toBe("iphone 12");
  });

  it("drops the parentheses our templates use around SE years", () => {
    expect(catalogModelName("iPhone SE (2022)")).toBe("iphone se 2022");
  });

  it("collapses whitespace", () => {
    expect(catalogModelName("  iPhone 13   Pro  ")).toBe("iphone 13 pro");
  });
});

describe("lookupPartPriceOre", () => {
  it("returns the cheapest in-stock original display price and ignores aftermarket", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    // 11000 is OEM-Equivalent (aftermarket), 41000 is out of stock.
    expect(await lookupPartPriceOre(client, "iPhone 12", "screen")).toBe(44000);
  });

  it("ignores Pulled C, which we would not fit to a resold device", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    expect(await lookupPartPriceOre(client, "iPhone 12", "battery")).toBe(13000);
  });

  it("finds the charging connector price", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    expect(await lookupPartPriceOre(client, "iPhone 12", "charging")).toBe(6000);
  });

  it("does not mistake tape, cases or camera lenses for a back cover", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    expect(await lookupPartPriceOre(client, "iPhone 12", "back_glass")).toBe(32000);
  });

  it("does not let a base model pick up a Pro Max part", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    expect(await lookupPartPriceOre(client, "iPhone 13", "screen")).toBeNull();
  });

  it("matches a part whose suitable_for lists several devices", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    expect(await lookupPartPriceOre(client, "iPhone 12 Pro", "battery")).toBe(13000);
  });

  it("returns null when only aftermarket quality is in stock", async () => {
    const { client } = makeFakeClient({ foneday_catalog: [catalog[0]] });
    expect(await lookupPartPriceOre(client, "iPhone 12", "screen")).toBeNull();
  });

  it("returns null for an empty model", async () => {
    const { client } = makeFakeClient({ foneday_catalog: catalog });
    expect(await lookupPartPriceOre(client, "   ", "screen")).toBeNull();
  });

  it("narrows the query by suitable_for, category and stock", async () => {
    const { client, calls } = makeFakeClient({ foneday_catalog: catalog });
    await lookupPartPriceOre(client, "iPhone 12", "screen");
    const call = calls.find((c) => c.table === "foneday_catalog");
    expect(call?.ops).toContainEqual(["ilike", "suitable_for", "%iphone 12%"]);
    expect(call?.ops).toContainEqual(["in", "category", ["Display"]]);
    expect(call?.ops).toContainEqual(["eq", "in_stock", true]);
  });
});
