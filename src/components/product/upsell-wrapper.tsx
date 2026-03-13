"use client";

import type { Product } from "@/lib/shopify/types";
import { UpsellStrip } from "./upsell-strip";
import { useCart } from "@/components/cart/cart-context";

export function UpsellWrapper({ accessories }: { accessories: Product[] }) {
  const { addSku, openCart } = useCart();

  async function handleAdd(variantId: string) {
    // Legacy compatibility — find matching accessory
    const product = accessories.find((a) =>
      a.variants?.some((v) => v.id === variantId)
    );
    if (!product) return;

    addSku({
      type: "sku_product",
      skuProductId: variantId,
      title: product.title,
      price: Math.round(parseFloat(product.priceRange?.minVariantPrice?.amount ?? "0") * 100),
      quantity: 1,
      image: product.images?.[0]?.url ?? "",
    });
    openCart();
  }

  return <UpsellStrip accessories={accessories} onAdd={handleAdd} />;
}
