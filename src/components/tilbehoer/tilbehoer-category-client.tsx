"use client";

import { useState } from "react";
import type { TilbehoerCategory } from "@/lib/tilbehoer-config";
import { TilbehoerCategoryHero } from "./tilbehoer-category-hero";
import { AccessoryGrid } from "./accessory-grid";
import { KlarnaMicroBanner } from "@/components/ui/klarna-micro-banner";
import { CategoryFaq } from "./category-faq";

interface TilbehoerCategoryClientProps {
  category: TilbehoerCategory;
  initialCount: number;
}

export function TilbehoerCategoryClient({
  category,
  initialCount,
}: TilbehoerCategoryClientProps) {
  const [selectedModel, setSelectedModel] = useState("");

  return (
    <>
      <TilbehoerCategoryHero
        category={category}
        productCount={initialCount}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <AccessoryGrid
          externalModel={selectedModel}
          initialCategory={category.slug}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8">
        <KlarnaMicroBanner />
      </div>

      {category.faq.length > 0 && (
        <CategoryFaq items={category.faq} />
      )}
    </>
  );
}
