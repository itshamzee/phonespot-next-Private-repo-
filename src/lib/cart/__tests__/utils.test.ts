import { describe, it, expect } from "vitest";
import { calcTotals, calcBundleDiscounts } from "../utils";
import { cartItemKey, type CartState, type CartSkuItem } from "../types";

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

const cover = (id: string, price: number, quantity = 1): CartSkuItem =>
  ({ type: "sku_product", skuProductId: id, title: id, image: null, price, quantity, lagersalg: true });

describe("calcTotals med lagersalg 3 for 2", () => {
  it("trækker den billigste af tre fra totalen", () => {
    const state: CartState = { items: [cover("a", 7900), cover("b", 5900), cover("c", 9900)], discount: null };
    const t = calcTotals(state, 0);
    expect(t.bundleDiscountAmount).toBe(5900);
    expect(t.total).toBe(7900 + 9900);
    expect(t.bundleUnitsToNextFree).toBeNull();
  });
  it("siger hvor mange der mangler ved to", () => {
    const t = calcTotals({ items: [cover("a", 5900), cover("b", 5900)], discount: null }, 0);
    expect(t.bundleDiscountAmount).toBe(0);
    expect(t.bundleUnitsToNextFree).toBe(1);
  });
  it("stakker med en rabatkode regnet på subtotalen", () => {
    const state: CartState = {
      items: [cover("a", 10000), cover("b", 10000), cover("c", 10000)],
      discount: { code: "TI", type: "percentage", value: 10, discountAmount: 0 },
    };
    const t = calcTotals(state, 0);
    expect(t.discountAmount).toBe(3000);
    expect(t.bundleDiscountAmount).toBe(10000);
    expect(t.total).toBe(30000 - 3000 - 10000);
  });
  it("adskiller to varianter af samme produkt", () => {
    const a = { ...cover("x", 5900), variantLabel: "Farve: Sort" };
    const b = { ...cover("x", 7900), variantLabel: "Farve: Blå" };
    const r = calcBundleDiscounts([a, b, cover("y", 9900)]);
    expect(r.byKey[cartItemKey(a)]?.discount_oere).toBe(5900);
    expect(r.byKey[cartItemKey(b)]).toBeUndefined();
  });
});
