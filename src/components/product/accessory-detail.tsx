"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PublicSkuProduct } from "@/lib/product/public-sku";
import { ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";
import { useCart } from "@/components/cart/cart-context";
import type { ColorSibling } from "@/lib/product-color-siblings";

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
  subcategory?: string | null;
}

export interface CompatibleDevice {
  name: string;
  brand: string;
}

type AccessoryDetailProps = {
  product: PublicSkuProduct;
  compatibleDevices?: CompatibleDevice[];
  crossSellProducts?: CrossSellProduct[];
  stockQuantity?: number | null;
  storeStockLocations?: string[];
  category?: string;
  colorSiblings?: ColorSibling[];
  /** Salgsargumenter fra sku_products.specifications.highlights ("Titel: tekst" eller ren tekst). */
  highlights?: string[];
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

// Attribute label map — Danish translations (mirrors the map in
// app/[collection]/[product]/page.tsx and app/baerbare/[brand]/page.tsx).
const ATTRIBUTE_LABELS: Record<string, string> = {
  connector_type: "Stiktype",
  case_type: "Type",
  charger_type: "Type",
  protector_type: "Type",
  service_type: "Type",
  length: "Længde",
  width: "Bredde",
  material: "Materiale",
  color: "Farve",
  wattage: "Watt",
  watt: "Watt",
  compatibility: "Kompatibel med",
  weight: "Vægt",
  dimensions: "Mål",
  cable_length: "Kabellængde",
  screen_size: "Skærmstørrelse",
  protection_level: "Beskyttelsesniveau",
  card_slots: "Kortpladser",
  closure: "Lukning",
  capacity: "Kapacitet",
  audio_type: "Type",
  wireless: "Trådløs",
};

const CASE_TYPE_LABELS: Record<string, string> = {
  clear: "Gennemsigtigt cover",
  wallet: "Pungcover",
  book: "Bogcover",
  slim: "Slankt cover",
  rugged: "Forstærket cover",
  flip: "Flipcover",
  bumper: "Kantcover",
};

const HIDDEN_ATTRS = new Set(["_source", "source", "id"]);

function attributeLabel(key: string): string {
  const label = ATTRIBUTE_LABELS[key] ?? key.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function attributeValue(key: string, val: unknown): string {
  if (key === "case_type") return CASE_TYPE_LABELS[String(val).toLowerCase()] ?? String(val);
  return String(val);
}

/** "Aftageligt cover: Tag kun coveret med" → titel + tekst. Uden kolon er hele linjen titlen. */
function splitHighlight(raw: string): { title: string; body: string | null } {
  const text = raw.trim();
  const idx = text.indexOf(": ");
  if (idx > 0 && idx <= 40) return { title: text.slice(0, idx), body: text.slice(idx + 2).trim() || null };
  return { title: text, body: null };
}

function isColorVariant(name: string): boolean {
  return /farve|color|colour/i.test(name);
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

function StockIndicator({ label }: {label:string}) {
  return <p className="text-sm font-medium text-charcoal/70">{label}</p>;
}

// ---------------------------------------------------------------------------
// Image gallery with zoom and override support
// ---------------------------------------------------------------------------

function ImageGallery({
  images,
  title,
  overrideImage,
  onThumbnailClick,
}: {
  images: string[];
  title: string;
  overrideImage?: string | null;
  onThumbnailClick?: () => void;
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

  function handleThumbnailClick(i: number) {
    setMainIndex(i);
    // Clicking a thumbnail clears the variant override
    onThumbnailClick?.();
  }

  const displayedImage = overrideImage ?? images[mainIndex] ?? null;

  return (
    <div className="flex min-w-0 flex-col-reverse gap-3 sm:flex-row lg:col-start-1 lg:row-start-1 lg:row-span-2">
      {/* Thumbnails — left column */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto sm:flex-col">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Vis billede ${i + 1}`}
              aria-pressed={!overrideImage && i === mainIndex}
              onClick={() => handleThumbnailClick(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                !overrideImage && i === mainIndex
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
        className="relative min-w-0 flex-1 aspect-square overflow-hidden rounded-2xl bg-[#f4f5f2] cursor-zoom-in"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={handleMouseMove}
      >
        {displayedImage ? (
          <Image
            src={displayedImage}
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
  selectedVariants,
  variantImage,
  disabled = false,
  fullWidth = true,
  label = "Tilføj til kurv",
}: {
  product: PublicSkuProduct;
  effectivePrice: number;
  selectedVariants?: Record<string, string>;
  variantImage?: string | null;
  disabled?: boolean;
  fullWidth?: boolean;
  label?: string;
}) {
  const { addSku, openCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    if (disabled) return;
    // Build variant label for cart display (e.g. "Farve: Sort, Størrelse: L")
    const variantParts = Object.entries(selectedVariants ?? {}).filter(([, v]) => v);
    const variantLabel = variantParts.length > 0
      ? variantParts.map(([k, v]) => `${k}: ${v}`).join(", ")
      : undefined;
    addSku({
      type: "sku_product",
      skuProductId: product.id,
      title: product.title,
      image: variantImage ?? product.images[0] ?? null,
      price: effectivePrice,
      quantity: 1,
      variantLabel,
      ...(product.spotKind ? { spotKind: product.spotKind, ...(effectivePrice < product.selling_price ? { unitPrice: product.selling_price } : {}) } : {}),
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
      className={`flex items-center justify-center gap-2 rounded-lg bg-[#1A3D2E] px-6 py-3.5 text-base font-bold text-white transition-all hover:bg-green-eco/90 active:scale-[0.98] disabled:opacity-60 ${
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
    ? `/tilbehoer/${ACCESSORY_CATEGORY_TO_SLUG[product.subcategory ?? ""] ?? "covers"}/${product.slug}`
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
        Tilføj
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
  selectedVariants,
  variantImageOverride,
  ctaRef,
  canBuy,
  stockLabel,
}: {
  product: PublicSkuProduct;
  effectivePrice: number;
  selectedVariants: Record<string, string>;
  variantImageOverride: string | null;
  ctaRef: React.RefObject<HTMLDivElement | null>;
  canBuy: boolean;
  stockLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
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
          <p className="text-xs text-charcoal/60">{stockLabel}</p>
        </div>
        <AddToCartButton
          product={product}
          effectivePrice={effectivePrice}
          selectedVariants={selectedVariants}
          variantImage={variantImageOverride}
          fullWidth={false}
          disabled={!canBuy}
          label={canBuy ? "Tilføj til kurv" : stockLabel}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compatibility section — grouped by brand
// ---------------------------------------------------------------------------

function CompatibilitySection({ devices }: { devices: CompatibleDevice[] }) {
  if (devices.length === 0) return null;

  // Group by brand
  const grouped: Record<string, string[]> = {};
  for (const device of devices) {
    const brand = device.brand || "Andre";
    if (!grouped[brand]) grouped[brand] = [];
    grouped[brand].push(device.name);
  }

  const brandOrder = Object.keys(grouped).sort((a, b) => {
    // Apple and Samsung first
    if (a === "Apple") return -1;
    if (b === "Apple") return 1;
    if (a === "Samsung") return -1;
    if (b === "Samsung") return 1;
    return a.localeCompare(b);
  });

  return (
    <section id="compatibility">
      <h2 className="mb-4 font-body text-xl font-bold text-charcoal">
        Kompatibel med
      </h2>
      <div className="rounded-[16px] border border-sand bg-white overflow-hidden">
        <div className="divide-y divide-sand">
          {brandOrder.map((brand) => (
            <div key={brand} className="px-6 py-4">
              <p className="font-body text-xs font-bold tracking-normal text-charcoal/40 mb-1.5">
                {brand}
              </p>
              <p className="text-sm text-charcoal/70">
                {grouped[brand].join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Fit block — "which phone does this fit" is the first question on a cover,
// so it sits directly under the title instead of in a grey line below the price.
// ---------------------------------------------------------------------------

const FIT_INLINE_MAX = 4;

function FitBlock({ devices }: { devices: CompatibleDevice[] }) {
  if (devices.length === 0) return null;
  const shown = devices.slice(0, FIT_INLINE_MAX);
  const remaining = devices.length - shown.length;
  const hasIphone = devices.some((d) => /iphone/i.test(d.name));

  return (
    <div className="border-y border-sand py-4">
      <p className="text-[13px] font-medium text-gray">Passer til</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {shown.map((d) => (
          <li
            key={d.name}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-pale px-3 py-1.5 text-[15px] font-semibold text-green-eco"
          >
            <CheckIcon className="h-4 w-4" />
            {d.name}
          </li>
        ))}
        {remaining > 0 && (
          <li>
            <a
              href="#compatibility"
              className="inline-flex items-center rounded-lg border border-sand px-3 py-1.5 text-[15px] font-medium text-charcoal hover:border-charcoal/40"
            >
              og {remaining} flere
            </a>
          </li>
        )}
      </ul>
      {hasIphone && (
        <p className="mt-2.5 text-[13px] leading-snug text-gray">
          I tvivl om din model? Se den under Indstillinger, Generelt, Om på din iPhone.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature section — the second product photo next to the full list of
// highlights, so the functions of the cover are shown rather than buried in prose.
// ---------------------------------------------------------------------------

function FeatureSection({
  highlights,
  image,
  title,
  heading,
}: {
  highlights: { title: string; body: string | null }[];
  image: string | null;
  title: string;
  heading: string;
}) {
  if (highlights.length === 0) return null;
  return (
    <section id="funktioner" className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
      {image && (
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#f4f5f2] lg:aspect-square">
          <Image src={image} alt={title} fill className="object-contain p-5 sm:p-8" sizes="(min-width: 1024px) 45vw, 100vw" />
        </div>
      )}
      <div className={image ? "" : "lg:col-span-2 lg:max-w-3xl"}>
        <h2 className="font-body text-2xl font-semibold tracking-[-0.02em] text-charcoal sm:text-[28px]">{heading}</h2>
        <dl className="mt-5 divide-y divide-sand border-y border-sand">
          {highlights.map((h) => (
            <div key={h.title} className="py-4">
              <dt className="text-base font-semibold text-charcoal">{h.title}</dt>
              {h.body && <dd className="mt-1 text-[15px] leading-relaxed text-charcoal/70">{h.body}</dd>}
            </div>
          ))}
        </dl>
      </div>
    </section>
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
  storeStockLocations = [],
  category,
  colorSiblings = [],
  highlights = [],
}: AccessoryDetailProps) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [variantImageOverride, setVariantImageOverride] = useState<string | null>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const canBuy = (stockQuantity ?? 0) > 0 || product.always_in_stock;
  const stockLabel = (stockQuantity ?? 0) > 0 ? "På lager" : product.always_in_stock ? "Kan bestilles" : stockQuantity == null ? "Lagerstatus ukendt" : "Udsolgt";

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
    ? "Fuldend beskyttelsen — skærmbeskyttelse"
    : "Fuldend beskyttelsen — cover";

  const brand = product.brand?.trim() || null;
  const caseType = product.attributes?.case_type;
  const typeLabel = caseType ? CASE_TYPE_LABELS[String(caseType).toLowerCase()] ?? null : null;
  // Imported products often repeat the title as short description — skip it then.
  const shortDescription =
    product.short_description && product.short_description.trim().toLowerCase() !== product.title.trim().toLowerCase()
      ? product.short_description.trim()
      : null;

  const featureList = highlights.map(splitHighlight).filter((h) => h.title);
  const specEntries: [string, string][] = [
    ...(brand ? [["Mærke", brand] as [string, string]] : []),
    // jsonb returns keys alphabetically — lead with the product type instead
    ...[...attributeEntries]
      .sort(([a], [b]) => Number(b.endsWith("_type")) - Number(a.endsWith("_type")))
      .map(([key, val]) => [attributeLabel(key), attributeValue(key, val)] as [string, string]),
  ];
  // Up to four product facts for the band under the hero (brand is already in the title block)
  // — colour last, since the photos and title already show it.
  const factEntries = specEntries
    .filter(([label]) => label !== "Mærke")
    .sort(([a], [b]) => Number(a === "Farve") - Number(b === "Farve"))
    .slice(0, 4);

  return (
    <div className="font-body text-charcoal">
      {/* ================================================================
          Hero grid
      ================================================================ */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-5">
        {/* Title block (right column on desktop, above the gallery on mobile) */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          {(brand || typeLabel) && (
            <p className="text-[13px] font-medium text-gray">
              {brand}
              {brand && typeLabel && <span className="mx-2 text-sand" aria-hidden="true">|</span>}
              {typeLabel}
            </p>
          )}
          <h1 className="mt-2 font-body text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">{product.title}</h1>
          {shortDescription && <p className="mt-3 text-base leading-relaxed text-charcoal/70">{shortDescription}</p>}
        </div>
        <ImageGallery
          images={product.images}
          title={product.title}
          overrideImage={variantImageOverride}
          onThumbnailClick={() => setVariantImageOverride(null)}
        />

        {/* Right — product info */}
        <div className="min-w-0 flex flex-col gap-5 lg:col-start-2 lg:row-start-2">
          {/* Which phone it fits — first thing after the title */}
          <FitBlock devices={compatibleDevices} />

          {/* Price */}
          <div>
            {hasSale ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-body text-3xl font-bold text-red-600">
                  {formatDKK(effectivePrice)}
                </span>
                <span className="text-lg text-charcoal/40 line-through">
                  {formatDKK(product.selling_price)}
                </span>
                {effectivePrice < product.selling_price && (
                  <span className="rounded-md bg-red-600/10 px-2 py-0.5 text-[13px] font-semibold text-red-700">
                    Spar {formatDKK(product.selling_price - effectivePrice)}
                  </span>
                )}
              </div>
            ) : (
              <span className="font-body text-3xl font-bold text-charcoal">
                {formatDKK(effectivePrice)}
              </span>
            )}
            <p className="mt-1 text-xs text-charcoal/50">Inkl. moms</p>
          </div>

          {/* Key functions — short list, full version in #funktioner */}
          {featureList.length > 0 && (
            <div>
              <ul className="flex flex-col gap-2">
                {featureList.slice(0, 4).map((h) => (
                  <li key={h.title} className="flex items-start gap-2.5 text-[15px] leading-snug text-charcoal">
                    <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-light" />
                    {h.title}
                  </li>
                ))}
              </ul>
              {(featureList.length > 4 || featureList.some((h) => h.body)) && (
                <a href="#funktioner" className="mt-3 inline-block text-sm font-medium text-green-eco underline underline-offset-4 hover:text-green-light">
                  Se alle funktioner
                </a>
              )}
            </div>
          )}

          {/* Color siblings — linked products in different colors */}
          {colorSiblings.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-bold text-charcoal">
                Farve
                <span className="ml-2 font-normal text-charcoal/50">
                  {"— "}
                  {colorSiblings.find((s) => s.isCurrent)?.colorLabel ?? ""}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {colorSiblings.map((sib) => (
                  <Link
                    key={sib.id}
                    href={`/tilbehoer/${category}/${sib.slug}`}
                    title={sib.colorLabel}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                      sib.isCurrent
                        ? "border-green-eco bg-green-eco/5 text-charcoal"
                        : "border-sand bg-white text-charcoal/70 hover:border-charcoal/30"
                    }`}
                  >
                    {sib.image ? (
                      <Image
                        width={32}
                        height={32}
                        src={sib.image}
                        alt={sib.colorLabel}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        className="h-5 w-5 rounded-full border border-sand"
                        style={{ backgroundColor: sib.colorCss === "transparent" ? undefined : sib.colorCss }}
                      />
                    )}
                    {sib.colorLabel}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Variant selectors */}
          {product.variants.map((variant) => {
            const isColor = isColorVariant(variant.name);
            return (
              <fieldset key={variant.name}>
                <legend className="mb-2 text-sm font-bold text-charcoal">
                  {variant.name}
                  {selectedVariants[variant.name] && (
                    <span className="ml-2 font-normal text-charcoal/50">
                      — {selectedVariants[variant.name]}
                    </span>
                  )}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {variant.options.map((opt) => {
                    const isSelected = selectedVariants[variant.name] === opt.value;

                    // Color variant with image — render as image swatch
                    if (isColor && opt.image) {
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.value}
                          aria-label={opt.value}
                          aria-pressed={isSelected}
                          onClick={() => {
                            const newValue = isSelected ? "" : opt.value;
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [variant.name]: newValue,
                            }));
                            setVariantImageOverride(newValue ? opt.image : null);
                          }}
                          className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 object-cover transition-all ${
                            isSelected
                              ? "border-green-eco shadow-sm ring-2 ring-green-eco/20"
                              : "border-sand hover:border-charcoal/30"
                          }`}
                        >
                          <Image
                            src={opt.image}
                            alt={opt.value}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </button>
                      );
                    }

                    // All other variants (color without image, size, length, etc.) — text button
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          const newValue = isSelected ? "" : opt.value;
                          setSelectedVariants((prev) => ({
                            ...prev,
                            [variant.name]: newValue,
                          }));
                          // Clear image override when selecting non-image variant
                          if (isColor) setVariantImageOverride(null);
                        }}
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
              </fieldset>
            );
          })}

          {/* CTA block */}
          <div ref={ctaRef} className="rounded-2xl border border-sand bg-white p-5">
            {/* Stock */}
            <div className="mb-4">
              <StockIndicator label={stockLabel} />
              {(stockQuantity ?? 0) > 0 && storeStockLocations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {storeStockLocations.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1A3D2E]/8 px-2.5 py-1 text-xs font-medium text-[#1A3D2E]"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      På lager i {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add to cart */}
            <AddToCartButton
              product={product}
              effectivePrice={effectivePrice}
              selectedVariants={selectedVariants}
              variantImage={variantImageOverride}
              disabled={!canBuy}
              label={canBuy ? "Tilføj til kurv" : stockLabel}
            />

            {/* Trust strip */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Fri fragt */}
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0 text-charcoal/40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v3" />
                  <rect x="9" y="11" width="14" height="10" rx="1" />
                  <circle cx="12" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                </svg>
                <span className="text-xs text-charcoal/50">Fri fragt over 500 kr.</span>
              </div>
              {/* Garanti */}
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0 text-charcoal/40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="text-xs text-charcoal/50">2 års reklamationsret</span>
              </div>
              {/* Returret */}
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0 text-charcoal/40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span className="text-xs text-charcoal/50">14 dages returret</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Facts band — the key specs at a glance, before the long-form content */}
      {factEntries.length >= 3 && (
        <dl className="mt-10 grid grid-cols-2 border-y border-sand lg:mt-14 lg:grid-cols-4">
          {factEntries.map(([label, value], i) => (
            <div
              key={label}
              className={`px-1 py-5 sm:px-5 lg:py-6 ${i % 2 === 1 ? "border-l border-sand pl-4" : ""} ${i >= 2 ? "border-t border-sand lg:border-t-0" : ""} ${i > 0 ? "lg:border-l lg:pl-6" : "lg:pl-0"}`}
            >
              <dt className="text-[13px] text-gray">{label}</dt>
              <dd className="mt-1 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-charcoal">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* ================================================================
          Below-fold content
      ================================================================ */}
      <div className="mt-14 flex flex-col gap-14 lg:mt-20 lg:gap-20">
        {/* 1. Funktioner — second photo + full highlight list */}
        <FeatureSection
          highlights={featureList}
          image={product.images[1] ?? product.images[0] ?? null}
          title={product.title}
          heading={isCover ? "Det kan coveret" : "Det får du"}
        />

        {/* 2. Beskrivelse + specifikationer side by side */}
        {(product.description || specEntries.length > 0) && (
          <section className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
            {product.description && (
              <div>
                <h2 className="mb-4 font-body text-xl font-semibold text-charcoal">Beskrivelse</h2>
                <p className="max-w-[62ch] whitespace-pre-line text-base leading-relaxed text-charcoal/75">
                  {product.description}
                </p>
              </div>
            )}
            {specEntries.length > 0 && (
              <div>
                <h2 className="mb-4 font-body text-xl font-semibold text-charcoal">Specifikationer</h2>
                <dl className="divide-y divide-sand border-y border-sand">
                  {specEntries.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3">
                      <dt className="text-sm text-gray">{label}</dt>
                      <dd className="text-sm font-medium text-charcoal">{value}</dd>
                    </div>
                  ))}
                  {compatibleDevices.length > 0 && compatibleDevices.length <= FIT_INLINE_MAX && (
                    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3">
                      <dt className="text-sm text-gray">Passer til</dt>
                      <dd className="text-sm font-medium text-charcoal">{compatibleDevices.map((d) => d.name).join(", ")}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </section>
        )}

        {/* 3. Kompatibel med — full list only when the chips above can't show them all */}
        {compatibleDevices.length > FIT_INLINE_MAX && <CompatibilitySection devices={compatibleDevices} />}

        {/* 4. Cross-sell */}
        {crossSellProducts.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-body text-xl font-bold text-charcoal">
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
      </div>

      {/* Sticky mobile CTA */}
      <StickyMobileCta
        product={product}
        effectivePrice={effectivePrice}
        selectedVariants={selectedVariants}
        variantImageOverride={variantImageOverride}
        ctaRef={ctaRef}
        canBuy={canBuy}
        stockLabel={stockLabel}
      />
    </div>
  );
}
