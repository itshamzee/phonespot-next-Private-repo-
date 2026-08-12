"use client";

import { TilbehoerLayout } from "./tilbehoer-layout";
import { TrustBar } from "@/components/ui/trust-bar";

export function HubPageClient() {
  return (
    <>
      <TilbehoerLayout
        heroTitle="Tilbehør"
        heroDescription="Covers, opladere, kabler og mere — til alle populære mærker"
        activeCategory=""
      />
      <div className="mx-auto max-w-7xl px-4 pb-16">
        {/* The tilbehør hub only links into accessory categories (sku_products),
            never graded refurbished devices — TrustBar defaults to
            variant="device" (36 mdr. garanti / 30+ kvalitetstests), which is
            a false claim about what's actually on this page. See trust-bar.tsx. */}
        <TrustBar variant="accessory" />
      </div>
    </>
  );
}
