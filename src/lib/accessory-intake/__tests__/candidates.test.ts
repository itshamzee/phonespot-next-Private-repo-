import { describe, expect, it } from "vitest";
import { rankCandidates } from "../candidates";
import type { Identified } from "../types";

const ident: Identified = {
  productType: "cover", brand: "Apple", isGenuineBrandProduct: true, models: ["iphone-13"],
  unknownModelText: null, modelConfidence: "high", caseType: "Slim", color: "Sort", features: [],
  titleDa: "", descriptionDa: "", supplierCodes: [], readText: "",
};
const row = (id: string, extra: Record<string, unknown> = {}) => ({
  id, title: id, images: null, selling_price: 9900, status: "published", subcategory: "cover",
  brand: "Apple", compatible_models: ["iphone-13"], attributes: { case_type: "Slim", color: "Sort", udsalg: "Ja" }, ...extra,
});

describe("rankCandidates", () => {
  it("sorterer efter score og tager højst 3 med score >= 5", () => {
    const rows = [
      row("svag", { brand: "Celly", attributes: { udsalg: "Ja" } }),
      row("bedst"),
      row("god", { attributes: { case_type: "Slim", color: "Rød", udsalg: "Ja" } }),
      row("ok", { attributes: { case_type: "Clear", color: "Sort", udsalg: "Ja" } }),
      row("ok2", { attributes: { case_type: "Clear", color: "Rød", udsalg: "Ja" } }),
    ];
    const out = rankCandidates(ident, rows, new Map());
    expect(out.map((c) => c.id)).toEqual(["bedst", "god", "ok"]);
  });

  it("udelader varer der hverken er på udsalg eller Rixus/NovaNL", () => {
    const out = rankCandidates(ident, [row("fuld-pris", { attributes: { case_type: "Slim", color: "Sort" } })], new Map());
    expect(out).toEqual([]);
  });

  it("medtager Rixus-kladder uden udsalg", () => {
    const out = rankCandidates(
      { ...ident, brand: "Rixus", isGenuineBrandProduct: false },
      [row("rix", { brand: "Rixus", status: "draft", attributes: { case_type: "Slim", color: "Sort" } })],
      new Map([["rix", { vejle: 2 }]]),
    );
    expect(out[0]).toMatchObject({ id: "rix", stock: { vejle: 2 } });
  });
});
