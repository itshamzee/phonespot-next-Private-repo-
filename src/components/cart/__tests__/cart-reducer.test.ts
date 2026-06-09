import { describe, it, expect } from "vitest";
import { cartReducer } from "@/lib/cart/reducer";
import type { CartState, CartSkuItem } from "@/lib/cart/types";
import { cartItemKey } from "@/lib/cart/types";

function emptyState(): CartState {
  return { items: [], discount: null };
}

function skuItem(overrides: Partial<CartSkuItem> = {}): CartSkuItem {
  return {
    type: "sku_product",
    skuProductId: "tempered-glass-universal",
    title: "Tempered Glass",
    image: null,
    price: 15900,
    quantity: 1,
    ...overrides,
  };
}

describe("cartReducer — ADD_SKU", () => {
  it("adds a new SKU line", () => {
    const out = cartReducer(emptyState(), { type: "ADD_SKU", item: skuItem() });
    expect(out.items).toHaveLength(1);
  });

  it("merges quantity when the same SKU/variant is added again", () => {
    const seeded = cartReducer(emptyState(), { type: "ADD_SKU", item: skuItem() });
    const out = cartReducer(seeded, { type: "ADD_SKU", item: skuItem({ quantity: 2 }) });
    expect(out.items).toHaveLength(1);
    const line = out.items[0] as CartSkuItem;
    expect(line.quantity).toBe(3);
  });

  it("keeps different variants of the same SKU as separate lines", () => {
    const seeded = cartReducer(emptyState(), { type: "ADD_SKU", item: skuItem({ variantLabel: "Sort" }) });
    const out = cartReducer(seeded, { type: "ADD_SKU", item: skuItem({ variantLabel: "Hvid" }) });
    expect(out.items).toHaveLength(2);
  });
});

describe("cartReducer — REMOVE_ITEM", () => {
  it("removes the item matching the key", () => {
    const seeded = cartReducer(emptyState(), { type: "ADD_SKU", item: skuItem() });
    const key = cartItemKey(seeded.items[0]);
    const out = cartReducer(seeded, { type: "REMOVE_ITEM", key });
    expect(out.items).toHaveLength(0);
  });

  it("is a no-op when the key is unknown", () => {
    const seeded = cartReducer(emptyState(), { type: "ADD_SKU", item: skuItem() });
    const out = cartReducer(seeded, { type: "REMOVE_ITEM", key: "sku:does-not-exist" });
    expect(out.items).toHaveLength(1);
  });
});

describe("cartReducer — UPDATE_SKU_QUANTITY / CLEAR", () => {
  it("updates quantity and removes the line at quantity 0", () => {
    const seeded = cartReducer(emptyState(), { type: "ADD_SKU", item: skuItem() });
    const updated = cartReducer(seeded, {
      type: "UPDATE_SKU_QUANTITY",
      skuProductId: "tempered-glass-universal",
      quantity: 4,
    });
    expect((updated.items[0] as CartSkuItem).quantity).toBe(4);

    const removed = cartReducer(updated, {
      type: "UPDATE_SKU_QUANTITY",
      skuProductId: "tempered-glass-universal",
      quantity: 0,
    });
    expect(removed.items).toHaveLength(0);
  });

  it("clears all items", () => {
    const seeded = cartReducer(emptyState(), { type: "ADD_SKU", item: skuItem() });
    const out = cartReducer(seeded, { type: "CLEAR" });
    expect(out.items).toHaveLength(0);
  });
});
