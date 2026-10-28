import { describe, expect, it } from "vitest";
import { matchActionLabel, saleKrFor } from "../match-card";

const p = { id: "x", title: "x", images: null, selling_price: 19900, status: "draft", stock: {} };

describe("saleKrFor", () => {
  it("Rixus-kladdecover = 79 (kendt mærke)", () => {
    expect(saleKrFor({ ...p, subcategory: "cover", brand: "Rixus", attributes: { case_type: "Slim" } })).toBe(79);
  });
  it("Rixus flip-kladde = 99", () => {
    expect(saleKrFor({ ...p, subcategory: "cover", brand: "Rixus", attributes: { case_type: "Flip" } })).toBe(99);
  });
  it("label og pris bruger samme tal", () => {
    const q = { ...p, subcategory: "cover", brand: "NovaNL", attributes: {} };
    expect(matchActionLabel(q, 2, saleKrFor(q))).toContain("79 kr.");
  });
});
