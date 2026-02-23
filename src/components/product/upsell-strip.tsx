"use client";

import Image from "next/image";
import type { Product } from "@/lib/medusa/types";

type UpsellStripProps = {
  accessories: Product[];
  onAdd: (variantId: string) => void;
};

export function UpsellStrip({ accessories, onAdd }: UpsellStripProps) {
  if (accessories.length === 0) return null;

  const formatPrice = (amount: string, currency = "DKK") =>
    new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));

  return (
    <div className="rounded-radius-md border border-soft-grey bg-cream/50 p-4">
      <p className="font-display text-sm font-bold uppercase tracking-wider text-charcoal">
        Beskyt din enhed
      </p>
      <div className="mt-3 space-y-3">
        {accessories.slice(0, 3).map((acc) => (
          <div key={acc.id} className="flex items-center gap-3">
            {acc.images[0] && (
              <Image
                src={acc.images[0].url}
                alt={acc.images[0].altText ?? acc.title}
                width={48}
                height={48}
                className="h-12 w-12 rounded-radius-sm object-contain bg-white"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-charcoal">{acc.title}</p>
              <p className="text-xs font-semibold text-green-eco">
                {formatPrice(acc.priceRange.minVariantPrice.amount, acc.priceRange.minVariantPrice.currencyCode)}
              </p>
            </div>
            <button
              onClick={() => onAdd(acc.variants[0]?.id ?? "")}
              className="shrink-0 rounded-full bg-green-eco px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              + Tilføj
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
