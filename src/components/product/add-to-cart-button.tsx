"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/components/cart/cart-context";
import { createCart, addToCart } from "@/lib/shopify/client";

type AddToCartButtonProps = {
  variantId: string;
  availableForSale: boolean;
};

export function AddToCartButton({
  variantId,
  availableForSale,
}: AddToCartButtonProps) {
  const { cart, setCart, openCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = useCallback(async () => {
    if (!variantId || !availableForSale) return;

    setIsLoading(true);
    try {
      let currentCart = cart;

      if (!currentCart) {
        currentCart = await createCart();
      }

      const updatedCart = await addToCart(currentCart.id, variantId);
      setCart(updatedCart);
      openCart();
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsLoading(false);
    }
  }, [variantId, availableForSale, cart, setCart, openCart]);

  if (!availableForSale) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded-full bg-gray/20 py-4 font-semibold text-gray cursor-not-allowed"
      >
        Udsolgt
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isLoading}
      className="w-full rounded-full bg-green-eco py-4 font-semibold text-white transition-colors hover:bg-green-light disabled:opacity-70"
    >
      {isLoading ? "Tilf\u00f8jer..." : "L\u00e6g i kurv"}
    </button>
  );
}
