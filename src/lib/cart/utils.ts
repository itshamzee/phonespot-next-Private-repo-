import type { CartItem, CartState, CartTotals, DiscountApplication } from "./types";

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

export function calcTotals(state: CartState, shippingCost: number): CartTotals {
  const subtotal = calcSubtotal(state.items);
  const discountAmount = calcDiscount(subtotal, state.discount);
  const effectiveShipping = state.discount?.type === "free_shipping" ? 0 : shippingCost;
  const total = Math.max(0, subtotal - discountAmount + effectiveShipping);
  const itemCount = state.items.reduce(
    (n, item) => n + (item.type === "device" ? 1 : item.quantity),
    0,
  );
  return { subtotal, discountAmount, shippingCost: effectiveShipping, total, itemCount };
}

export function formatOere(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(oere / 100);
}
