import { describe, expect, it } from "vitest";
import { suggestPriceKr } from "../pricing";
import { sanitizeIdentified } from "../sanitize";
import { scoreCandidate, subcategoryFor } from "../match";
import type { Identified } from "../types";

const base: Identified = {
  productType: "cover",
  brand: "Apple",
  isGenuineBrandProduct: true,
  models: ["iphone-13"],
  unknownModelText: null,
  modelConfidence: "high",
  caseType: "Slim",
  color: "Sort",
  features: [],
  titleDa: "Apple Silicone Case til iPhone 13, sort",
  descriptionDa: "Ægte Apple-cover i silikone.",
  supplierCodes: [],
  readText: "iPhone 13 Silicone Case",
};

const cand = {
  id: "c1",
  title: "x",
  images: null,
  selling_price: 9900,
  status: "published",
  subcategory: "cover",
  brand: "Apple",
  compatible_models: ["iphone-13"],
  attributes: { case_type: "Slim", color: "Sort" },
};

describe("suggestPriceKr", () => {
  it("ægte Apple/Samsung cover = 99", () => {
    expect(suggestPriceKr({ productType: "cover", brand: "Apple", isGenuineBrandProduct: true, caseType: "Slim" })).toBe(99);
  });
  it("kendt mærke = 79", () => {
    expect(suggestPriceKr({ productType: "cover", brand: "NovaNL", isGenuineBrandProduct: false, caseType: "Slim" })).toBe(79);
  });
  it("flip fra kendt mærke = 99", () => {
    expect(suggestPriceKr({ productType: "flip_cover", brand: "NovaNL", isGenuineBrandProduct: false, caseType: "Flip" })).toBe(99);
  });
  it("no-name = 59", () => {
    expect(suggestPriceKr({ productType: "cover", brand: null, isGenuineBrandProduct: false, caseType: "Clear" })).toBe(59);
  });
  it("glas = 49", () => {
    expect(suggestPriceKr({ productType: "screen_protector", brand: "Swissten", isGenuineBrandProduct: false, caseType: null })).toBe(49);
  });
});

describe("sanitizeIdentified", () => {
  it("fjerner ukendte slugs og forbudte ord", () => {
    const s = sanitizeIdentified(
      { ...base, models: ["iphone-13", "iphone-99"], titleDa: "Panserglas til iPhone 13", descriptionDa: "Godt glas. Med 36 måneders garanti." },
      new Set(["iphone-13"]),
    );
    expect(s.models).toEqual(["iphone-13"]);
    expect(s.titleDa).toBe("Beskyttelsesglas til iPhone 13");
    expect(s.descriptionDa).not.toMatch(/36/);
    expect(s.descriptionDa).toContain("Godt glas.");
  });
  it("sætter lav sikkerhed når ingen modeller er tilbage", () => {
    expect(sanitizeIdentified({ ...base, models: ["x"] }, new Set()).modelConfidence).toBe("low");
  });
  it("fjerner emojis", () => {
    expect(sanitizeIdentified({ ...base, titleDa: "Cover \u{1F525} til iPhone 13" }, new Set(["iphone-13"])).titleDa).toBe("Cover til iPhone 13");
  });
});

describe("scoreCandidate", () => {
  it("fuld match giver 9", () => {
    expect(scoreCandidate(base, cand)).toBe(9);
  });
  it("ingen modeloverlap giver 0", () => {
    expect(scoreCandidate(base, { ...cand, compatible_models: ["iphone-14"] })).toBe(0);
  });
  it("anden farve trækker ned", () => {
    expect(scoreCandidate(base, { ...cand, attributes: { case_type: "Slim", color: "Rød" } })).toBe(7);
  });
  it("flip_cover er cover-kategori", () => {
    expect(subcategoryFor("flip_cover")).toBe("cover");
    expect(subcategoryFor("screen_protector")).toBe("screen_protector");
  });
});
