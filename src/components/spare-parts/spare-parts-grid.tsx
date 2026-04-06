"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { QualityBadge } from "@/components/spare-parts/quality-badge";
import { useCart } from "@/components/cart/cart-context";
import { useB2B } from "@/components/b2b/b2b-context";
import { slugify } from "@/lib/spare-parts-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QualityTier {
  id: string;
  name: string;
  slug: string;
  badge_color: string;
  badge_text_color: string;
  description?: string;
}

interface SparePartProduct {
  id: string;
  title: string;
  slug: string | null;
  selling_price: number;
  sale_price: number | null;
  images: string[];
  always_in_stock: boolean;
  in_stock?: boolean;
  total_stock?: number;
  is_inquiry_only: boolean;
  device_brand: string | null;
  device_model: string | null;
  quality_tier?: QualityTier;
  part_category?: { id: string; name: string; slug: string } | null;
}

function buildProductUrl(product: SparePartProduct): string {
  const catSlug = product.part_category?.slug ?? "andet";
  const brandSlug = product.device_brand ? slugify(product.device_brand) : "alle";
  const modelSlug = product.device_model ? slugify(product.device_model) : "alle";
  const prodSlug = product.slug ?? product.id;
  return `/reservedele/${catSlug}/${brandSlug}/${modelSlug}/${prodSlug}`;
}

interface ApiResponse {
  products: SparePartProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type SortOption = "stock" | "price_asc" | "price_desc" | "newest";
type ViewMode = "grid" | "list";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-[#E5E5EA] bg-white p-4">
      <div className="mb-3 aspect-square w-full rounded-lg bg-[#F7F7F8]" />
      <div className="mb-2 h-3 w-16 rounded bg-[#F7F7F8]" />
      <div className="mb-1 h-4 w-full rounded bg-[#F7F7F8]" />
      <div className="mb-3 h-3 w-3/4 rounded bg-[#F7F7F8]" />
      <div className="mb-2 h-5 w-20 rounded bg-[#F7F7F8]" />
      <div className="h-9 w-full rounded-lg bg-[#F7F7F8]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product card — grid view
// ---------------------------------------------------------------------------

interface ProductCardProps {
  product: SparePartProduct;
  onAddToCart: (product: SparePartProduct) => void;
  addedId: string | null;
}

function ProductCard({ product, onAddToCart, addedId }: ProductCardProps) {
  const priceDisplay = (product.sale_price ?? product.selling_price);
  const isAdded = addedId === product.id;
  const { isLoggedIn, isApproved } = useB2B();
  const showPrices = isLoggedIn && isApproved;

  const productUrl = buildProductUrl(product);

  return (
    <Link href={productUrl} className="group flex flex-col rounded-xl border border-[#E5E5EA] bg-white transition-all hover:border-[#1A3D2E]/30 hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-[#F7F7F8]">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-4 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="h-12 w-12 text-[#E5E5EA]"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        )}
        {/* Quality badge overlay */}
        {product.quality_tier && (
          <div className="absolute left-2 top-2">
            <QualityBadge
              name={product.quality_tier.name}
              badgeColor={product.quality_tier.badge_color}
              badgeTextColor={product.quality_tier.badge_text_color}
              description={product.quality_tier.description}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-[#111111]">
          {product.title}
        </h3>

        {/* Device model */}
        {product.device_model && (
          <p className="mb-2 text-xs text-[#86868B]">
            {[product.device_brand, product.device_model].filter(Boolean).join(" ")}
          </p>
        )}

        {/* Price */}
        <div className="mt-auto">
          {showPrices ? (
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-base font-bold text-[#111111]">
                {(priceDisplay / 100).toLocaleString("da-DK")} kr
              </span>
              {product.sale_price !== null && (
                <span className="text-xs text-[#86868B] line-through">
                  {(product.selling_price / 100).toLocaleString("da-DK")} kr
                </span>
              )}
            </div>
          ) : (
            <div className="mb-1">
              <Link
                href="/b2b/login"
                className="text-sm font-semibold text-[#1A3D2E] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Log ind for priser
              </Link>
            </div>
          )}

          {/* Stock */}
          <div className="mb-3 flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${(product.in_stock ?? product.always_in_stock) ? "bg-green-500" : "bg-red-400"}`}
              aria-hidden="true"
            />
            <span className="text-xs text-[#86868B]">
              {(product.in_stock ?? product.always_in_stock) ? "På lager" : "Kan bestilles"}
            </span>
          </div>

          {/* CTA */}
          {showPrices ? (
            product.is_inquiry_only ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                className="w-full rounded-lg border border-[#1A3D2E] px-4 py-2 text-xs font-semibold text-[#1A3D2E] transition-colors hover:bg-[#1A3D2E] hover:text-white"
              >
                Forespørg
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAddToCart(product); }}
                className={`w-full rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  isAdded
                    ? "bg-green-600 text-white"
                    : "bg-[#1A3D2E] text-white hover:bg-[#1A3D2E]/90"
                }`}
              >
                {isAdded ? "Lagt i kurv" : "Læg i kurv"}
              </button>
            )
          ) : (
            <Link
              href="/b2b/registrer"
              className="block w-full rounded-lg border border-[#1A3D2E] px-4 py-2 text-center text-xs font-semibold text-[#1A3D2E] transition-colors hover:bg-[#1A3D2E] hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              Bliv forhandler
            </Link>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Product row — list view
// ---------------------------------------------------------------------------

function ProductRow({ product, onAddToCart, addedId }: ProductCardProps) {
  const priceDisplay = product.sale_price ?? product.selling_price;
  const isAdded = addedId === product.id;
  const { isLoggedIn, isApproved } = useB2B();
  const showPrices = isLoggedIn && isApproved;
  const productUrl = buildProductUrl(product);

  return (
    <Link href={productUrl} className="flex items-center gap-4 rounded-xl border border-[#E5E5EA] bg-white p-4 transition-all hover:border-[#1A3D2E]/30 hover:shadow-md">
      {/* Image */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F7F7F8]">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="64px"
            className="object-contain p-1"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="h-6 w-6 text-[#E5E5EA]"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-[#111111]">{product.title}</h3>
          {product.quality_tier && (
            <QualityBadge
              name={product.quality_tier.name}
              badgeColor={product.quality_tier.badge_color}
              badgeTextColor={product.quality_tier.badge_text_color}
              size="sm"
            />
          )}
        </div>
        {product.device_model && (
          <p className="mt-0.5 text-xs text-[#86868B]">
            {[product.device_brand, product.device_model].filter(Boolean).join(" ")}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${product.always_in_stock ? "bg-green-500" : "bg-red-400"}`}
            aria-hidden="true"
          />
          <span className="text-xs text-[#86868B]">
            {product.always_in_stock ? "På lager" : "Kan bestilles"}
          </span>
        </div>
      </div>

      {/* Price + CTA */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {showPrices ? (
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-[#111111]">
              {(priceDisplay / 100).toLocaleString("da-DK")} kr
            </span>
            {product.sale_price !== null && (
              <span className="text-xs text-[#86868B] line-through">
                {(product.selling_price / 100).toLocaleString("da-DK")} kr
              </span>
            )}
          </div>
        ) : (
          <Link
            href="/b2b/login"
            className="text-sm font-semibold text-[#1A3D2E] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Log ind for priser
          </Link>
        )}
        {showPrices ? (
          product.is_inquiry_only ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              className="rounded-lg border border-[#1A3D2E] px-4 py-1.5 text-xs font-semibold text-[#1A3D2E] transition-colors hover:bg-[#1A3D2E] hover:text-white"
            >
              Forespørg
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAddToCart(product); }}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                isAdded
                  ? "bg-green-600 text-white"
                  : "bg-[#1A3D2E] text-white hover:bg-[#1A3D2E]/90"
              }`}
            >
              {isAdded ? "Lagt i kurv" : "Læg i kurv"}
            </button>
          )
        ) : (
          <Link
            href="/b2b/registrer"
            className="rounded-lg border border-[#1A3D2E] px-4 py-1.5 text-xs font-semibold text-[#1A3D2E] transition-colors hover:bg-[#1A3D2E] hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            Bliv forhandler
          </Link>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="rounded-lg border border-[#E5E5EA] px-3 py-2 text-sm font-medium text-[#111111] transition-colors hover:border-[#1A3D2E] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Forrige side"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 py-2 text-sm text-[#86868B]"
            aria-hidden="true"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-[36px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              p === page
                ? "border-[#1A3D2E] bg-[#1A3D2E] text-white"
                : "border-[#E5E5EA] text-[#111111] hover:border-[#1A3D2E]"
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="rounded-lg border border-[#E5E5EA] px-3 py-2 text-sm font-medium text-[#111111] transition-colors hover:border-[#1A3D2E] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Næste side"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const SORT_LABELS: Record<SortOption, string> = {
  stock: "På lager først",
  price_asc: "Pris lav-høj",
  price_desc: "Pris høj-lav",
  newest: "Nyeste",
};

export function SparePartsGrid() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addSku, openCart } = useCart();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortOption>("stock");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [addedId, setAddedId] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch products
  // ---------------------------------------------------------------------------

  const fetchProducts = useCallback(async (params: URLSearchParams, sortOption: SortOption) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const url = new URL("/api/spare-parts", window.location.origin);
      for (const [k, v] of params.entries()) {
        // model and quality are multi-value, append each
        if (k === "model" || k === "quality") {
          url.searchParams.append(k, v);
        } else {
          url.searchParams.set(k, v);
        }
      }
      // Apply sort
      url.searchParams.set("sort", sortOption);

      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json() as ApiResponse;
      setData(json);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setData(null);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts(searchParams, sort);
  }, [searchParams, sort, fetchProducts]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePageChange = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(p));
      router.push(`${pathname}?${params.toString()}`, { scroll: true });
    },
    [router, pathname, searchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value.trim()) {
          params.set("search", value.trim());
        } else {
          params.delete("search");
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }, 400);
    },
    [router, pathname, searchParams],
  );

  const handleAddToCart = useCallback(
    (product: SparePartProduct) => {
      addSku({
        type: "sku_product",
        skuProductId: product.id,
        title: product.title,
        image: product.images[0] ?? null,
        price: product.sale_price ?? product.selling_price,
        quantity: 1,
      });
      setAddedId(product.id);
      setTimeout(() => setAddedId(null), 1800);
      openCart();
    },
    [addSku, openCart],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const currentPage = Number(searchParams.get("page") ?? "1");
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const products = data?.products ?? [];

  return (
    <div className="min-w-0 flex-1">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Result count */}
        <p className="mr-auto text-sm text-[#86868B]">
          {loading ? (
            <span className="inline-block h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
          ) : (
            <>
              <span className="font-semibold text-[#111111]">{total}</span> reservedele fundet
            </>
          )}
        </p>

        {/* Search in results */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#86868B]"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="search"
            placeholder="Søg i resultater..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-48 rounded-lg border border-[#E5E5EA] bg-white py-2 pl-9 pr-3 text-xs text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10 sm:w-56"
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-[#E5E5EA] bg-white py-2 pl-3 pr-8 text-xs font-medium text-[#111111] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
          aria-label="Sorter produkter"
        >
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-[#E5E5EA] bg-white">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-label="Gittervisning"
            aria-pressed={viewMode === "grid"}
            className={`rounded-l-lg p-2 transition-colors ${viewMode === "grid" ? "bg-[#1A3D2E] text-white" : "text-[#86868B] hover:text-[#111111]"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-label="Listevisning"
            aria-pressed={viewMode === "list"}
            className={`rounded-r-lg p-2 transition-colors ${viewMode === "list" ? "bg-[#1A3D2E] text-white" : "text-[#86868B] hover:text-[#111111]"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Products ─────────────────────────────────────────────────────── */}
      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-[#E5E5EA] bg-white"
              />
            ))}
          </div>
        )
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="mb-4 h-12 w-12 text-[#E5E5EA]"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <p className="text-base font-semibold text-[#111111]">Ingen resultater</p>
          <p className="mt-1 text-sm text-[#86868B]">
            Prøv at justere dine filtre eller søg efter noget andet.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} addedId={addedId} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} onAddToCart={handleAddToCart} addedId={addedId} />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="mt-10">
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}
