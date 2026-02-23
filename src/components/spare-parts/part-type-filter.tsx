"use client";

import { useState } from "react";
import { SPARE_PART_TYPES } from "@/lib/spare-parts";
import type { Product } from "@/lib/shopify/types";

type PartTypeFilterProps = {
  products: Product[];
  children: (filtered: Product[]) => React.ReactNode;
};

export function PartTypeFilter({ products, children }: PartTypeFilterProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag
    ? products.filter((p) =>
        p.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase()),
      )
    : products;

  const tabs = [
    { label: "Alle", tag: null },
    ...SPARE_PART_TYPES.map((t) => ({ label: t.label, tag: t.shopifyTag })),
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTag(tab.tag)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTag === tab.tag
                ? "bg-green-eco text-white"
                : "bg-cream text-charcoal hover:bg-sand"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(filtered)}
    </div>
  );
}
