"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SkuProduct } from "@/lib/supabase/platform-types";
import { useCart } from "@/components/cart/cart-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossSellProduct {
  id: string;
  title: string;
  slug: string | null;
  selling_price: number;
  sale_price: number | null;
  images: string[];
  category: string | null;
}

type AccessoryDetailProps = {
  product: SkuProduct;
  compatibleDevices?: string[];
  crossSellProducts?: CrossSellProduct[];
  stockQuantity?: number | null;
  category?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDKK(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

// Attribute label map — Danish translations
const ATTRIBUTE_LABELS: Record<string, string> = {
  connector_type: "Stik-type",
  case_type: "Type",
  length: "Laengde",
  width: "Bredde",
  material: "Materiale",
  color: "Farve",
  wattage: "Watt",
  compatibility: "Kompatibel med",
  weight: "Vaegt",
  dimensions: "Maal",
  cable_length: "Kabellengde",
  screen_size: "Skaermstorrelse",
  protection_level: "Beskyttelsesniveau",
};

function attributeLabel(key: string): string {
  return ATTRIBUTE_LABELS[key] ?? key.replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? "h-4 w-4"}
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StockIndicator({ quantity }: { quantity: number | null | undefined }) {
  if (quantity === null || quantity === undefined) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-green-700">Pa lager</span>
      </div>
    );
  }
  if (quantity <= 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="text-sm font-medium text-red-600">Udsolgt</span>
      </div>
    );
  }
  if (quantity < 5) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="text-sm font-medium text-amber-700">
          Kun {quantity} pa lager
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      <span className="text-sm font-medium text-green-700">Pa lager</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image gallery with zoom
// ---------------------------------------------------------------------------

function ImageGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [mainIndex, setMainIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imgContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  }, []);

  const mainImage = images[mainIndex] ?? null;

  return (
    <div className="flex gap-3">
      {/* Thumbnails — left column */}
      {images.length > 1 && (
        <div className="flex flex-col gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMainIndex(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                i === mainIndex
                  ? "border-green-eco shadow-sm"
                  : "border-sand hover:border-charcoal/30"
              }`}
            >
              <Image
                src={img}
                alt={`${title} billede ${i + 1}`}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image with zoom */}
      <div
        ref={imgContainerRef}
        className="relative flex-1 aspect-square overflow-hidden rounded-2xl bg-cream cursor-zoom-in"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={handleMouseMove}
      >
        {mainImage ? (
          <Image
            src={mainImage}
            alt={title}
            fill
            className="object-contain p-8 transition-transform duration-200 ease-out"
            style={
              zoom
                ? {
                    transform: "scale(1.5)",
                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                  }
                : { transform: "scale(1)" }
            }
            sizes="(min-width: 1024px) 55vw, 100vw"
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
  );
}

// ---------------------------------------------------------------------------
// Add to Cart Button
// ---------------------------------------------------------------------------

function AddToCartButton({
  product,
  effectivePrice,
  disabled = false,
  fullWidth = true,
  label = "Tilfoj til kurv",
}: {
  product: SkuProduct;
  effectivePrice: number;
  disabled?: boolean;
  fullWidth?: boolean;
  label?: string;
}) {
  const { addSku, openCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    if (disabled) return;
    addSku({
      type: "sku_product",
      skuProductId: product.id,
      title: product.title,
      image: product.images[0] ?? null,
      price: effectivePrice,
      quantity: 1,
    });
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={disabled || added}
      className={`flex items-center justify-center gap-2 rounded-full bg-green-eco px-6 py-3.5 text-base font-bold text-white transition-all hover:bg-green-eco/90 active:scale-[0.98] disabled:opacity-60 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {added ? (
        <>
          <CheckIcon className="h-5 w-5" />
          Lagt i kurv!
        </>
      ) : (
        label
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Cross-sell card
// ---------------------------------------------------------------------------

function CrossSellCard({ product }: { product: CrossSellProduct }) {
  const { addSku, openCart } = useCart();
  const price = product.sale_price ?? product.selling_price;

  function handleAdd() {
    addSku({
      type: "sku_product",
      skuProductId: product.id,
      title: product.title,
      image: product.images[0] ?? null,
      price,
      quantity: 1,
    });
    openCart();
  }

  const href = product.slug
    ? `/tilbehoer/${product.category ?? "covers"}/${product.slug}`
    : "#";

  return (
    <div className="flex flex-col rounded-2xl border border-sand bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-cream">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-contain p-4"
              sizes="200px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                viewBox="0 0 64 64"
                className="h-10 w-10 text-sand"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="8" y="8" width="48" height="48" rx="4" />
              </svg>
            </div>
          )}
        </div>
        <p className="line-clamp-2 text-sm font-medium text-charcoal leading-snug">
          {product.title}
        </p>
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-base font-bold text-green-eco">{formatDKK(price)}</span>
        {product.sale_price != null && product.sale_price < product.selling_price && (
          <span className="text-xs text-charcoal/40 line-through">
            {formatDKK(product.selling_price)}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 w-full rounded-full border-2 border-green-eco bg-white px-4 py-2 text-sm font-bold text-green-eco transition-colors hover:bg-green-eco hover:text-white"
      >
        Tilfoj
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sticky mobile CTA
// ---------------------------------------------------------------------------

function StickyMobileCta({
  product,
  effectivePrice,
  ctaRef,
}: {
  product: SkuProduct;
  effectivePrice: number;
  ctaRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar when main CTA is NOT visible
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ctaRef]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-sand bg-white px-4 py-3 shadow-lg transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">
            {product.title}
          </p>
          <p className="text-base font-bold text-green-eco">
            {formatDKK(effectivePrice)}
          </p>
        </div>
        <AddToCartButton
          product={product}
          effectivePrice={effectivePrice}
          fullWidth={false}
          label="Tilfoj til kurv"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AccessoryDetail({
  product,
  compatibleDevices = [],
  crossSellProducts = [],
  stockQuantity,
  category,
}: AccessoryDetailProps) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const ctaRef = useRef<HTMLDivElement>(null);

  // Compute effective price from selected variant options
  let effectivePrice = product.sale_price ?? product.selling_price;
  const hasSale =
    product.sale_price != null && product.sale_price < product.selling_price;

  for (const variant of product.variants) {
    const chosenOption = selectedVariants[variant.name];
    if (chosenOption) {
      const opt = variant.options.find((o) => o.value === chosenOption);
      if (opt?.price_override != null) {
        effectivePrice = opt.price_override;
      }
    }
  }

  // Attributes to display (excluding internal ones)
  const HIDDEN_ATTRS = new Set(["_source", "source"]);
  const attributeEntries = product.attributes
    ? Object.entries(product.attributes).filter(
        ([k, v]) => !HIDDEN_ATTRS.has(k) && v !== null && v !== undefined && v !== "",
      )
    : [];

  // Category label for cross-sell heading
  const isCover =
    category === "covers" ||
    product.category === "cover" ||
    product.subcategory === "cover";
  const crossSellHeading = isCover
    ? "Komplet beskyttelsen — Skærmbeskyttelse"
    : "Komplet beskyttelsen — Cover";

  return (
    <>
      {/* ================================================================
          Hero grid
      ================================================================ */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[55%_45%]">
        {/* Left — image gallery */}
        <ImageGallery images={product.images} title={product.title} />

        {/* Right — product info */}
        <div className="flex flex-col gap-5">
          {/* Brand + title */}
          <div>
            {product.brand && (
              <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/40">
                {product.brand}
              </p>
            )}
            <h1 className="mt-1 font-display text-2xl font-bold text-charcoal leading-tight">
              {product.title}
            </h1>
            {product.short_description && (
              <p className="mt-2 text-sm text-charcoal/60 leading-relaxed">
                {product.short_description}
              </p>
            )}
          </div>

          {/* Price */}
          <div>
            {hasSale ? (
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold text-red-600">
                  {formatDKK(effectivePrice)}
                </span>
                <span className="text-lg text-charcoal/40 line-through">
                  {formatDKK(product.selling_price)}
                </span>
              </div>
            ) : (
              <span className="font-display text-3xl font-bold text-green-eco">
                {formatDKK(effectivePrice)}
              </span>
            )}
            <p className="mt-1 text-xs text-charcoal/50">Inkl. moms</p>
          </div>

          {/* Compatible devices */}
          {compatibleDevices.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-charcoal">
                Passer til:
              </p>
              <div className="flex flex-wrap gap-2">
                {compatibleDevices.map((device) => (
                  <span
                    key={device}
                    className="rounded-full border border-green-eco/30 bg-green-eco/8 px-3 py-1 text-xs font-medium text-green-eco"
                    style={{ backgroundColor: "rgba(26,61,46,0.06)" }}
                  >
                    {device}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {/* CTA block */}
          <div ref={ctaRef} className="rounded-2xl border border-sand bg-white p-5">
            {/* Stock */}
            <div className="mb-4">
              <StockIndicator quantity={stockQuantity} />
            </div>

            {/* Add to cart */}
            <AddToCartButton
              product={product}
              effectivePrice={effectivePrice}
              disabled={stockQuantity !== null && stockQuantity !== undefined && stockQuantity <= 0}
            />

            {/* Trust strip */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              {[
                "36 mdr. garanti",
                "14 dages returret",
                "Fri fragt over 499 kr.",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 flex-shrink-0 text-green-eco" />
                  <span className="text-xs text-charcoal/60">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Attributes / specs — inline on right panel if few */}
          {attributeEntries.length > 0 && attributeEntries.length <= 4 && (
            <div className="rounded-2xl border border-sand bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-charcoal">
                Specifikationer
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                {attributeEntries.map(([key, val]) => (
                  <div key={key} className="contents">
                    <dt className="text-sm text-charcoal/50">{attributeLabel(key)}</dt>
                    <dd className="text-sm font-medium text-charcoal">{String(val)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          Below-fold content
      ================================================================ */}
      <div className="mt-12 flex flex-col gap-10">
        {/* Description */}
        {product.description && (
          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-charcoal">
              Beskrivelse
            </h2>
            <div className="rounded-2xl border border-sand bg-white p-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal/70">
                {product.description}
              </p>
            </div>
          </section>
        )}

        {/* Full spec table — only if more than 4 attributes */}
        {attributeEntries.length > 4 && (
          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-charcoal">
              Specifikationer
            </h2>
            <div className="rounded-2xl border border-sand bg-white overflow-hidden">
              <dl>
                {attributeEntries.map(([key, val], idx) => (
                  <div
                    key={key}
                    className={`grid grid-cols-[180px_1fr] gap-6 px-6 py-3.5 ${
                      idx % 2 === 0 ? "bg-cream/50" : "bg-white"
                    }`}
                  >
                    <dt className="text-sm font-medium text-charcoal/50">
                      {attributeLabel(key)}
                    </dt>
                    <dd className="text-sm font-medium text-charcoal">
                      {String(val)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* Cross-sell */}
        {crossSellProducts.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-charcoal">
                {crossSellHeading}
              </h2>
              <span className="text-sm text-charcoal/40">
                Passer til de samme enheder
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {crossSellProducts.slice(0, 3).map((p) => (
                <CrossSellCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Trustpilot Reviews — loaded async by parent via Suspense */}
        <section>
          <h2 className="mb-6 font-display text-xl font-bold text-charcoal">
            Anmeldelser fra vores kunder
          </h2>
          {/* Wrapper div — parent page renders TrustpilotReviews inside a Suspense here */}
          <div id="trustpilot-reviews-slot" />
        </section>

        {/* USP bar */}
        <section className="rounded-2xl bg-green-eco/5 border border-green-eco/20 p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: "🛡️", title: "36 mdr. garanti", sub: "Pa alle produkter" },
              { icon: "↩️", title: "14 dages returret", sub: "Ingen sporgsmal" },
              { icon: "🚚", title: "1-2 dages levering", sub: "Fri fragt over 499 kr." },
              { icon: "✅", title: "30+ kvalitetstests", sub: "Kun topkvalitet" },
            ].map((usp) => (
              <div key={usp.title} className="flex flex-col items-center text-center gap-1">
                <span className="text-2xl">{usp.icon}</span>
                <span className="text-sm font-bold text-charcoal">{usp.title}</span>
                <span className="text-xs text-charcoal/50">{usp.sub}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky mobile CTA */}
      <StickyMobileCta
        product={product}
        effectivePrice={effectivePrice}
        ctaRef={ctaRef}
      />
    </>
  );
}
