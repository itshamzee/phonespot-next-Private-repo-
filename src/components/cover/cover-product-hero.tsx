"use client";

import { useState } from "react";
import type { Product } from "@/lib/shopify/types";
import { AddToCartButton } from "@/components/product/add-to-cart-button";

function formatPrice(amount: string, currency: string) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function CoverProductHero({
  product,
  compatibleModels,
}: {
  product: Product;
  compatibleModels: string[];
}) {
  const [selectedImage, setSelectedImage] = useState(0);
  const images = product.images;
  const variant = product.variants[0];
  const price = product.priceRange.minVariantPrice;
  const compareAt = variant?.compareAtPrice;
  const savingsPercent =
    compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount)
      ? Math.round(
          ((parseFloat(compareAt.amount) - parseFloat(price.amount)) /
            parseFloat(compareAt.amount)) *
            100,
        )
      : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
        {/* Left: Image gallery */}
        <div className="flex flex-col-reverse gap-3 md:flex-row">
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 md:flex-col md:gap-2.5">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all md:h-[72px] md:w-[72px] ${
                    i === selectedImage
                      ? "border-green-eco shadow-sm"
                      : "border-sand hover:border-charcoal/20"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.altText ?? `${product.title} billede ${i + 1}`}
                    className="h-full w-full object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main image */}
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-sand bg-white">
            {savingsPercent && (
              <div className="absolute left-4 top-4 z-10 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                -{savingsPercent}%
              </div>
            )}
            {images[selectedImage] ? (
              <img
                src={images[selectedImage].url}
                alt={images[selectedImage].altText ?? product.title}
                className="aspect-square w-full object-contain p-8"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-cream text-gray">
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Right: Product info */}
        <div className="flex flex-col">
          {/* Title */}
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl lg:text-4xl">
            {product.title}
          </h1>

          {/* Compatible models */}
          {compatibleModels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {compatibleModels.map((model) => (
                <span
                  key={model}
                  className="rounded-full bg-sand/60 px-3 py-1 text-xs font-medium text-charcoal/70"
                >
                  {model}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-charcoal">
              {formatPrice(price.amount, price.currencyCode)}
            </span>
            {compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount) && (
              <span className="text-lg text-gray line-through">
                {formatPrice(compareAt.amount, compareAt.currencyCode)}
              </span>
            )}
          </div>

          {/* Fri fragt notice */}
          {parseFloat(price.amount) >= 899 ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-green-eco">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Fri fragt
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray">
              Fri fragt ved køb over 899 kr
            </p>
          )}

          {/* Divider */}
          <div className="my-6 h-px bg-sand" />

          {/* Description */}
          {product.description && (
            <div className="mb-6 text-sm leading-relaxed text-charcoal/70">
              <p>{product.description}</p>
            </div>
          )}

          {/* Add to cart */}
          <div className="mt-auto flex flex-col gap-3">
            <AddToCartButton
              variantId={variant?.id ?? ""}
              availableForSale={product.availableForSale}
            />

            {/* Klarna split payment */}
            <div className="flex items-center gap-2.5 rounded-xl bg-[#FFB3C7]/10 border border-[#FFB3C7]/20 px-4 py-2.5">
              <svg className="h-5 w-5 shrink-0 text-[#E8367C]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-charcoal">
                  Betal i 3 rater med Klarna
                </span>
                <span className="text-[11px] text-charcoal/60">
                  3 x {formatPrice(String(Math.ceil(parseFloat(price.amount) / 3)), price.currencyCode)} — rentefrit
                </span>
              </div>
            </div>

            {/* Quick info */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray">
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H21" />
                </svg>
                1-2 dages levering
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                14 dages retur
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
                Sikker betaling
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
