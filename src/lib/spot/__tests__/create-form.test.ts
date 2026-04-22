import { describe, it, expect } from "vitest";
import { computeRows } from "../create-form";

describe("computeRows", () => {
  it("universal Glass with 3 models → 1 group, 1 row, 3 compatible_models", () => {
    const out = computeRows({
      variant: "glass", colors: [],
      models: ["iphone-13","iphone-14","iphone-15"],
      mode: "universal", priceOere: 19900, images: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0].rows).toHaveLength(1);
    expect(out[0].rows[0].compatible_models.sort()).toEqual(["iphone-13","iphone-14","iphone-15"]);
    expect(out[0].variant_group).toMatch(/^spot-glass-iphone-/);
  });

  it("per-model Lens with 3 models → 3 groups, 1 row each", () => {
    const out = computeRows({
      variant: "lens", colors: [],
      models: ["iphone-13","iphone-14","iphone-15"],
      mode: "per-model", priceOere: 12900, images: [],
    });
    expect(out).toHaveLength(3);
    for (const g of out) expect(g.rows).toHaveLength(1);
  });

  it("Plateau with 1 model and 3 colors → 1 group, 3 rows in color order", () => {
    const out = computeRows({
      variant: "plateau",
      colors: ["Dark Blue","Orange","Silver"],
      models: ["iphone-17-pro"],
      mode: "per-model", priceOere: 29900, images: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0].rows).toHaveLength(3);
    expect(out[0].rows.map(r => r.variant_label)).toEqual(["Dark Blue","Orange","Silver"]);
    for (const r of out[0].rows) {
      expect(r.compatible_models).toEqual(["iphone-17-pro"]);
    }
  });

  it("Plateau with 2 models and 2 colors → 2 groups, each with 2 rows", () => {
    const out = computeRows({
      variant: "plateau",
      colors: ["Dark Blue","Orange"],
      models: ["iphone-17-pro","iphone-17-pro-max"],
      mode: "per-model", priceOere: 29900, images: [],
    });
    expect(out).toHaveLength(2);
    for (const g of out) expect(g.rows).toHaveLength(2);
  });
});
