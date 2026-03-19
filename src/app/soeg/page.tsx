import type { Metadata } from "next";
import Link from "next/link";
import { searchProducts } from "@/lib/supabase/product-queries";
import { templateToProduct, skuProductToProduct } from "@/lib/supabase/product-adapter";
import { ProductGrid } from "@/components/collection/product-grid";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return {
      title: "S\u00f8g - PhoneSpot",
      description: "S\u00f8g efter brugte iPhones, iPads og tilbeh\u00f8r hos PhoneSpot.",
    };
  }

  return {
    title: `S\u00f8g efter ${query} - PhoneSpot`,
    description: `S\u00f8geresultater for "${query}" hos PhoneSpot.`,
  };
}

const POPULAR_SEARCHES = [
  { label: "iPhone 13 Pro", href: "/iphones" },
  { label: "iPhone 14", href: "/iphones" },
  { label: "iPad Air", href: "/ipads" },
  { label: "MacBook", href: "/baerbare" },
  { label: "Sk\u00e6rmskift", href: "/reparation" },
  { label: "Panserglas", href: "/tilbehoer" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let products: import("@/lib/shopify/types").Product[] = [];
  try {
    if (query) {
      const { templates, skuProducts } = await searchProducts(query);
      products = [
        ...templates.map(templateToProduct),
        ...skuProducts.map(skuProductToProduct),
      ];
    }
  } catch {
    products = [];
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      {/* Search form */}
      <div className="mx-auto mb-10 max-w-2xl">
        <form action="/soeg" method="get">
          <label htmlFor="search-input" className="sr-only">
            S&oslash;g
          </label>
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6E6E73]"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              id="search-input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="S&oslash;g efter produkter, reparationer..."
              autoFocus
              className="w-full rounded-2xl border-2 border-[#E5E5EA] bg-white py-4 pl-14 pr-6 text-lg text-[#111111] placeholder:text-[#6E6E73]/50 transition-colors focus:border-[#1A3D2E] focus:outline-none"
            />
          </div>
        </form>
      </div>

      {/* Results */}
      {query ? (
        <>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
                S&oslash;geresultater
              </h1>
              <p className="mt-1 text-[#6E6E73]">
                {products.length} {products.length === 1 ? "resultat" : "resultater"} for &ldquo;{query}&rdquo;
              </p>
            </div>
          </div>
          {products.length > 0 ? (
            <ProductGrid products={products} collectionHandle="soeg" />
          ) : (
            <div className="rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-[#6E6E73]">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[#111111]">
                Ingen resultater for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-2 text-[#6E6E73]">
                Pr&oslash;v at s&oslash;ge efter noget andet, eller udforsk vores kategorier.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Link href="/iphones" className="rounded-full bg-[#1A3D2E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D6B45]">
                  iPhones
                </Link>
                <Link href="/ipads" className="rounded-full border border-[#E5E5EA] px-5 py-2 text-sm font-semibold text-[#111111] hover:border-[#111111]">
                  iPads
                </Link>
                <Link href="/baerbare" className="rounded-full border border-[#E5E5EA] px-5 py-2 text-sm font-semibold text-[#111111] hover:border-[#111111]">
                  B&aelig;rbare
                </Link>
                <Link href="/reparation" className="rounded-full border border-[#E5E5EA] px-5 py-2 text-sm font-semibold text-[#111111] hover:border-[#111111]">
                  Reparation
                </Link>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-8 text-center">
          <h1 className="mb-2 font-display text-3xl font-bold text-[#111111] md:text-4xl">
            Hvad leder du efter?
          </h1>
          <p className="text-lg text-[#6E6E73]">
            S&oslash;g efter produkter, kategorier eller reparationer.
          </p>

          {/* Popular searches */}
          <div className="mx-auto mt-8 max-w-md">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6E6E73]">
              Popul&aelig;re s&oslash;gninger
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {POPULAR_SEARCHES.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="rounded-full border border-[#E5E5EA] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition-all hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick categories */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "iPhones", href: "/iphones", count: "25+ modeller" },
              { name: "iPads", href: "/ipads", count: "5+ modeller" },
              { name: "B\u00e6rbare", href: "/baerbare", count: "9+ modeller" },
              { name: "Reparation", href: "/reparation", count: "Alle m\u00e6rker" },
            ].map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-4 text-center transition-all hover:border-[#1A3D2E]/30 hover:shadow-sm"
              >
                <p className="font-display text-base font-bold text-[#111111]">{cat.name}</p>
                <p className="mt-0.5 text-xs text-[#6E6E73]">{cat.count}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
