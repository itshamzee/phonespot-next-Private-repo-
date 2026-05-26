import type { CartItem, CartSkuItem, CartState, CartTotals, DiscountApplication } from "./types";
import { applyBundleDiscounts, type CartLine } from "@/lib/spot/bundle-pricing";

export function lineTotal(item: CartItem): number {
  return item.type === "device" ? item.price : item.price * item.quantity;
}

export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function calcDiscount(subtotal: number, discount: DiscountApplication | null): number {
  if (!discount) return 0;
  switch (discount.type) {
    case "percentage":
      return Math.round((subtotal * discount.value) / 100);
    case "fixed":
      return Math.min(discount.value, subtotal);
    case "free_shipping":
      return 0;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Spot bundle discount helpers
// ---------------------------------------------------------------------------

/** Convert a CartSkuItem to the CartLine shape the bundle-pricing engine expects. */
function toSpotBundleLine(item: CartSkuItem): CartLine {
  const kind = item.spotKind ?? "other";
  return {
    sku: item.skuProductId,
    kind,
    unit_price_oere: item.unitPrice ?? item.price,
    sale_price_oere: item.unitPrice != null ? item.price : null,
    quantity: item.quantity,
    is_spot: kind !== "other",
  };
}

export type BundleLineResult = {
  skuProductId: string;
  discount_oere: number;
  reason: string | null;
};

/**
 * Run `applyBundleDiscounts` over all SKU cart lines.
 * Returns an array parallel to `items` (non-SKU items get discount_oere = 0).
 */
export function calcBundleDiscounts(items: CartItem[]): BundleLineResult[] {
  const skuItems = items.filter((i): i is CartSkuItem => i.type === "sku_product");
  const bundleLines = skuItems.map(toSpotBundleLine);
  const withDiscounts = applyBundleDiscounts(bundleLines);

  return items.map((item) => {
    if (item.type !== "sku_product") return { skuProductId: "", discount_oere: 0, reason: null };
    const idx = skuItems.findIndex((s) => s.skuProductId === item.skuProductId);
    const bd = withDiscounts[idx];
    return { skuProductId: item.skuProductId, discount_oere: bd?.discount_oere ?? 0, reason: bd?.reason ?? null };
  });
}

export function calcTotals(state: CartState, shippingCost: number): CartTotals {
  const subtotal = calcSubtotal(state.items);
  const discountAmount = calcDiscount(subtotal, state.discount);

  // Spot bundle discounts (3-for-2 / Lens combo) — existing concept
  const bundleResults = calcBundleDiscounts(state.items);
  const bundleDiscountAmount = bundleResults.reduce((n, r) => n + r.discount_oere, 0);

  // Sommer Bundle savings — sum retailPrice on items with bundleAttached
  const bundleSavingsAmount = state.items.reduce((sum, item) => {
    if (item.type !== "sku_product") return sum;
    if (!item.bundleAttached) return sum;
    return sum + (item.retailPrice ?? 0);
  }, 0);

  const effectiveShipping = state.discount?.type === "free_shipping" ? 0 : shippingCost;
  const total = Math.max(0, subtotal - discountAmount - bundleDiscountAmount + effectiveShipping);
  const itemCount = state.items.reduce(
    (n, item) => n + (item.type === "device" ? 1 : item.quantity),
    0,
  );
  return { subtotal, discountAmount, bundleDiscountAmount, bundleSavingsAmount, shippingCost: effectiveShipping, total, itemCount };
}

export function formatOere(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(oere / 100);
}
