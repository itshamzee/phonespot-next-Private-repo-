import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAllCollectionProducts } from "@/lib/shopify/client";
import {
  getCategoryConfig,
  getCategoryDevices,
  getAllCategoryParams,
} from "@/lib/tilbehoer-config";
import {
  parseFilters,
  filterProducts,
  sortProducts,
  paginateProducts,
  extractBrands,
  type TilbehoerSearchParams,
} from "@/lib/tilbehoer-filters";
import { ProductGrid } from "@/components/collection/product-grid";
import { Heading } from "@/components/ui/heading";
import { FadeIn } from "@/components/ui/fade-in";
import { TrustBar } from "@/components/ui/trust-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/tilbehoer/breadcrumb";
import { DeviceChips } from "@/components/tilbehoer/device-chips";
import { FilterSidebar } from "@/components/tilbehoer/filter-sidebar";
import { FilterDrawer } from "@/components/tilbehoer/filter-drawer";
import { ActiveFilters } from "@/components/tilbehoer/active-filters";
import { TilbehoerSortSelector } from "@/components/tilbehoer/sort-selector";
import { Pagination } from "@/components/tilbehoer/pagination";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllCategoryParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) return { title: "Ikke fundet" };

  const title = `${config.label} til iPhone & Samsung | PhoneSpot`;
  const description = config.description;

  return {
    title,
    description,
    alternates: { canonical: `https://phonespot.dk/tilbehoer/${category}` },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/tilbehoer/${category}`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<TilbehoerSearchParams>;
}) {
  const { category } = await params;
  const rawParams = await searchParams;

  const config = getCategoryConfig(category);
  if (!config) notFound();

  const allProducts = await getAllCollectionProducts(config.shopifyHandle);
  const filters = parseFilters(rawParams);
  const availableBrands = extractBrands(allProducts);
  const filtered = filterProducts(allProducts, filters);
  const sorted = sortProducts(filtered, filters.sort);
  const { products, totalCount, totalPages } = paginateProducts(sorted, filters.page);
  const devices = getCategoryDevices(category);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
      { "@type": "ListItem", position: 3, name: config.label, item: `https://phonespot.dk/tilbehoer/${category}` },
    ],
  };

  const isOutlet = category === "outlet";

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      <section className="mx-auto max-w-7xl px-4 pt-8 pb-16">
        <Breadcrumb
          items={[
            { label: "Tilbehør", href: "/tilbehoer" },
            { label: config.label },
          ]}
        />

        <FadeIn>
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <Heading as="h1" size="lg">
                {isOutlet && (
                  <span className="mr-2 inline-block rounded-full bg-red-500 px-3 py-0.5 align-middle text-sm font-bold text-white">
                    SALE
                  </span>
                )}
                {config.label}
              </Heading>
            </div>
            <p className="mt-2 text-charcoal/60">{config.description}</p>
            <p className="mt-1 text-sm text-gray">{totalCount} produkter</p>
          </div>
        </FadeIn>

        <DeviceChips category={category} devices={devices} />

        <div className="mb-6 flex items-center justify-between gap-3">
          <Suspense fallback={null}>
            <FilterDrawer brands={availableBrands} totalCount={totalCount} />
          </Suspense>
          <Suspense fallback={null}>
            <TilbehoerSortSelector />
          </Suspense>
        </div>

        <Suspense fallback={null}>
          <ActiveFilters />
        </Suspense>

        <div className="flex gap-4 lg:gap-8">
          <Suspense fallback={null}>
            <FilterSidebar brands={availableBrands} />
          </Suspense>

          <div className="flex-1">
            {products.length > 0 ? (
              <>
                <ProductGrid products={products} collectionHandle={`tilbehoer/${category}`} />
                <Suspense fallback={null}>
                  <Pagination
                    currentPage={filters.page}
                    totalCount={totalCount}
                    totalPages={totalPages}
                  />
                </Suspense>
              </>
            ) : (
              <div className="py-16 text-center">
                <p className="text-lg font-medium text-charcoal/60">
                  Ingen produkter fundet
                </p>
                <p className="mt-2 text-sm text-gray">
                  Prøv at ændre dine filtre eller se alle produkter.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <TrustBar />
      </section>
    </>
  );
}
