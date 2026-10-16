import { describe, expect, it } from "vitest";
import { columnsForBrand, priceListToText, summarizeModel, type PriceListBrand } from "../price-list";

const iphone17Pro = {
  slug: "iphone-17-pro",
  name: "iPhone 17 Pro",
  services: [
    { name: "Skærmskift (Budget)", category: "Skærmskift", qualityTier: "standard" as const, price: 1099 },
    { name: "Skærmskift (Original)", category: "Skærmskift", qualityTier: "original" as const, price: 1899 },
    { name: "Batteriskift", category: "Batteriskift", qualityTier: null, price: 799 },
    { name: "Diagnostik", category: "Diagnostik", qualityTier: null, price: 249 },
  ],
};

const brands: PriceListBrand[] = [
  { slug: "iphone", name: "iPhone", models: [iphone17Pro, { slug: "iphone-x", name: "iPhone X", services: [] }] },
  { slug: "tom", name: "Tomt mærke", models: [] },
];

describe("prisliste", () => {
  it("finder fra-pris, original skærm og pris pr. kategori, uden diagnostik", () => {
    const s = summarizeModel(iphone17Pro.services);
    expect(s.screenFrom).toBe(1099);
    expect(s.screenOriginal).toBe(1899);
    expect(s.byCategory).toEqual({ Skærmskift: 1099, Batteriskift: 799 });
  });

  it("viser kun kolonner med mindst én pris", () => {
    expect(columnsForBrand(brands[0])).toEqual(["Skærmskift", "Batteriskift"]);
  });

  it("skriver én linje pr. ydelse og springer modeller og mærker uden priser over", () => {
    const text = priceListToText(brands, "https://phonespot.dk");
    expect(text).toContain("### iPhone 17 Pro");
    expect(text).toContain("- Skærmskift (Original): 1.899 kr.");
    expect(text).toContain("https://phonespot.dk/reparation/iphone/iphone-17-pro");
    expect(text).not.toContain("iPhone X");
    expect(text).not.toContain("Tomt mærke");
  });
});
