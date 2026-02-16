import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollectionConfig, getAllCollectionSlugs } from "@/lib/collections";
import { getCollectionProducts } from "@/lib/shopify/client";
import { SortSelector } from "@/components/collection/sort-selector";
import { ProductGrid } from "@/components/collection/product-grid";

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return getAllCollectionSlugs().map((slug) => ({ collection: slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const config = getCollectionConfig(collection);

  if (!config) {
    return { title: "Ikke fundet - PhoneSpot" };
  }

  return {
    title: `${config.title} - Kob brugte ${config.title} hos PhoneSpot`,
    description: `Udforsk vores udvalg af ${config.title.toLowerCase()}. Alle produkter er kvalitetstestede med 12 maneders garanti.`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { collection: slug } = await params;
  const { sort } = await searchParams;

  const config = getCollectionConfig(slug);
  if (!config) {
    notFound();
  }

  let collectionData: Awaited<ReturnType<typeof getCollectionProducts>> = null;
  try {
    collectionData = await getCollectionProducts(config.shopifyHandle, sort);
  } catch {
    // Shopify API not configured or unreachable
    collectionData = null;
  }

  const products = collectionData?.products ?? [];
  const description = collectionData?.description ?? "";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold italic text-charcoal">
          {config.title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl font-body text-gray">{description}</p>
        )}
      </div>

      {/* Sort + Grid */}
      <div className="mb-6 flex items-center justify-end">
        <Suspense fallback={null}>
          <SortSelector />
        </Suspense>
      </div>

      <ProductGrid
        products={products}
        collectionHandle={config.shopifyHandle}
      />
    </section>
  );
}
