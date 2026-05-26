"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/components/cart/cart-context";
import {
  SOMMER_BUNDLE_2026,
  BATTERY_UPGRADE,
  getTpuCaseSkuId,
} from "@/lib/campaigns/sommer-bundle";
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
  isCampaignIPhone?: boolean;
  batteryUpgradeSelected?: boolean;
};

export function AddToCartButton({
  availableForSale,
  showUpsellOnAdd,
  skuProductId,
  templateId,
  title,
  price,
  image,
  variantLabel,
  isCampaignIPhone,
  batteryUpgradeSelected,
}: AddToCartButtonProps) {
  const { addSku, addIPhoneWithBundle, openCart, openUpsell } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = useCallback(async () => {
    if (!availableForSale || !skuProductId) return;

    setIsLoading(true);
    try {
      const iphone: CartSkuItem = {
        type: "sku_product",
        skuProductId,
        title: title ?? "Produkt",
        price: price ?? 0,
        quantity: 1,
        image: image ?? null,
        variantLabel,
      };

      if (isCampaignIPhone && templateId) {
        const tpuSkuId = getTpuCaseSkuId(templateId);
        if (!tpuSkuId) {
          // Graceful skip — model isn't covered by the bundle (iPhone 12 / SE 2020 until their SKUs are created).
          // Fall through to the regular add path so the iPhone still gets added.
          addSku(iphone);
        } else {
          const glass: CartSkuItem = {
            type: "sku_product",
            skuProductId: SOMMER_BUNDLE_2026.glassSkuId,
            title: "Tempered Glass",
            price: 0,
            quantity: 1,
            image: "/images/panserglas.png", // internal filename — customer copy uses "Tempered Glass"
            retailPrice: SOMMER_BUNDLE_2026.glass_retail_price_oere,
          };

          const tpu: CartSkuItem = {
            type: "sku_product",
            skuProductId: tpuSkuId,
            title: `TPU cover (klar) — ${title ?? "iPhone"}`,
            price: 0,
            quantity: 1,
            image: "/images/tpu-cover-clear.png",
            retailPrice: SOMMER_BUNDLE_2026.tpu_retail_price_oere,
          };

          const batteryUpgrade: CartSkuItem | undefined = batteryUpgradeSelected
            ? {
                type: "sku_product",
                skuProductId: `battery-upgrade:${skuProductId}`,
                title: `Nyt 100% batteri — ${title ?? "iPhone"}`,
                price: BATTERY_UPGRADE.price_oere,
                quantity: 1,
                image: null,
                kind: "battery-upgrade",
              }
            : undefined;

          addIPhoneWithBundle({ iphone, glass, tpu, batteryUpgrade });
        }
      } else {
        addSku(iphone);
      }

      if (showUpsellOnAdd && !isCampaignIPhone) {
        openUpsell();
      } else if (isCampaignIPhone) {
        openUpsell(); // BundleConfirmationModal router will pick this up in Task 14
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
    templateId,
    title,
    price,
    image,
    variantLabel,
    isCampaignIPhone,
    batteryUpgradeSelected,
    addSku,
    addIPhoneWithBundle,
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
