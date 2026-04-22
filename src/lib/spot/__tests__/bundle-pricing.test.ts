import { describe, it, expect } from "vitest";
import { applyBundleDiscounts, type CartLine } from "../bundle-pricing";

function line(overrides: Partial<CartLine> & { sku: string }): CartLine {
  return {
    sku: overrides.sku,
    kind: overrides.kind ?? "glass",
    unit_price_oere: overrides.unit_price_oere ?? 19900,
    sale_price_oere: overrides.sale_price_oere ?? null,
    quantity: overrides.quantity ?? 1,
    is_spot: overrides.is_spot ?? true,
  };
}

describe("applyBundleDiscounts", () => {
  it("no discount when cart has only one Glass", () => {
    const out = applyBundleDiscounts([line({ sku: "g", kind: "glass" })]);
    expect(out[0].discount_oere).toBe(0);
  });

  it("Lens 50% off when cart has Glass + Lens", () => {
    const out = applyBundleDiscounts([
      line({ sku: "g", kind: "glass", unit_price_oere: 19900 }),
      line({ sku: "l", kind: "lens",  unit_price_oere: 12900 }),
    ]);
    const lens = out.find(l => l.sku === "l")!;
    expect(lens.discount_oere).toBe(6450);
    expect(lens.reason).toContain("Lens combo");
  });

  it("Lens combo discount applies once per Glass in cart", () => {
    const out = applyBundleDiscounts([
      line({ sku: "g", kind: "glass", quantity: 2 }),
      line({ sku: "l", kind: "lens",  quantity: 3, unit_price_oere: 12900 }),
    ]);
    const lens = out.find(l => l.sku === "l")!;
    expect(lens.discount_oere).toBe(12900);
  });

  it("3-for-2 discount on 3 of same SKU", () => {
    const out = applyBundleDiscounts([
      line({ sku: "g", kind: "glass", quantity: 3, unit_price_oere: 19900 }),
    ]);
    const g = out[0];
    expect(g.discount_oere).toBe(19900);
    expect(g.reason).toContain("3-for-2");
  });

  it("3-for-2 on 6 of same SKU gives 2 units free", () => {
    const out = applyBundleDiscounts([
      line({ sku: "g", kind: "glass", quantity: 6, unit_price_oere: 19900 }),
    ]);
    expect(out[0].discount_oere).toBe(39800);
  });

  it("3-for-2 does not apply across different SKUs", () => {
    const out = applyBundleDiscounts([
      line({ sku: "g1", kind: "glass", quantity: 2 }),
      line({ sku: "g2", kind: "glass", quantity: 1 }),
    ]);
    expect(out.every(l => l.discount_oere === 0)).toBe(true);
  });

  it("3-for-2 suppressed on SKUs with sale_price", () => {
    const out = applyBundleDiscounts([
      line({ sku: "g", kind: "glass", quantity: 3, unit_price_oere: 19900, sale_price_oere: 14900 }),
    ]);
    expect(out[0].discount_oere).toBe(0);
  });

  it("Lens combo still applies when Glass is on sale", () => {
    const out = applyBundleDiscounts([
      line({ sku: "g", kind: "glass", unit_price_oere: 19900, sale_price_oere: 14900 }),
      line({ sku: "l", kind: "lens",  unit_price_oere: 12900 }),
    ]);
    const lens = out.find(l => l.sku === "l")!;
    expect(lens.discount_oere).toBe(6450);
  });

  it("Lens combo and 3-for-2 stack on separate lines", () => {
    const out = applyBundleDiscounts([
      line({ sku: "g", kind: "glass", quantity: 3, unit_price_oere: 19900 }),
      line({ sku: "l", kind: "lens",  quantity: 1, unit_price_oere: 12900 }),
    ]);
    const g = out.find(l => l.sku === "g")!;
    const lens = out.find(l => l.sku === "l")!;
    expect(g.discount_oere).toBe(19900);
    expect(lens.discount_oere).toBe(6450);
  });

  it("ignores non-Spot lines", () => {
    const out = applyBundleDiscounts([
      line({ sku: "other", kind: "glass", quantity: 3, is_spot: false }),
    ]);
    expect(out[0].discount_oere).toBe(0);
  });
});
