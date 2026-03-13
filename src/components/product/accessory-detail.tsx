"use client";

import { useState } from "react";
import Image from "next/image";
import type { SkuProduct } from "@/lib/supabase/platform-types";

type AccessoryDetailProps = {
  product: SkuProduct;
  /** Optional list of compatible device display names */
  compatibleDevices?: string[];
};

function formatDKK(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

export function AccessoryDetail({ product, compatibleDevices = [] }: AccessoryDetailProps) {
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const images = product.images;
  const mainImage = images[mainImageIndex] ?? null;

  // Compute effective price based on selected variant options
  let effectivePrice = product.sale_price ?? product.selling_price;
  for (const variant of product.variants) {
    const chosenOption = selectedVariants[variant.name];
    if (chosenOption) {
      const opt = variant.options.find((o) => o.value === chosenOption);
      if (opt?.price_override != null) {
        effectivePrice = opt.price_override;
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Image gallery */}
      <div className="flex gap-3">
        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex flex-col gap-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setMainImageIndex(i)}
                className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${
                  i === mainImageIndex
                    ? "border-green-eco"
                    : "border-sand hover:border-charcoal/30"
                }`}
              >
                <Image
                  src={img}
                  alt={`${product.title} billede ${i + 1}`}
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="relative flex-1 aspect-square overflow-hidden rounded-2xl bg-cream">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.title}
              fill
              className="object-contain p-8"
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                viewBox="0 0 64 64"
                className="h-20 w-20 text-sand"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="8" y="8" width="48" height="48" rx="4" />
                <path d="M8 24h48M24 8v16" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Product info */}
      <div className="flex flex-col gap-5">
        <div>
          {product.brand && (
            <p className="text-sm font-medium uppercase tracking-wide text-gray">
              {product.brand}
              {product.category ? ` · ${product.category}` : ""}
            </p>
          )}
          <h1 className="mt-1 font-display text-3xl font-bold text-charcoal">
            {product.title}
          </h1>
          {product.short_description && (
            <p className="mt-2 text-sm text-charcoal/60">
              {product.short_description}
            </p>
          )}
        </div>

        {/* Variant selectors */}
        {product.variants.map((variant) => (
          <div key={variant.name}>
            <p className="mb-2 text-sm font-bold text-charcoal">
              {variant.name}
              {selectedVariants[variant.name] && (
                <span className="ml-2 font-normal text-charcoal/50">
                  — {selectedVariants[variant.name]}
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {variant.options.map((opt) => {
                const isSelected = selectedVariants[variant.name] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setSelectedVariants((prev) => ({
                        ...prev,
                        [variant.name]: isSelected ? "" : opt.value,
                      }))
                    }
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-green-eco bg-green-eco text-white"
                        : "border-sand bg-white text-charcoal hover:border-green-eco/50"
                    }`}
                  >
                    {opt.value}
                    {opt.price_override != null && (
                      <span className="ml-1.5 text-xs opacity-70">
                        ({formatDKK(opt.price_override)})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Price + CTA */}
        <div className="rounded-2xl border border-sand bg-white p-5">
          <div className="flex items-end gap-2">
            <span className="font-display text-3xl font-bold text-charcoal">
              {formatDKK(effectivePrice)}
            </span>
            {product.sale_price != null && product.sale_price < product.selling_price && (
              <span className="mb-0.5 text-sm text-charcoal/40 line-through">
                {formatDKK(product.selling_price)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-charcoal/50">inkl. moms · Fri fragt over 499 kr.</p>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-green-eco px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-green-eco/90"
          >
            Læg i kurv
          </button>
        </div>

        {/* Description */}
        {product.description && (
          <div className="rounded-xl border border-sand bg-white p-5">
            <h2 className="mb-2 text-sm font-bold text-charcoal">Beskrivelse</h2>
            <p className="whitespace-pre-line text-sm text-charcoal/70">
              {product.description}
            </p>
          </div>
        )}

        {/* Compatible devices */}
        {compatibleDevices.length > 0 && (
          <div className="rounded-xl border border-sand bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-charcoal">
              Kompatible enheder
            </h2>
            <div className="flex flex-wrap gap-2">
              {compatibleDevices.map((device) => (
                <span
                  key={device}
                  className="rounded-full bg-warm-white px-3 py-1 text-xs font-medium text-charcoal"
                >
                  {device}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
