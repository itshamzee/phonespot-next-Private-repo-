"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/components/cart/cart-context";
import { UpsellModal } from "@/components/cart/upsell-modal";
import { BundleConfirmationModal } from "@/components/cart/bundle-confirmation-modal";
import { isCampaignActive } from "@/lib/campaigns/sommer-bundle";

/** Mounted once at the layout level. Chooses which modal to render based on what's in the cart. */
export function CartUpsellRouter() {
  const { showUpsell, cartState } = useCart();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  if (!hasMounted) return null;

  // If the most recently added item triggered a bundle add (i.e. there's a bundleAttached item in the cart),
  // show the bundle confirmation modal. Otherwise show the regular Privacy Glass upsell.
  const hasBundle = cartState.items.some(
    (i) => i.type === "sku_product" && i.bundleAttached?.campaignId === "sommer-bundle-2026",
  );

  if (showUpsell && hasBundle && isCampaignActive()) {
    return <BundleConfirmationModal />;
  }
  return <UpsellModal />;
}
