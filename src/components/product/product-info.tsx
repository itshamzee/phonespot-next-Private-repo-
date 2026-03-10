"use client";

import { Suspense, useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import type { Product, ProductVariant } from "@/lib/shopify/types";
import { Price } from "@/components/ui/price";
import { VariantSelector } from "@/components/product/variant-selector";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { GradePicker } from "@/components/product/grade-picker";
import { SizeSelector } from "@/components/product/size-selector";
import { ColorSelector } from "@/components/product/color-selector";
import { StoreAvailabilityBadge } from "@/components/product/store-availability-badge";

/* ------------------------------------------------------------------ */
/*  Option name recognition                                           */
/* ------------------------------------------------------------------ */

const SIZE_OPTION_NAMES = ["size", "størrelse", "gb", "lagerplads", "lager plads"];
const COLOR_OPTION_NAMES = ["farve", "color"];
const GRADE_OPTION_NAMES = ["stand"];

function isSizeOption(name: string) {
  return SIZE_OPTION_NAMES.includes(name.toLowerCase());
}
function isColorOption(name: string) {
  return COLOR_OPTION_NAMES.includes(name.toLowerCase());
}
function isGradeOption(name: string) {
  return GRADE_OPTION_NAMES.includes(name.toLowerCase());
}

/** Map any Stand value from Shopify to a normalized grade. */
function normalizeGrade(value: string): "Ny" | "A" | "B" | "C" | null {
  const v = value.toLowerCase().trim();
  if (v === "ny" || v === "ny stand" || v === "new" || v === "fabriksny") return "Ny";
  if (v === "som ny" || v === "som new") return "A";
  if (v === "god" || v === "god stand") return "B";
  if (v === "okay" || v === "ok" || v === "okay stand" || v === "ok stand") return "C";
  if (v.includes("grade a") || (v.includes("ny") && v.includes("pakke"))) return "A";
  if (v.includes("grade c")) return "C";
  if (v.includes("grade b")) return "B";
  if (v.includes("som ny")) return "A";
  if (v.includes("god")) return "B";
  if (v.includes("okay") || v.includes("ok ")) return "C";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

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

/** Update URL search params without triggering Next.js navigation */
function updateUrlParam(pathname: string, currentParams: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  const url = search ? `${pathname}?${search}` : pathname;
  window.history.replaceState(window.history.state, "", url);
}

/* ------------------------------------------------------------------ */
/*  Main inner component                                              */
/* ------------------------------------------------------------------ */

const UPSELL_COLLECTIONS = ["iphones", "ipads", "smartphones"];

function ProductInfoInner({ product, collectionSlug }: { product: Product; collectionSlug?: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const options = useMemo(
    () => getUniqueOptions(product.variants),
    [product.variants],
  );

  const hasGradeVariants = options.some((opt) => isGradeOption(opt.name));
  const sizeOption = options.find((opt) => isSizeOption(opt.name));
  const hasSizeOption = !!sizeOption;
  const colorOption = options.find((opt) => isColorOption(opt.name));
  const hasColorOption = !!colorOption;

  const sizes = sizeOption?.values ?? [];
  const sizeLabel =
    sizeOption?.name.toLowerCase() === "size" || sizeOption?.name.toLowerCase() === "størrelse"
      ? "Størrelse"
      : sizeOption?.name.toLowerCase() === "ram"
        ? "RAM"
        : "Lagerplads";
  const colors = colorOption?.values ?? [];

  // ---- Local state for instant UI ----
  const [selectedSize, setSelectedSize] = useState(
    () => searchParams.get("size") ?? sizes[0] ?? "",
  );
  const [selectedColor, setSelectedColor] = useState(
    () => searchParams.get("farve") ?? colors[0] ?? "",
  );
  const [selectedStand, setSelectedStand] = useState(
    () => searchParams.get("stand") ?? "",
  );
  // For generic variant selector options (non-grade products)
  const [genericSelections, setGenericSelections] = useState<Record<string, string>>(() => {
    const sel: Record<string, string> = {};
    for (const opt of options) {
      const key = opt.name.toLowerCase();
      sel[key] = searchParams.get(key) ?? "";
    }
    return sel;
  });

  // Determine the default grade: prefer "Ny" if a variant has it, else "A"
  const defaultGrade: "Ny" | "A" | "B" | "C" = (() => {
    const hasNy = product.variants.some((v) =>
      v.selectedOptions.some(
        (opt) => opt.name.toLowerCase() === "stand" && normalizeGrade(opt.value) === "Ny",
      ),
    );
    return hasNy ? "Ny" : "A";
  })();

  const selectedGrade: "Ny" | "A" | "B" | "C" = selectedStand
    ? (normalizeGrade(selectedStand) ?? defaultGrade)
    : defaultGrade;

  // Sync URL when selections change (no navigation, instant)
  useEffect(() => {
    const params: Record<string, string> = {};
    if (hasGradeVariants) {
      if (selectedSize) params.size = selectedSize;
      if (selectedColor) params.farve = selectedColor;
      if (selectedStand) params.stand = selectedStand;
    } else {
      for (const [key, value] of Object.entries(genericSelections)) {
        if (value) params[key] = value;
      }
    }
    updateUrlParam(pathname, params);
  }, [selectedSize, selectedColor, selectedStand, genericSelections, hasGradeVariants, pathname]);

  // ---- Callbacks for child selectors ----
  const handleSizeSelect = useCallback((size: string) => {
    setSelectedSize(size);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const handleGradeSelect = useCallback((_grade: "Ny" | "A" | "B" | "C", standValue: string) => {
    setSelectedStand(standValue);
  }, []);

  const handleOptionChange = useCallback((optionName: string, value: string) => {
    const key = optionName.toLowerCase();
    setGenericSelections((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Filter variants by size and color before passing to grade picker
  let filteredVariants = product.variants;

  if (hasSizeOption && selectedSize) {
    filteredVariants = filteredVariants.filter((v) =>
      v.selectedOptions.some(
        (opt) => isSizeOption(opt.name) && opt.value === selectedSize,
      ),
    );
  }

  if (hasColorOption && selectedColor) {
    filteredVariants = filteredVariants.filter((v) =>
      v.selectedOptions.some(
        (opt) => isColorOption(opt.name) && opt.value === selectedColor,
      ),
    );
  }

  const selectedVariant = useMemo(() => {
    if (product.variants.length === 1) return product.variants[0];

    if (hasGradeVariants) {
      const matched = product.variants.find((variant) =>
        variant.selectedOptions.every((opt) => {
          const optName = opt.name.toLowerCase();
          if (isSizeOption(optName)) {
            return selectedSize ? opt.value === selectedSize : true;
          }
          if (isColorOption(optName)) {
            return selectedColor ? opt.value === selectedColor : true;
          }
          if (isGradeOption(optName)) {
            return selectedStand ? normalizeGrade(opt.value) === normalizeGrade(selectedStand) : true;
          }
          return true;
        }),
      );
      return matched ?? product.variants[0];
    }

    // Generic variant matching
    const matched = product.variants.find((variant) =>
      variant.selectedOptions.every((opt) => {
        const key = opt.name.toLowerCase();
        const paramValue = genericSelections[key];
        if (!paramValue) return false;
        return paramValue === opt.value;
      }),
    );
    return matched ?? product.variants[0];
  }, [product.variants, selectedSize, selectedColor, selectedStand, genericSelections, hasGradeVariants]);

  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice ?? null;
  const availableForSale =
    selectedVariant?.availableForSale ?? product.availableForSale;
  const savingsPercent = getSavingsPercent(price.amount, compareAt?.amount ?? null);
  const showUpsellOnAdd = UPSELL_COLLECTIONS.includes(collectionSlug ?? "");

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Title ---- */}
      <h1 className="font-display text-2xl font-bold leading-tight text-charcoal md:text-3xl">
        {product.title}
      </h1>

      {/* ---- Price + availability (inline) ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <Price
          amount={price.amount}
          currencyCode={price.currencyCode}
          compareAt={compareAt?.amount ?? null}
          className="text-2xl"
        />
        {savingsPercent && (
          <span className="inline-flex items-center rounded-full bg-green-eco/10 px-2.5 py-0.5 text-xs font-semibold text-green-eco">
            Spar {savingsPercent}%
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-green-eco">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${availableForSale ? "bg-green-eco" : "bg-red-600"}`} />
          {availableForSale ? "På lager" : "Udsolgt"}
        </span>
      </div>

      {/* ---- Color selector ---- */}
      {hasColorOption && <ColorSelector colors={colors} selectedColor={selectedColor} onSelect={handleColorSelect} />}

      {/* ---- Size selector ---- */}
      {hasGradeVariants && <SizeSelector sizes={sizes} selectedSize={selectedSize} label={sizeLabel} onSelect={handleSizeSelect} />}

      {/* ---- Grade picker OR variant selector ---- */}
      {hasGradeVariants ? (
        <GradePicker
          variants={filteredVariants}
          selectedGrade={selectedGrade}
          onSelect={handleGradeSelect}
        />
      ) : (
        <VariantSelector variants={product.variants} options={options} onOptionChange={handleOptionChange} selectedOptions={genericSelections} />
      )}

      {/* ---- Add to cart ---- */}
      <AddToCartButton
        variantId={selectedVariant?.id ?? ""}
        availableForSale={availableForSale}
        showUpsellOnAdd={showUpsellOnAdd}
      />

      {/* ---- Store availability ---- */}
      <StoreAvailabilityBadge storeAvailability={selectedVariant?.storeAvailability} />

      {/* ---- Klarna split payment ---- */}
      <div className="flex items-center gap-2.5 rounded-xl bg-[#FFB3C7]/10 border border-[#FFB3C7]/25 px-4 py-2.5">
        <svg className="h-4 w-4 shrink-0 text-[#E8367C]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
        </svg>
        <span className="text-[11px] font-medium text-charcoal/80">
          Betal i 3 rater med <span className="font-bold">Klarna</span> — fra {Math.ceil(parseFloat(price.amount) / 3)} kr/md.
        </span>
      </div>

      {/* ---- Compact trust strip ---- */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand/40 px-3 py-2.5 sm:flex sm:items-center sm:justify-between sm:px-4">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-charcoal/70">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-green-eco">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          1-2 dage
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-charcoal/70">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-green-eco">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          14 dages retur
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-charcoal/70">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-green-eco">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          36 mdr. garanti
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-charcoal/70">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-green-eco">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Prismatch
        </span>
      </div>
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
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-sand" />
          <div className="h-7 w-32 rounded bg-sand" />
          <div className="h-10 w-full rounded-xl bg-sand" />
          <div className="h-12 w-full rounded-xl bg-sand" />
        </div>
      }
    >
      <ProductInfoInner product={product} collectionSlug={collectionSlug} />
    </Suspense>
  );
}
