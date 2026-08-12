"use client";

import type { TilbehoerCategory } from "@/lib/tilbehoer-config";
import { TilbehoerLayout } from "./tilbehoer-layout";
import { CategoryFaq } from "./category-faq";
import { KlarnaMicroBanner } from "@/components/ui/klarna-micro-banner";
import { TrustBar } from "@/components/ui/trust-bar";

interface Props {
  category: TilbehoerCategory;
  initialCount: number;
}

export function TilbehoerCategoryClient({ category, initialCount }: Props) {
  return (
    <>
      <TilbehoerLayout
        heroTitle={category.label}
        heroDescription={category.heroDescription}
        productCount={initialCount}
        activeCategory={category.slug}
      />
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <KlarnaMicroBanner />
      </div>
      {category.faq.length > 0 && <CategoryFaq items={category.faq} />}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        {/* Every tilbehør category lists sku_products (accessories), never
            graded refurbished devices — TrustBar defaults to variant="device"
            (36 mdr. garanti / 30+ kvalitetstests), which is a false claim
            about what's actually on this page. See trust-bar.tsx. */}
        <TrustBar variant="accessory" />
      </div>
    </>
  );
}
