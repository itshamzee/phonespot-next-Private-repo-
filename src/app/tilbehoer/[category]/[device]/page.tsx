import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAllCollectionProducts } from "@/lib/shopify/client";
import {
  getCategoryConfig,
  getDeviceConfig,
  getRouteConfig,
  getCategoryDevices,
  getAllDeviceParams,
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

export function generateStaticParams() {
  return getAllDeviceParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; device: string }>;
}): Promise<Metadata> {
  const { category, device } = await params;
  const catConfig = getCategoryConfig(category);
  const devConfig = getDeviceConfig(device);

  if (!catConfig || !devConfig) return { title: "Ikke fundet" };

  const title = `${devConfig.label} ${catConfig.label} | PhoneSpot`;
  const description = `${catConfig.label} til ${devConfig.label}. Beskyt din enhed med kvalitetstilbehør fra PhoneSpot.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://phonespot.dk/tilbehoer/${category}/${device}`,
    },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/tilbehoer/${category}/${device}`,
    },
  };
}

export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; device: string }>;
  searchParams: Promise<TilbehoerSearchParams>;
}) {
  const { category, device } = await params;
  const rawParams = await searchParams;

  const catConfig = getCategoryConfig(category);
  const devConfig = getDeviceConfig(device);
  const routeConfig = getRouteConfig(category, device);

  if (!catConfig || !devConfig || !routeConfig) notFound();

  // Fetch products from device-specific collection
  // Fallback: if collection doesn't exist, fetch parent and filter by title
  let allProducts = await getAllCollectionProducts(routeConfig.shopifyHandle);

  if (allProducts.length === 0) {
    const parentProducts = await getAllCollectionProducts(catConfig.shopifyHandle);
    const deviceTerms = devConfig.label.toLowerCase().split(" ");
    allProducts = parentProducts.filter((p) => {
      const title = p.title.toLowerCase();
      return deviceTerms.every((term) => title.includes(term));
    });
  }

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
      { "@type": "ListItem", position: 3, name: catConfig.label, item: `https://phonespot.dk/tilbehoer/${category}` },
      { "@type": "ListItem", position: 4, name: devConfig.label, item: `https://phonespot.dk/tilbehoer/${category}/${device}` },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      <section className="mx-auto max-w-7xl px-4 pt-8 pb-16">
        <Breadcrumb
          items={[
            { label: "Tilbehør", href: "/tilbehoer" },
            { label: catConfig.label, href: `/tilbehoer/${category}` },
            { label: devConfig.label },
          ]}
        />

        <FadeIn>
          <div className="mb-6">
            <Heading as="h1" size="lg">
              {devConfig.label} {catConfig.label}
            </Heading>
            <p className="mt-2 text-charcoal/60">
              {catConfig.label} til {devConfig.label}. Hurtig levering og skarpe priser.
            </p>
            <p className="mt-1 text-sm text-gray">{totalCount} produkter</p>
          </div>
        </FadeIn>

        <DeviceChips
          category={category}
          devices={devices}
          activeDevice={device}
        />

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

        <div className="flex gap-8">
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
                  Ingen produkter fundet til {devConfig.label}
                </p>
                <p className="mt-2 text-sm text-gray">
                  Prøv at ændre dine filtre eller se alle {catConfig.label.toLowerCase()}.
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
