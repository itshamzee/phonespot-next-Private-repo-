"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Product, ProductVariant } from "@/lib/medusa/types";
import { Price } from "@/components/ui/price";
import { ConditionBadge } from "@/components/ui/condition-badge";
import { VariantSelector } from "@/components/product/variant-selector";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { TrustBadges } from "@/components/product/trust-badges";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { GradePicker } from "@/components/product/grade-picker";
import { SizeSelector } from "@/components/product/size-selector";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

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

function getSavingsPercent(price: string, compareAt: string | null): number | null {
  if (!compareAt) return null;
  const current = parseFloat(price);
  const original = parseFloat(compareAt);
  if (original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons for delivery info strip                          */
/* ------------------------------------------------------------------ */

function TruckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4 shrink-0"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
      />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4 shrink-0"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4 shrink-0"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Delivery info strip data                                          */
/* ------------------------------------------------------------------ */

const deliveryItems = [
  { label: "1-2 dages levering", icon: <TruckIcon /> },
  { label: "14 dages returret", icon: <ReturnIcon /> },
  { label: "36 mdr. garanti", icon: <ShieldIcon /> },
];

/* ------------------------------------------------------------------ */
/*  Main inner component                                              */
/* ------------------------------------------------------------------ */

const UPSELL_COLLECTIONS = ["iphones", "ipads", "smartphones"];

function ProductInfoInner({ product, collectionSlug }: { product: Product; collectionSlug?: string }) {
  const searchParams = useSearchParams();
  const grade = getConditionGrade(product.tags);
  const options = useMemo(
    () => getUniqueOptions(product.variants),
    [product.variants],
  );

  // Detect grade-based product (has "stand" option)
  const hasGradeVariants = options.some(
    (opt) => opt.name.toLowerCase() === "stand",
  );
  const hasSizeOption = options.some(
    (opt) => opt.name.toLowerCase() === "size" || opt.name.toLowerCase() === "størrelse",
  );

  // Get available sizes
  const sizes = hasSizeOption
    ? options.find((opt) => opt.name.toLowerCase() === "size" || opt.name.toLowerCase() === "størrelse")?.values ?? []
    : [];
  const selectedSize = searchParams.get("size") ?? searchParams.get("størrelse") ?? sizes[0] ?? "";

  // Get selected grade
  const selectedGradeLabel = searchParams.get("stand")?.toLowerCase() ?? "som ny";
  const selectedGrade: "A" | "B" | "C" =
    selectedGradeLabel === "god stand" ? "B" :
    selectedGradeLabel === "okay stand" ? "C" : "A";

  // Filter variants by selected size (for grade picker)
  const sizeFilteredVariants = hasSizeOption
    ? product.variants.filter((v) =>
        v.selectedOptions.some(
          (opt) =>
            (opt.name.toLowerCase() === "size" || opt.name.toLowerCase() === "størrelse") &&
            opt.value === selectedSize,
        ),
      )
    : product.variants;

  // Build grade images from product tags: "grade-image-a:url", "grade-image-b:url", "grade-image-c:url"
  const gradeImages = {
    A: product.tags.find((t) => t.startsWith("grade-image-a:"))?.slice(14) ?? product.images[0]?.url ?? "",
    B: product.tags.find((t) => t.startsWith("grade-image-b:"))?.slice(14) ?? product.images[0]?.url ?? "",
    C: product.tags.find((t) => t.startsWith("grade-image-c:"))?.slice(14) ?? product.images[0]?.url ?? "",
  };

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
  const savingsPercent = getSavingsPercent(price.amount, compareAt?.amount ?? null);
  const showUpsellOnAdd = UPSELL_COLLECTIONS.includes(collectionSlug ?? "");

  return (
    <div className="flex flex-col gap-6">
      {/* ---- 1. Vendor ---- */}
      {product.vendor && (
        <p className="text-xs font-medium uppercase tracking-widest text-gray">
          {product.vendor}
        </p>
      )}

      {/* ---- 2. Product title ---- */}
      <h1 className="font-display text-2xl font-bold leading-tight text-charcoal md:text-3xl lg:text-4xl">
        {product.title}
      </h1>

      {/* ---- 3. Price block ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <Price
          amount={price.amount}
          currencyCode={price.currencyCode}
          compareAt={compareAt?.amount ?? null}
          className="text-3xl"
        />
        {savingsPercent && (
          <span className="inline-flex items-center rounded-full bg-green-eco/10 px-3 py-1 text-xs font-semibold text-green-eco">
            Spar {savingsPercent}%
          </span>
        )}
      </div>

      {/* ---- 4. Condition badge + explainer ---- */}
      {grade && (
        <div className="flex items-center gap-3">
          <ConditionBadge grade={grade} />
          <ConditionExplainer variant="compact" />
        </div>
      )}

      {/* ---- 5. Availability ---- */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            availableForSale ? "bg-green-eco" : "bg-red-600"
          }`}
        />
        <p
          className={`text-sm font-medium ${
            availableForSale ? "text-green-eco" : "text-red-600"
          }`}
        >
          {availableForSale ? "På lager — sendes i dag" : "Udsolgt"}
        </p>
      </div>

      {/* ---- 6. Variant selector ---- */}
      {hasGradeVariants ? (
        <>
          <SizeSelector sizes={sizes} selectedSize={selectedSize} />
          <GradePicker
            variants={sizeFilteredVariants}
            selectedGrade={selectedGrade}
            gradeImages={gradeImages}
          />
        </>
      ) : (
        <VariantSelector variants={product.variants} options={options} />
      )}

      {/* ---- 7. Add to cart button ---- */}
      <AddToCartButton
        variantId={selectedVariant?.id ?? ""}
        availableForSale={availableForSale}
        showUpsellOnAdd={showUpsellOnAdd}
      />

      {/* ---- 8. Delivery info strip ---- */}
      <div className="flex flex-wrap items-center gap-2">
        {deliveryItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-1.5 rounded-xl bg-sand/40 px-3 py-2"
          >
            <span className="text-charcoal/60">{item.icon}</span>
            <span className="text-xs font-medium text-charcoal/80">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* ---- Prismatch badge ---- */}
      <a
        href="/prismatch"
        className="flex items-center gap-2 rounded-xl border border-green-eco/20 bg-green-eco/5 px-4 py-2.5 transition-colors hover:bg-green-eco/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span className="text-xs font-semibold text-green-eco">Prismatch-garanti</span>
        <span className="text-xs text-gray">— Vi matcher lavere priser</span>
      </a>

      {/* ---- 9. Trust badges ---- */}
      <TrustBadges />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported wrapper with Suspense                                    */
/* ------------------------------------------------------------------ */

export function ProductInfo({ product, collectionSlug }: { product: Product; collectionSlug?: string }) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-5">
          <div className="h-3 w-16 rounded bg-sand" />
          <div className="h-9 w-72 rounded bg-sand" />
          <div className="h-8 w-40 rounded bg-sand" />
          <div className="h-6 w-24 rounded-lg bg-sand" />
          <div className="h-4 w-48 rounded bg-sand" />
          <div className="h-12 w-full rounded-xl bg-sand" />
          <div className="flex gap-2">
            <div className="h-8 w-32 rounded-xl bg-sand" />
            <div className="h-8 w-32 rounded-xl bg-sand" />
            <div className="h-8 w-32 rounded-xl bg-sand" />
          </div>
        </div>
      }
    >
      <ProductInfoInner product={product} collectionSlug={collectionSlug} />
    </Suspense>
  );
}
