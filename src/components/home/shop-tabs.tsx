"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HomepageProduct = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  minPrice: number | null;
  compareAtPrice: number | null;
  deviceCount: number;
  brand: string;
  category: string;
  inStock: boolean;
  href: string;
  specifications: Record<string, string>;
  locations: { name: string; type: string; count: number }[];
};

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS = [
  { label: "Bærbare", key: "laptops", href: "/baerbare" },
  { label: "MacBooks", key: "macbooks", href: "/baerbare?brand=apple" },
  { label: "iPhones", key: "iphones", href: "/iphones" },
  { label: "iPads", key: "ipads", href: "/ipads" },
  { label: "Smartwatches", key: "smartwatches", href: "/smartwatches" },
  { label: "Tilbehør", key: "accessories", href: "/tilbehoer" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    iphone: "iPhone",
    smartphone: "Smartphone",
    laptop: "Laptop",
    macbook: "MacBook",
    ipad: "iPad",
    tablet: "Tablet",
    smartwatch: "Smartwatch",
    watch: "Watch",
    airpods: "AirPods",
    headphones: "Headphones",
    accessory: "Tilbehør",
  };
  return map[category.toLowerCase()] ?? category;
}

function buildSpecLine(
  category: string,
  specifications: Record<string, string>
): string {
  const cat = category.toLowerCase();
  if (cat !== "laptop" && cat !== "macbook") return "";

  const parts: string[] = [];

  if (specifications.processor) {
    const match = specifications.processor.match(
      /([iI][3579]-[\w]+|Ryzen\s*\d\s*\w+|M[1-4]\s*\w*)/
    );
    if (match) parts.push(match[1].trim());
  }
  if (specifications.ram) parts.push(specifications.ram.replace(/\s+/g, ""));
  if (specifications.storage)
    parts.push(specifications.storage.replace(/\s+/g, ""));
  if (specifications.screen_size) {
    const screen = specifications.screen_size
      .replace(/["\u201D\u2033]/g, "")
      .replace(/\.0$/, "");
    parts.push(screen + '"');
  }

  return parts.join(" \u00B7 ");
}

// ---------------------------------------------------------------------------
// Placeholder icon (same SVG set as product-grid-card)
// ---------------------------------------------------------------------------

function PlaceholderIcon({ category }: { category: string }) {
  const cat = category.toLowerCase();

  if (cat === "laptop" || cat === "macbook") {
    return (
      <svg
        viewBox="0 0 64 64"
        className="h-14 w-14 text-[#C7C7CC]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="10" y="10" width="44" height="30" rx="3" />
        <path d="M4 42h56l-3 5H7L4 42z" />
        <rect x="28" y="38" width="8" height="4" rx="1" />
      </svg>
    );
  }

  if (cat === "ipad" || cat === "tablet") {
    return (
      <svg
        viewBox="0 0 64 64"
        className="h-14 w-14 text-[#C7C7CC]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="14" y="6" width="36" height="52" rx="4" />
        <circle cx="32" cy="54" r="2" />
        <line x1="26" y1="11" x2="38" y2="11" />
      </svg>
    );
  }

  if (cat === "smartwatch" || cat === "watch") {
    return (
      <svg
        viewBox="0 0 64 64"
        className="h-14 w-14 text-[#C7C7CC]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M24 6h16v10H24z" />
        <rect x="16" y="16" width="32" height="32" rx="8" />
        <path d="M24 48h16v10H24z" />
        <rect x="48" y="24" width="4" height="10" rx="2" />
        <line x1="32" y1="32" x2="32" y2="24" />
        <line x1="32" y1="32" x2="38" y2="36" />
      </svg>
    );
  }

  if (cat === "airpods" || cat === "headphones" || cat === "accessory") {
    return (
      <svg
        viewBox="0 0 64 64"
        className="h-14 w-14 text-[#C7C7CC]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 32a20 20 0 0140 0" />
        <rect x="8" y="32" width="8" height="16" rx="4" />
        <rect x="48" y="32" width="8" height="16" rx="4" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      className="h-14 w-14 text-[#C7C7CC]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="16" y="6" width="32" height="52" rx="5" />
      <rect x="26" y="10" width="12" height="3" rx="1.5" />
      <line x1="26" y1="54" x2="38" y2="54" strokeWidth="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white">
      <div className="aspect-square animate-pulse bg-[#F7F7F8]" />
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-[#F0F0F0]" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-[#F0F0F0]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#F0F0F0]" />
        <div className="mt-2 h-6 w-1/2 animate-pulse rounded bg-[#F0F0F0]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact product card (homepage-specific)
// ---------------------------------------------------------------------------

function ProductCard({ product }: { product: HomepageProduct }) {
  const storeLocations = product.locations.filter((l) => l.type === "store");
  const specLine = buildSpecLine(product.category, product.specifications);

  const savePct =
    product.compareAtPrice &&
    product.compareAtPrice > (product.minPrice ?? 0) &&
    product.minPrice
      ? Math.round((1 - product.minPrice / product.compareAtPrice) * 100)
      : null;

  return (
    <Link
      href={product.href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white transition-all duration-200 hover:border-[#1A3D2E]/20 hover:shadow-lg"
    >
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-[#F7F7F8]">
        {/* Stock badge */}
        {product.deviceCount > 3 && (
          <div className="absolute left-2.5 top-2.5 z-10">
            <span className="inline-flex items-center rounded-full bg-[#1A3D2E] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              {product.deviceCount} på lager
            </span>
          </div>
        )}
        {product.deviceCount > 0 && product.deviceCount <= 3 && (
          <div className="absolute right-2.5 top-2.5 z-10">
            <span className="inline-flex items-center rounded-full bg-[#FFF8F0] px-2.5 py-1 text-[10px] font-bold text-[#B45309] shadow-sm">
              Kun {product.deviceCount} tilbage
            </span>
          </div>
        )}

        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-contain p-5 transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <PlaceholderIcon category={product.category} />
            <span className="text-[10px] font-medium text-[#AEAEB2]">
              Billede kommer snart
            </span>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* Brand · category */}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#86868B]">
          {product.brand} &middot; {categoryLabel(product.category)}
        </p>

        {/* Title */}
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[#111111] transition-colors group-hover:text-[#1A3D2E]">
          {product.title}
        </h3>

        {/* Spec line (laptops only) */}
        {specLine && (
          <p className="mt-1 truncate text-[10px] text-[#86868B]">{specLine}</p>
        )}

        {/* Pricing */}
        <div className="mt-auto pt-2.5">
          {product.minPrice != null ? (
            <>
              {/* Compare / savings */}
              {product.compareAtPrice != null &&
                product.compareAtPrice > product.minPrice && (
                  <p className="text-[10px] text-[#86868B] line-through">
                    {formatPrice(product.compareAtPrice)} kr.
                  </p>
                )}
              <p className="text-[10px] font-medium text-[#6E6E73]">fra</p>
              <p className="font-bold leading-tight text-[#1A3D2E] text-base sm:text-xl">
                {formatPrice(product.minPrice)} kr.
              </p>
              <p className="text-[10px] text-[#AEAEB2]">inkl. moms</p>

              {savePct !== null && (
                <p className="mt-0.5 text-[10px] font-bold text-[#1A3D2E]">
                  Spar op til {savePct}%
                </p>
              )}

              {/* Store location pills */}
              {storeLocations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {storeLocations.map((loc) => (
                    <span
                      key={loc.name}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1A3D2E] px-2 py-0.5 text-[10px] font-semibold text-white"
                    >
                      <svg
                        className="h-2.5 w-2.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                        />
                      </svg>
                      Hentes i {loc.name}
                    </span>
                  ))}
                </div>
              )}

              {product.deviceCount > 0 && storeLocations.length === 0 && (
                <p className="mt-1.5 text-[10px] font-medium text-[#86868B]">
                  Kan sendes
                </p>
              )}
            </>
          ) : (
            <p className="text-xs font-medium text-[#86868B]">Ikke på lager</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ShopTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("laptops");
  const [products, setProducts] = useState<HomepageProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  // Cache tab results to avoid re-fetching
  const cache = useRef<Partial<Record<TabKey, HomepageProduct[]>>>({});

  const fetchTab = useCallback(async (tab: TabKey) => {
    if (cache.current[tab]) {
      return cache.current[tab]!;
    }
    const res = await fetch(`/api/homepage-products?tab=${tab}&limit=8`);
    if (!res.ok) return [];
    const data: HomepageProduct[] = await res.json();
    cache.current[tab] = data;
    return data;
  }, []);

  // Load initial tab on mount
  useEffect(() => {
    fetchTab("laptops").then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, [fetchTab]);

  const handleTabClick = useCallback(
    async (tab: TabKey) => {
      if (tab === activeTab) return;

      // Fade out
      setVisible(false);

      // Small delay for the fade, then swap data
      await new Promise((r) => setTimeout(r, 150));

      setLoading(true);
      const data = await fetchTab(tab);
      setActiveTab(tab);
      setProducts(data);
      setLoading(false);

      // Fade in
      setVisible(true);
    },
    [activeTab, fetchTab]
  );

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-display text-3xl font-bold text-[#111111]">
          Shop vores udvalg
        </h2>
      </div>

      {/* Tab bar */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3D2E]/50",
                isActive
                  ? "bg-[#1A3D2E] text-white shadow-sm"
                  : "border border-[#E5E5EA] bg-transparent text-[#86868B] hover:border-[#1A3D2E]/30 hover:text-[#111111]",
              ].join(" ")}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Product grid */}
      <div
        className="grid grid-cols-2 gap-3 transition-opacity duration-150 md:grid-cols-4 md:gap-5"
        style={{ opacity: visible && !loading ? 1 : 0 }}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((p) => <ProductCard key={p.id ?? p.slug} product={p} />)}
      </div>

      {/* "See all" link */}
      {!loading && (
        <div className="mt-8 text-center">
          <Link
            href={activeTabConfig.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5EA] px-6 py-2.5 text-sm font-semibold text-[#1A3D2E] transition-all hover:border-[#1A3D2E]/40 hover:bg-[#1A3D2E]/[0.04]"
          >
            Se alle {activeTabConfig.label.toLowerCase()}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      )}
    </section>
  );
}
