import { describe, it, expect } from "vitest";
import { cartReducer } from "@/lib/cart/reducer";
import type { CartState, CartSkuItem } from "@/lib/cart/types";
import { cartItemKey } from "@/lib/cart/types";

function emptyState(): CartState {
  return { items: [], discount: null };
}

function iphoneItem(overrides: Partial<CartSkuItem> = {}): CartSkuItem {
  return {
    type: "sku_product",
    skuProductId: "iphone-15-pro-256-a",
    title: "iPhone 15 Pro · 256GB · Som ny (A)",
    image: null,
    price: 599900,
    quantity: 1,
    variantLabel: "Som ny · 256GB · Sort",
    ...overrides,
  };
}

function glassItem(overrides: Partial<CartSkuItem> = {}): CartSkuItem {
  return {
    type: "sku_product",
    skuProductId: "0a718861-eae0-4c83-8cea-70d114a89fea",
    title: "Tempered Glass",
    image: null,
    price: 0,
    quantity: 1,
    retailPrice: 15900,
    ...overrides,
  };
}

function tpuItem(overrides: Partial<CartSkuItem> = {}): CartSkuItem {
  return {
    type: "sku_product",
    skuProductId: "tpu-iphone-15-pro-clear",
    title: "TPU cover (klar) — iPhone 15 Pro",
    image: null,
    price: 0,
    quantity: 1,
    retailPrice: 9900,
    ...overrides,
  };
}

function batteryUpgradeItem(overrides: Partial<CartSkuItem> = {}): CartSkuItem {
  return {
    type: "sku_product",
    skuProductId: "battery-upgrade-iphone-15-pro-256-a",
    title: "Nyt 100% batteri — iPhone 15 Pro",
    image: null,
    price: 30000,
    quantity: 1,
    kind: "battery-upgrade",
    ...overrides,
  };
}

describe("cartReducer — ADD_IPHONE_WITH_BUNDLE", () => {
  it("adds the iPhone plus glass and TPU, with both freebies marked bundleAttached", () => {
    const out = cartReducer(emptyState(), {
      type: "ADD_IPHONE_WITH_BUNDLE",
      iphone: iphoneItem(),
      glass: glassItem(),
      tpu: tpuItem(),
    });
    expect(out.items).toHaveLength(3);
    const attached = out.items.filter(
      (i) => i.type === "sku_product" && i.bundleAttached?.campaignId === "sommer-bundle-2026",
    );
    expect(attached).toHaveLength(2);
    for (const a of attached) {
      if (a.type === "sku_product") {
        expect(a.bundleAttached?.parentItemKey).toBe(`sku:iphone-15-pro-256-a:Som ny · 256GB · Sort`);
      }
    }
  });

  it("also adds the battery upgrade line when supplied", () => {
    const out = cartReducer(emptyState(), {
      type: "ADD_IPHONE_WITH_BUNDLE",
      iphone: iphoneItem(),
      glass: glassItem(),
      tpu: tpuItem(),
      batteryUpgrade: batteryUpgradeItem(),
    });
    expect(out.items).toHaveLength(4);
    const upgrade = out.items.find(
      (i) => i.type === "sku_product" && i.kind === "battery-upgrade",
    );
    expect(upgrade).toBeDefined();
    if (upgrade?.type === "sku_product") {
      expect(upgrade.upgradeParentItemKey).toBe("sku:iphone-15-pro-256-a:Som ny · 256GB · Sort");
    }
  });
});

describe("cartReducer — REMOVE_ITEM cascades", () => {
  it("removing the iPhone removes its attached bundle items and battery upgrade", () => {
    const seeded = cartReducer(emptyState(), {
      type: "ADD_IPHONE_WITH_BUNDLE",
      iphone: iphoneItem(),
      glass: glassItem(),
      tpu: tpuItem(),
      batteryUpgrade: batteryUpgradeItem(),
    });
    const after = cartReducer(seeded, {
      type: "REMOVE_ITEM",
      key: "sku:iphone-15-pro-256-a:Som ny · 256GB · Sort",
    });
    expect(after.items).toHaveLength(0);
  });

  it("reducer ALLOWS removing a freebie directly — UI is responsible for hiding the X", () => {
    // The reducer is permissive (a freebie can be dispatched away), but the cart-line-item
    // view hides the remove button when bundleAttached is set. The two together enforce the invariant.
    const seeded = cartReducer(emptyState(), {
      type: "ADD_IPHONE_WITH_BUNDLE",
      iphone: iphoneItem(),
      glass: glassItem(),
      tpu: tpuItem(),
    });
    const glassKey = `sku:${glassItem().skuProductId}`;
    const after = cartReducer(seeded, { type: "REMOVE_ITEM", key: glassKey });
    expect(after.items.find((i) => cartItemKey(i) === glassKey)).toBeUndefined();
    // iPhone + TPU still present
    expect(after.items).toHaveLength(2);
  });
});
