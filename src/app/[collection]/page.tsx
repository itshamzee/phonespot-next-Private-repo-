import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollectionConfig, getAllCollectionSlugs } from "@/lib/collections";
import { getPublishedSkuProducts, getPublishedTemplates } from "@/lib/supabase/product-queries";
import { templateToProduct, skuProductToProduct } from "@/lib/supabase/product-adapter";

export const dynamic = "force-dynamic";
import { CategoryHero } from "@/components/collection/category-hero";
import { SortSelector } from "@/components/collection/sort-selector";
import { ProductGrid } from "@/components/collection/product-grid";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { TrustBar } from "@/components/ui/trust-bar";
import { JsonLd } from "@/components/seo/json-ld";

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
    title: `${config.title} - Køb brugte ${config.title} hos PhoneSpot`,
    description: `Udforsk vores udvalg af ${config.title.toLowerCase()}. Alle produkter er kvalitetstestede med 36 måneders garanti.`,
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

  // Map collection slugs to Supabase categories
  const SLUG_TO_CATEGORY: Record<string, string> = {
    iphones: "iphone",
    ipads: "ipad",
    smartphones: "smartphone",
    baerbare: "laptop",
    smartwatches: "smartwatch",
    covers: "accessory",
    tilbehor: "accessory",
    lyd: "accessory",
    opladere: "accessory",
    restsalg: "accessory",
    outlet: "accessory",
  };

  const category = SLUG_TO_CATEGORY[slug];
  let products: import("@/lib/shopify/types").Product[] = [];
  try {
    // Device categories: use product templates
    if (["iphone", "ipad", "smartphone", "laptop", "smartwatch"].includes(category ?? "")) {
      const templates = await getPublishedTemplates(category);
      products = templates.map(templateToProduct);
    } else {
      // Accessory categories: use SKU products
      const skuProducts = await getPublishedSkuProducts(category);
      products = skuProducts.map(skuProductToProduct);
    }
  } catch {
    products = [];
  }

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
        name: config.title,
        item: `https://phonespot.dk/${slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <CategoryHero
        title={config.title}
        description={config.description}
        badge={config.badge}
      />

      <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        {config.showConditionWalkthrough && (
          <div className="mb-8">
            <ConditionExplainer variant="compact" />
          </div>
        )}

        <TrustBar className="mb-8" />

        <div className="mb-6 flex items-center justify-end">
          <Suspense fallback={null}>
            <SortSelector />
          </Suspense>
        </div>

        <ProductGrid
          products={products}
          collectionHandle={slug}
        />
      </section>
    </>
  );
}
