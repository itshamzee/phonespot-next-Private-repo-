"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/components/cart/cart-context";
import type { CartSkuItem } from "@/lib/cart/types";
import { AddedCheckIcon, useAddedConfirmation } from "./use-added-confirmation";

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
  const [justAdded, confirmAdded] = useAddedConfirmation(skuProductId ?? "");

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
      confirmAdded();

      if (showUpsellOnAdd) {
        openUpsell({ title: sku.title, image: sku.image, price: sku.price });
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
    confirmAdded,
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
      className="press w-full rounded-full bg-green-eco py-4 font-semibold text-white hover:bg-green-light disabled:opacity-70"
    >
      {isLoading ? (
        "Tilføjer..."
      ) : justAdded ? (
        <span className="confirm-in inline-flex items-center justify-center gap-2">
          <AddedCheckIcon className="h-[18px] w-[18px]" />
          Lagt i kurven
        </span>
      ) : (
        "Læg i kurv"
      )}
    </button>
  );
}
