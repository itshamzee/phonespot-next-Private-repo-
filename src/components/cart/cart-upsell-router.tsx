"use client";

import { useState, useEffect } from "react";
import { UpsellModal } from "@/components/cart/upsell-modal";

/** Mounted once at the layout level. Renders the post-add accessory upsell. */
export function CartUpsellRouter() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  if (!hasMounted) return null;

  return <UpsellModal />;
}
