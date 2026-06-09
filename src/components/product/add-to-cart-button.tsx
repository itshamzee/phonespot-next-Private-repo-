"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/components/cart/cart-context";
import type { CartSkuItem } from "@/lib/cart/types";

type AddToCartButtonProps = {
  variantId: string;
  availableForSale: boolean;
  showUpsellOnAdd?: boolean;
  skuProductId?: string;
  templateId?: string;
  title?: string;
  price?: number;
  image?: string;
  variantLabel?: string;
};

export function AddToCartButton({
  availableForSale,
  showUpsellOnAdd,
  skuProductId,
  title,
  price,
  image,
  variantLabel,
}: AddToCartButtonProps) {
  const { addSku, openCart, openUpsell } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = useCallback(async () => {
    if (!availableForSale || !skuProductId) return;

    setIsLoading(true);
    try {
      const sku: CartSkuItem = {
        type: "sku_product",
        skuProductId,
        title: title ?? "Produkt",
        price: price ?? 0,
        quantity: 1,
        image: image ?? null,
        variantLabel,
      };
      addSku(sku);

      if (showUpsellOnAdd) {
        openUpsell();
      } else {
        openCart();
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    availableForSale,
    skuProductId,
    title,
    price,
    image,
    variantLabel,
    addSku,
    openCart,
    showUpsellOnAdd,
    openUpsell,
  ]);

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
      {isLoading ? "Tilføjer..." : "Læg i kurv"}
    </button>
  );
}
