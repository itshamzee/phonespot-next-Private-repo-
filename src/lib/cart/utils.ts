import { cartItemKey, type CartItem, type CartSkuItem, type CartState, type CartTotals, type DiscountApplication } from "./types";
import { threeForTwo, type ThreeForTwoLine } from "@/lib/lagersalg/three-for-two";
import { FREE_SHIPPING_THRESHOLD, getShippingPrice } from "@/lib/shipping";

export function lineTotal(item: CartItem): number {
  if (item.type === "device") {
    const upgradeSum = item.upgrades?.reduce((n, u) => n + u.price, 0) ?? 0;
    return item.price + upgradeSum;
  }
  return item.price * item.quantity;
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
// Lagersalg 3 for 2
// ---------------------------------------------------------------------------

export type BundleLineResult = { key: string; discount_oere: number; freeUnits: number };

/**
 * Kører 3 for 2-motoren over kurvens SKU-linjer. Rabatten regnes på den
 * faktiske salgspris (`item.price`); `lagersalg`-flaget er kun sat af klienten
 * til visning — serveren regner selv ved checkout.
 */
export function calcBundleDiscounts(items: CartItem[]): {
  total: number;
  unitsToNextFree: number | null;
  byKey: Record<string, BundleLineResult>;
} {
  const lines: ThreeForTwoLine[] = items
    .filter((i): i is CartSkuItem => i.type === "sku_product")
    .map((item) => ({
      key: cartItemKey(item),
      unitPriceOere: item.price,
      quantity: item.quantity,
      lagersalg: item.lagersalg === true,
    }));
  const result = threeForTwo(lines);
  const byKey: Record<string, BundleLineResult> = {};
  for (const [key, v] of Object.entries(result.byKey)) {
    if (v.discountOere > 0 || v.freeUnits > 0) {
      byKey[key] = { key, discount_oere: v.discountOere, freeUnits: v.freeUnits };
    }
  }
  return { total: result.totalOere, unitsToNextFree: result.unitsToNextFree, byKey };
}

export function calcTotals(state: CartState, shippingCost: number): CartTotals {
  const subtotal = calcSubtotal(state.items);
  const discountAmount = calcDiscount(subtotal, state.discount);

  // Rabatkoden regnes på subtotalen; 3 for 2 trækkes separat (de stakker).
  const bundle = calcBundleDiscounts(state.items);
  const bundleDiscountAmount = bundle.total;

  const effectiveShipping = state.discount?.type === "free_shipping" ? 0 : shippingCost;
  const total = Math.max(0, subtotal - discountAmount - bundleDiscountAmount + effectiveShipping);
  const itemCount = state.items.reduce(
    (n, item) => n + (item.type === "device" ? 1 : item.quantity),
    0,
  );
  return {
    subtotal,
    discountAmount,
    bundleDiscountAmount,
    bundleUnitsToNextFree: bundle.unitsToNextFree,
    shippingCost: effectiveShipping,
    total,
    itemCount,
  };
}

// ---------------------------------------------------------------------------
// Fragt (estimat før metode er valgt)
// ---------------------------------------------------------------------------

// Estimat før en metode er valgt: levering til døren fra lib/shipping.
const SHIPPING_COST_OERE = getShippingPrice("postnord") ?? 3900;

/**
 * Fragt ud fra beløbet EFTER rabatkode og 3 for 2 — samme regel som
 * checkout-serveren (api/checkout/session), så kurv, checkout og Stripe er enige.
 */
export function resolveShippingCost(netSubtotal: number): number {
  if (netSubtotal <= 0) return 0;
  return netSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST_OERE;
}

/** Kurvens totaler med fragt afgjort på nettobeløbet (efter alle rabatter). */
export function calcCartTotals(state: CartState): CartTotals {
  const base = calcTotals(state, 0);
  const net = base.subtotal - base.discountAmount - base.bundleDiscountAmount;
  return calcTotals(state, resolveShippingCost(net));
}

export function formatOere(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(oere / 100);
}
