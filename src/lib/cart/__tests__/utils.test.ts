import { describe, it, expect } from "vitest";
import { calcTotals } from "../utils";
import type { CartState, CartSkuItem } from "../types";

const iphone: CartSkuItem = {
  type: "sku_product",
  skuProductId: "iphone-15-pro",
  title: "iPhone 15 Pro",
  image: null,
  price: 599900,
  quantity: 1,
};

const freeGlass: CartSkuItem = {
  type: "sku_product",
  skuProductId: "glass",
  title: "Tempered Glass",
  image: null,
  price: 0,
  quantity: 1,
  retailPrice: 15900,
  bundleAttached: { campaignId: "sommer-bundle-2026", parentItemKey: "sku:iphone-15-pro" },
};

const freeTpu: CartSkuItem = {
  type: "sku_product",
  skuProductId: "tpu",
  title: "TPU cover",
  image: null,
  price: 0,
  quantity: 1,
  retailPrice: 9900,
  bundleAttached: { campaignId: "sommer-bundle-2026", parentItemKey: "sku:iphone-15-pro" },
};

describe("calcTotals — Sommer Bundle savings", () => {
  it("sums retailPrice across bundleAttached items into bundleSavingsAmount", () => {
    const state: CartState = { items: [iphone, freeGlass, freeTpu], discount: null };
    const t = calcTotals(state, 0);
    expect(t.bundleSavingsAmount).toBe(25800);
  });

  it("does not deduct bundleSavings from total (already 0 kr in the cart)", () => {
    const state: CartState = { items: [iphone, freeGlass, freeTpu], discount: null };
    const t = calcTotals(state, 0);
    expect(t.total).toBe(599900);
  });

  it("returns 0 bundleSavings when no bundleAttached items", () => {
    const state: CartState = { items: [iphone], discount: null };
    const t = calcTotals(state, 0);
    expect(t.bundleSavingsAmount).toBe(0);
  });
});
