"use client";

import { useState } from "react";
import { SPARE_PART_TYPES } from "@/lib/spare-parts";
import type { Product } from "@/lib/shopify/types";
import { ProductCard } from "@/components/product/product-card";

type PartTypeFilterProps = {
  products: Product[];
  collectionHandle: string;
};

export function PartTypeFilter({ products, collectionHandle }: PartTypeFilterProps) {
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
      <p className="mb-6 text-sm text-gray">
        {filtered.length} reservedel{filtered.length !== 1 ? "e" : ""}{" "}
        fundet
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            collectionHandle={collectionHandle}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-gray">
          Ingen produkter matcher det valgte filter.
        </p>
      )}
    </div>
  );
}
