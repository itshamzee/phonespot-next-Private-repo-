"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Cart } from "@/lib/shopify/types";

interface CartContextValue {
  cart: Cart | null;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  setCart: (cart: Cart | null) => void;
  showUpsell: boolean;
  openUpsell: () => void;
  closeUpsell: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const openUpsell = useCallback(() => setShowUpsell(true), []);
  const closeUpsell = useCallback(() => setShowUpsell(false), []);

  const value = useMemo<CartContextValue>(
    () => ({ cart, isOpen, openCart, closeCart, setCart, showUpsell, openUpsell, closeUpsell }),
    [cart, isOpen, openCart, closeCart, showUpsell, openUpsell, closeUpsell],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return context;
}
