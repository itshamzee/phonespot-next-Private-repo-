import type { CartState } from "./types";

const CART_STORAGE_KEY = "phonespot_cart";

export function loadCart(): CartState {
  if (typeof window === "undefined") return { items: [], discount: null };
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], discount: null };
    const parsed = JSON.parse(raw) as CartState;
    const now = Date.now();
    parsed.items = parsed.items.filter((item) => {
      if (item.type !== "device") return true;
      const reservedAt = new Date(item.reservedAt).getTime();
      return now - reservedAt < 15 * 60 * 1000;
    });
    return parsed;
  } catch {
    return { items: [], discount: null };
  }
}

export function saveCart(state: CartState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
}

export function clearCartStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_STORAGE_KEY);
}
