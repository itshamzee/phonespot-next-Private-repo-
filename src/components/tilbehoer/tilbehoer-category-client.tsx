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
        <TrustBar />
      </div>
    </>
  );
}
