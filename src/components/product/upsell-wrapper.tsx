"use client";

import type { Product } from "@/lib/medusa/types";
import { UpsellStrip } from "./upsell-strip";
import { useCart } from "@/components/cart/cart-context";
import { addToCart, createCart } from "@/lib/medusa/client";

export function UpsellWrapper({ accessories }: { accessories: Product[] }) {
  const { cart, setCart, openCart } = useCart();

  async function handleAdd(variantId: string) {
    let currentCart = cart;
    if (!currentCart) {
      currentCart = await createCart();
    }
    const updated = await addToCart(currentCart.id, variantId);
    setCart(updated);
    openCart();
  }

  return <UpsellStrip accessories={accessories} onAdd={handleAdd} />;
}
