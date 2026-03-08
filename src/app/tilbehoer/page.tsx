import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCollectionProducts } from "@/lib/shopify/client";
import type { Product } from "@/lib/shopify/types";
import { ProductCard } from "@/components/product/product-card";
import { SortSelector } from "@/components/collection/sort-selector";
import { ProductGrid } from "@/components/collection/product-grid";
import { Heading } from "@/components/ui/heading";
import { FadeIn } from "@/components/ui/fade-in";
import { TrustBar } from "@/components/ui/trust-bar";
import { JsonLd } from "@/components/seo/json-ld";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
  description:
    "Covers, panserglas, opladere, kabler og tilbehør til din telefon og tablet. Altid hurtig levering og skarpe priser hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/tilbehoer" },
  openGraph: {
    title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
    description:
      "Covers, panserglas, opladere, kabler og tilbehør til din telefon og tablet. Altid hurtig levering og skarpe priser.",
    url: "https://phonespot.dk/tilbehoer",
  },
};

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    slug: "covers",
    shopifyHandle: "covers-1",
    title: "Covers & Cases",
    description: "Beskyt din enhed med stil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
      </svg>
    ),
    accentColor: "from-blue-500/10 to-indigo-500/10",
    borderColor: "group-hover:border-blue-400/40",
    iconColor: "text-blue-600",
  },
  {
    slug: "skaermbeskyttelse",
    shopifyHandle: "tilbehor",
    title: "Skærmbeskyttelse",
    description: "Panserglas og screen protectors",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    accentColor: "from-emerald-500/10 to-green-500/10",
    borderColor: "group-hover:border-emerald-400/40",
    iconColor: "text-emerald-600",
  },
  {
    slug: "opladere",
    shopifyHandle: "opladere",
    title: "Kabler & Opladere",
    description: "Lightning, USB-C og trådløs opladning",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    accentColor: "from-amber-500/10 to-orange-500/10",
    borderColor: "group-hover:border-amber-400/40",
    iconColor: "text-amber-600",
  },
  {
    slug: "lyd",
    shopifyHandle: "lyd",
    title: "Lyd & Høretelefoner",
    description: "Earbuds, headsets og højttalere",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
      </svg>
    ),
    accentColor: "from-violet-500/10 to-purple-500/10",
    borderColor: "group-hover:border-violet-400/40",
    iconColor: "text-violet-600",
  },
] as const;

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchCategoryProducts(
  shopifyHandle: string,
): Promise<Product[]> {
  try {
    const collection = await getCollectionProducts(shopifyHandle);
    return collection?.products ?? [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TilbehoerPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; sort?: string }>;
}) {
  const { kategori, sort } = await searchParams;

  // If a category is selected, show only that category's products
  const selectedCategory = CATEGORIES.find((c) => c.slug === kategori);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Forside",
        item: "https://phonespot.dk",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tilbehør",
        item: "https://phonespot.dk/tilbehoer",
      },
      ...(selectedCategory
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: selectedCategory.title,
              item: `https://phonespot.dk/tilbehoer?kategori=${selectedCategory.slug}`,
            },
          ]
        : []),
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden bg-cream py-16 md:py-24">
        {/* Subtle diagonal lines */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 30px, currentColor 30px, currentColor 31px)",
        }} />

        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <FadeIn>
            <span className="inline-block rounded-full bg-green-eco/10 px-4 py-1.5 text-sm font-semibold text-green-eco">
              Alt tilbehør til dine enheder
            </span>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Heading size="xl" className="mt-5">
              Tilbehør
            </Heading>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-charcoal/60">
              Covers, panserglas, opladere og meget mere — alt hvad du behøver
              for at beskytte og forbedre din enhed.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ---- Category cards ---- */}
      <section className="mx-auto max-w-7xl px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {CATEGORIES.map((cat, i) => {
            const isActive = kategori === cat.slug;
            return (
              <FadeIn key={cat.slug} delay={i * 0.05}>
                <Link
                  href={isActive ? "/tilbehoer" : `/tilbehoer?kategori=${cat.slug}`}
                  className={`group relative flex flex-col items-center rounded-2xl border bg-white p-5 text-center shadow-sm transition-all duration-300 hover:shadow-lg md:p-6 ${
                    isActive
                      ? "border-green-eco ring-2 ring-green-eco/20 shadow-md"
                      : `border-sand/80 ${cat.borderColor}`
                  }`}
                >
                  {/* Gradient bg on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cat.accentColor} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                  <div className={`relative ${cat.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                    {cat.icon}
                  </div>
                  <h3 className="relative mt-3 text-sm font-bold text-charcoal md:text-base">
                    {cat.title}
                  </h3>
                  <p className="relative mt-1 hidden text-xs text-charcoal/50 md:block">
                    {cat.description}
                  </p>

                  {isActive && (
                    <div className="absolute -top-1.5 -right-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-eco text-white">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                  )}
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ---- Products ---- */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        {selectedCategory ? (
          /* Single category view */
          <SingleCategoryView
            category={selectedCategory}
            sort={sort}
          />
        ) : (
          /* All categories overview */
          <AllCategoriesView />
        )}
      </section>

      {/* ---- Trust bar ---- */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <TrustBar />
      </section>

      {/* ---- Why PhoneSpot accessories ---- */}
      <section className="border-t border-sand bg-cream py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <FadeIn>
            <Heading as="h2" size="md" className="text-center">
              Hvorfor købe tilbehør hos PhoneSpot?
            </Heading>
          </FadeIn>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Altid skarpe priser",
                description:
                  "Vi holder priserne lave uden at gå på kompromis med kvaliteten. Sammenlign selv.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                ),
              },
              {
                title: "Hurtig levering",
                description:
                  "Bestil i dag og modtag i morgen. Eller hent i vores butik i VestsjællandsCentret, Slagelse.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                ),
              },
              {
                title: "Ekspertrådgivning",
                description:
                  "Usikker på hvad der passer til din enhed? Vores team hjælper dig med at finde det rigtige.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}>
                <div className="flex gap-4 rounded-2xl border border-sand/60 bg-white p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-eco/10 text-green-eco">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-charcoal">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-charcoal/60 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Single category view (filtered)
// ---------------------------------------------------------------------------

async function SingleCategoryView({
  category,
  sort,
}: {
  category: (typeof CATEGORIES)[number];
  sort?: string;
}) {
  const products = await fetchCategoryProducts(category.shopifyHandle);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/tilbehoer"
              className="flex items-center gap-1 text-sm font-medium text-charcoal/50 transition-colors hover:text-charcoal"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
              Alle kategorier
            </Link>
            <span className="text-charcoal/20">/</span>
            <span className="text-sm font-semibold text-charcoal">
              {category.title}
            </span>
          </div>
          <Heading as="h2" size="md" className="mt-2">
            {category.title}
          </Heading>
          <p className="mt-1 text-sm text-charcoal/50">
            {products.length} produkter
          </p>
        </div>
        <Suspense fallback={null}>
          <SortSelector />
        </Suspense>
      </div>

      <ProductGrid products={products} collectionHandle={category.slug} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// All categories overview
// ---------------------------------------------------------------------------

async function AllCategoriesView() {
  // Fetch all categories in parallel
  const results = await Promise.all(
    CATEGORIES.map(async (cat) => ({
      ...cat,
      products: await fetchCategoryProducts(cat.shopifyHandle),
    })),
  );

  return (
    <div className="space-y-16">
      {results.map((cat) => {
        if (cat.products.length === 0) return null;

        const previewProducts = cat.products.slice(0, 4);
        const hasMore = cat.products.length > 4;

        return (
          <div key={cat.slug}>
            <FadeIn>
              <div className="mb-6 flex items-end justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${cat.iconColor}`}>{cat.icon}</div>
                  <div>
                    <Heading as="h2" size="sm">
                      {cat.title}
                    </Heading>
                    <p className="mt-0.5 text-sm text-charcoal/50">
                      {cat.products.length} produkter
                    </p>
                  </div>
                </div>
                {hasMore && (
                  <Link
                    href={`/tilbehoer?kategori=${cat.slug}`}
                    className="flex items-center gap-1.5 rounded-full border border-sand bg-white px-4 py-2 text-sm font-semibold text-charcoal transition-all hover:border-green-eco hover:text-green-eco"
                  >
                    Se alle
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </Link>
                )}
              </div>
            </FadeIn>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {previewProducts.map((product, index) => (
                <FadeIn key={product.id} delay={index * 0.05}>
                  <ProductCard
                    product={product}
                    collectionHandle={cat.slug}
                  />
                </FadeIn>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
