"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Product, ProductVariant } from "@/lib/shopify/types";
import { Price } from "@/components/ui/price";
import { ConditionBadge } from "@/components/ui/condition-badge";
import { VariantSelector } from "@/components/product/variant-selector";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { TrustBadges } from "@/components/product/trust-badges";
import { ConditionExplainer } from "@/components/product/condition-explainer";

function getConditionGrade(tags: string[]): "A" | "B" | "C" | null {
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.includes("grade-a")) return "A";
  if (lower.includes("grade-b")) return "B";
  if (lower.includes("grade-c")) return "C";
  return null;
}

function getUniqueOptions(
  variants: ProductVariant[],
): { name: string; values: string[] }[] {
  const optionsMap = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const opt of variant.selectedOptions) {
      if (!optionsMap.has(opt.name)) {
        optionsMap.set(opt.name, new Set());
      }
      optionsMap.get(opt.name)!.add(opt.value);
    }
  }

  return Array.from(optionsMap.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));
}

function ProductInfoInner({ product }: { product: Product }) {
  const searchParams = useSearchParams();
  const grade = getConditionGrade(product.tags);
  const options = useMemo(
    () => getUniqueOptions(product.variants),
    [product.variants],
  );

  // Determine selected variant from URL search params
  const selectedVariant = useMemo(() => {
    if (product.variants.length === 1) return product.variants[0];

    const matched = product.variants.find((variant) =>
      variant.selectedOptions.every((opt) => {
        const paramValue = searchParams.get(opt.name.toLowerCase());
        return paramValue === opt.value;
      }),
    );

    return matched ?? product.variants[0];
  }, [product.variants, searchParams]);

  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice ?? null;
  const availableForSale =
    selectedVariant?.availableForSale ?? product.availableForSale;

  return (
    <div className="flex flex-col gap-5">
      {/* Vendor */}
      <p className="text-sm text-gray">{product.vendor}</p>

      {/* Title */}
      <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">
        {product.title}
      </h1>

      {/* Condition badge + explainer */}
      {grade && (
        <div className="space-y-3">
          <ConditionBadge grade={grade} />
          <ConditionExplainer variant="compact" />
        </div>
      )}

      {/* Price */}
      <Price
        amount={price.amount}
        currencyCode={price.currencyCode}
        compareAt={compareAt?.amount ?? null}
      />

      {/* Availability */}
      <p
        className={`text-sm font-medium ${
          availableForSale ? "text-green-eco" : "text-red-600"
        }`}
      >
        {availableForSale ? "Pa lager" : "Udsolgt"}
      </p>

      {/* Variant selector */}
      <VariantSelector variants={product.variants} options={options} />

      {/* Add to cart */}
      <AddToCartButton
        variantId={selectedVariant?.id ?? ""}
        availableForSale={availableForSale}
      />

      {/* Trust badges */}
      <TrustBadges />
    </div>
  );
}

export function ProductInfo({ product }: { product: Product }) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-sand" />
          <div className="h-8 w-64 rounded bg-sand" />
          <div className="h-10 w-32 rounded bg-sand" />
        </div>
      }
    >
      <ProductInfoInner product={product} />
    </Suspense>
  );
}
