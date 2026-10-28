import { describe, expect, it } from "vitest";
import { listPriceSaving, parseListPriceKr } from "../list-price";

describe("parseListPriceKr", () => {
  it("læser kr. fra attributten", () => {
    expect(parseListPriceKr({ vejl_pris: "349" })).toBe(349);
    expect(parseListPriceKr({ vejl_pris: "349 kr." })).toBe(349);
    expect(parseListPriceKr({ vejl_pris: "" })).toBeNull();
    expect(parseListPriceKr(null)).toBeNull();
  });
});

describe("listPriceSaving", () => {
  it("beregner besparelse i hele procent", () => {
    expect(listPriceSaving(349, 9900)).toBe(72);
  });
  it("viser intet, når den vejledende pris ikke er højere", () => {
    expect(listPriceSaving(99, 9900)).toBeNull();
    expect(listPriceSaving(null, 9900)).toBeNull();
  });
  it("viser intet under 10 %", () => {
    expect(listPriceSaving(105, 9900)).toBeNull();
  });
});
