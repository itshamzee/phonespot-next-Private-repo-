"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  CartState,
  CartAction,
  CartTotals,
  CartDeviceItem,
  CartSkuItem,
  DiscountApplication,
} from "@/lib/cart/types";
import { cartItemKey } from "@/lib/cart/types";
import { loadCart, saveCart, clearCartStorage } from "@/lib/cart/storage";
import { calcTotals } from "@/lib/cart/utils";

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_DEVICE": {
      // Prevent duplicate device entries
      const exists = state.items.some(
        (i) => i.type === "device" && i.deviceId === action.item.deviceId,
      );
      if (exists) return state;
      return { ...state, items: [...state.items, action.item] };
    }
    case "ADD_SKU": {
      const existingIndex = state.items.findIndex(
        (i) => i.type === "sku_product" && i.skuProductId === action.item.skuProductId,
      );
      if (existingIndex !== -1) {
        const updated = state.items.map((item, idx) => {
          if (idx !== existingIndex) return item;
          const sku = item as CartSkuItem;
          return { ...sku, quantity: sku.quantity + action.item.quantity };
        });
        return { ...state, items: updated };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case "REMOVE_ITEM": {
      return {
        ...state,
        items: state.items.filter((i) => cartItemKey(i) !== action.key),
      };
    }
    case "UPDATE_SKU_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) => !(i.type === "sku_product" && i.skuProductId === action.skuProductId),
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.type !== "sku_product" || item.skuProductId !== action.skuProductId)
            return item;
          return { ...item, quantity: action.quantity };
        }),
      };
    }
    case "APPLY_DISCOUNT": {
      return { ...state, discount: action.discount };
    }
    case "REMOVE_DISCOUNT": {
      return { ...state, discount: null };
    }
    case "CLEAR": {
      return { items: [], discount: null };
    }
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Shipping cost (flat rate, free above threshold)
// ---------------------------------------------------------------------------

const SHIPPING_COST_OERE = 4900; // 49 DKK in øre
const FREE_SHIPPING_THRESHOLD_OERE = 49900; // 499 DKK in øre

function resolveShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD_OERE ? 0 : SHIPPING_COST_OERE;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CartContextValue {
  cartState: CartState;
  totals: CartTotals;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  showUpsell: boolean;
  openUpsell: () => void;
  closeUpsell: () => void;
  addDevice: (item: CartDeviceItem) => Promise<void>;
  addSku: (item: CartSkuItem) => void;
  removeItem: (key: string) => Promise<void>;
  updateSkuQuantity: (skuProductId: string, quantity: number) => void;
  applyDiscount: (code: string) => Promise<{ error: string | null }>;
  removeDiscount: () => void;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartState, dispatch] = useReducer(cartReducer, undefined, () => loadCart());
  const [isOpen, setIsOpen] = useReducerToggle(false);
  const [showUpsell, setShowUpsell] = useReducerToggle(false);

  // Persist to localStorage on every state change
  useEffect(() => {
    saveCart(cartState);
  }, [cartState]);

  // On mount: clean up any expired device items that loadCart may not have caught
  // (loadCart already filters on init, but this covers hot-reloads / edge cases)
  useEffect(() => {
    const expiredKeys = cartState.items
      .filter((item) => {
        if (item.type !== "device") return false;
        const reservedAt = new Date(item.reservedAt).getTime();
        return Date.now() - reservedAt >= 15 * 60 * 1000;
      })
      .map(cartItemKey);
    for (const key of expiredKeys) {
      dispatch({ type: "REMOVE_ITEM", key });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Derived totals
  // ------------------------------------------------------------------
  const totals = useMemo<CartTotals>(() => {
    const subtotal = cartState.items.reduce((sum, item) => {
      return sum + (item.type === "device" ? item.price : item.price * item.quantity);
    }, 0);
    return calcTotals(cartState, resolveShippingCost(subtotal));
  }, [cartState]);

  // ------------------------------------------------------------------
  // Drawer / upsell toggles
  // ------------------------------------------------------------------
  const openCart = useCallback(() => setIsOpen(true), [setIsOpen]);
  const closeCart = useCallback(() => setIsOpen(false), [setIsOpen]);
  const openUpsell = useCallback(() => setShowUpsell(true), [setShowUpsell]);
  const closeUpsell = useCallback(() => setShowUpsell(false), [setShowUpsell]);

  // ------------------------------------------------------------------
  // Cart mutations
  // ------------------------------------------------------------------

  const addDevice = useCallback(async (item: CartDeviceItem) => {
    try {
      const res = await fetch("/api/cart/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: item.deviceId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not reserve device");
      }
      dispatch({ type: "ADD_DEVICE", item });
    } catch (err) {
      console.error("[cart] addDevice failed:", err);
      throw err;
    }
  }, []);

  const addSku = useCallback((item: CartSkuItem) => {
    dispatch({ type: "ADD_SKU", item });
  }, []);

  const removeItem = useCallback(
    async (key: string) => {
      const target = cartState.items.find((i) => cartItemKey(i) === key);
      if (target?.type === "device") {
        try {
          await fetch("/api/cart/release", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId: target.deviceId }),
          });
        } catch (err) {
          console.error("[cart] release reservation failed:", err);
        }
      }
      dispatch({ type: "REMOVE_ITEM", key });
    },
    [cartState.items],
  );

  const updateSkuQuantity = useCallback((skuProductId: string, quantity: number) => {
    dispatch({ type: "UPDATE_SKU_QUANTITY", skuProductId, quantity });
  }, []);

  const applyDiscount = useCallback(async (code: string): Promise<{ error: string | null }> => {
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as
        | { discount: DiscountApplication }
        | { error: string };
      if (!res.ok || "error" in data) {
        return { error: ("error" in data ? data.error : null) ?? "Ugyldig rabatkode" };
      }
      dispatch({ type: "APPLY_DISCOUNT", discount: data.discount });
      return { error: null };
    } catch {
      return { error: "Kunne ikke validere rabatkode" };
    }
  }, []);

  const removeDiscount = useCallback(() => {
    dispatch({ type: "REMOVE_DISCOUNT" });
  }, []);

  const clearCart = useCallback(async () => {
    const deviceItems = cartState.items.filter((i) => i.type === "device");
    await Promise.allSettled(
      deviceItems.map((item) =>
        fetch("/api/cart/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: (item as CartDeviceItem).deviceId }),
        }),
      ),
    );
    dispatch({ type: "CLEAR" });
    clearCartStorage();
  }, [cartState.items]);

  // ------------------------------------------------------------------
  // Context value
  // ------------------------------------------------------------------
  const value = useMemo<CartContextValue>(
    () => ({
      cartState,
      totals,
      isOpen,
      openCart,
      closeCart,
      showUpsell,
      openUpsell,
      closeUpsell,
      addDevice,
      addSku,
      removeItem,
      updateSkuQuantity,
      applyDiscount,
      removeDiscount,
      clearCart,
    }),
    [
      cartState,
      totals,
      isOpen,
      openCart,
      closeCart,
      showUpsell,
      openUpsell,
      closeUpsell,
      addDevice,
      addSku,
      removeItem,
      updateSkuQuantity,
      applyDiscount,
      removeDiscount,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Internal helper — useState-like setter that also accepts booleans directly
// ---------------------------------------------------------------------------

function useReducerToggle(
  initial: boolean,
): [boolean, (value: boolean) => void] {
  const [state, dispatch] = useReducer((_: boolean, action: boolean) => action, initial);
  return [state, dispatch];
}
