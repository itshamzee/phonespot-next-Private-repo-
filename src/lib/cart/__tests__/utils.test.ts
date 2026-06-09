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

const glass: CartSkuItem = {
  type: "sku_product",
  skuProductId: "glass",
  title: "Tempered Glass",
  image: null,
  price: 15900,
  quantity: 2,
};

describe("calcTotals", () => {
  it("sums line totals into subtotal and adds shipping into total", () => {
    const state: CartState = { items: [iphone, glass], discount: null };
    const t = calcTotals(state, 4900);
    expect(t.subtotal).toBe(599900 + 15900 * 2);
    expect(t.total).toBe(599900 + 15900 * 2 + 4900);
  });

  it("counts quantities across SKU lines", () => {
    const state: CartState = { items: [iphone, glass], discount: null };
    const t = calcTotals(state, 0);
    expect(t.itemCount).toBe(3);
  });

  it("waives shipping when a free_shipping discount is applied", () => {
    const state: CartState = {
      items: [glass],
      discount: { code: "FRIFRAGT", type: "free_shipping", value: 0, discountAmount: 0 },
    };
    const t = calcTotals(state, 4900);
    expect(t.shippingCost).toBe(0);
    expect(t.total).toBe(15900 * 2);
  });
});
