import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedSkuProducts, getSkuProductBySlug, getPublishedTemplates } from "@/lib/supabase/product-queries";
import { skuProductToProduct, templateToProduct } from "@/lib/supabase/product-adapter";

export const revalidate = 60;
export const dynamicParams = true;

import type { Product } from "@/lib/shopify/types";
import {
  LAPTOP_TIERS,
  filterProductsByTier,
  filterRealLaptops,
} from "@/lib/laptop-tiers";
import { getCollectionConfig } from "@/lib/collections";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ProductCard } from "@/components/product/product-card";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";
import { ImageGalleryWithGrade } from "@/components/product/image-gallery-with-grade";
import { ProductInfo } from "@/components/product/product-info";
import { ProductDetails } from "@/components/product/product-details";
import { Suspense } from "react";

function getTier(brand: string) {
  return LAPTOP_TIERS.find((t) => t.slug === brand);
}

// Danish labels for sku_products.attributes keys, shown in the accessory
// spec table (mirrors the map in components/product/accessory-detail.tsx
// and [collection]/[product]/page.tsx).
const ACCESSORY_ATTRIBUTE_LABELS: Record<string, string> = {
  connector_type: "Stik-type",
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
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand } = await params;
  const tier = getTier(brand);
  if (tier) {
    const title = `${tier.title} Bærbare - Refurbished med 36 mdr. garanti | PhoneSpot`;
    const description = `Se vores ${tier.title.toLowerCase()} refurbished bærbare. ${tier.tagline}. Alle testet med 30+ kontroller og 36 måneders garanti.`;
    return {
      title,
      description,
      alternates: { canonical: `https://phonespot.dk/baerbare/${brand}` },
      openGraph: { title, description, url: `https://phonespot.dk/baerbare/${brand}` },
    };
  }

  // Fallback: try as product handle. This is a sku_product (accessory or
  // spare part sold under a /baerbare/[brand] slug), not a refurbished
  // device — it doesn't get the 36-month warranty claim. `??` only catches
  // null/undefined, but seo.title/seo.description come back as "" (empty
  // string) for most SKUs, which `??` passes straight through and Next.js
  // then silently omits the tag — same bug fixed in
  // [collection]/[product]/page.tsx, fixed here with `||`.
  const skuData = await getSkuProductBySlug(brand);
  if (!skuData) return { title: "Ikke fundet - PhoneSpot" };
  const product = skuProductToProduct(skuData);

  const title = product.seo.title || `${product.title} | PhoneSpot`;
  const description =
    product.seo.description ||
    (skuData.short_description?.trim()
      ? skuData.short_description.trim()
      : `Køb ${product.title} hos PhoneSpot. Hurtig levering og 2 års reklamationsret.`);
  return {
    title,
    description,
    alternates: { canonical: `https://phonespot.dk/baerbare/${brand}` },
    openGraph: { title, description, images: product.images[0] ? [{ url: product.images[0].url }] : undefined },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { brand } = await params;
  const { sort } = await searchParams;
  const tier = getTier(brand);

  // If not a tier slug, try rendering as a product page. This is a
  // sku_product (accessory or spare part sold under a /baerbare/[brand]
  // slug) — not a graded refurbished laptop. It has no grade column, no
  // battery, and is not covered by the 36-month device warranty, so it
  // must not get the device-only "Hvad betyder standen?" grade explainer
  // or the device spec table/warranty copy in ProductDetails. Same fix as
  // the SKU branch of [collection]/[product]/page.tsx — see
  // ProductDetails variant="accessory" and getAccessoryFaq for precedent.
  if (!tier) {
    const skuData = await getSkuProductBySlug(brand);
    if (!skuData) notFound();
    const product = skuProductToProduct(skuData);

    // The accessory's OWN specs, straight from sku_products.attributes —
    // never a device template's spec table matched by title keyword.
    const accessorySpecs = Object.entries(skuData.attributes ?? {})
      .filter(
        ([key, value]) =>
          !["_source", "source", "id"].includes(key) && value !== null && value !== undefined && value !== "",
      )
      .map(([key, value]) => ({
        label: ACCESSORY_ATTRIBUTE_LABELS[key] ?? key.replace(/_/g, " "),
        value: String(value),
      }));

    let relatedProducts: Product[] = [];
    try {
      const templates = await getPublishedTemplates("laptop");
      relatedProducts = templates.slice(0, 4).map((t) => templateToProduct(t));
    } catch { /* */ }

    return (
      <>
        <nav aria-label="Brødkrumme" className="mx-auto max-w-7xl px-4 pt-4 pb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray">
            <li><Link href="/" className="transition-colors hover:text-charcoal">Hjem</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/baerbare" className="transition-colors hover:text-charcoal">Bærbare</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-charcoal font-medium truncate max-w-[200px] md:max-w-none">{product.title}</li>
          </ol>
        </nav>
        <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <ImageGalleryWithGrade images={product.images} title={product.title} deviceType="laptop" variant="accessory" />
            <div className="flex flex-col gap-4">
              <Suspense fallback={null}>
                <ProductInfo product={product} collectionSlug="baerbare" variant="accessory" />
              </Suspense>
            </div>
          </div>
        </section>
        {/*
          NOTE: the device-only "Hvad betyder standen?" grade explainer
          (ConditionIllustrations) was removed here — sku_products have no
          grade column, so a cosmetic-condition explainer is false for an
          accessory. See ProductDetails variant="accessory" below for the
          accurate replacement.
        */}
        <SectionWrapper background="cream">
          <Heading as="h2" size="md" className="mb-8 text-center">Om dette produkt</Heading>
          <ProductDetails product={product} variant="accessory" accessorySpecs={accessorySpecs} />
        </SectionWrapper>
        {relatedProducts.length > 0 && (
          <SectionWrapper background="sand">
            <Heading as="h2" size="md" className="mb-10 text-center">Andre kunder kiggede også på</Heading>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {relatedProducts.map((p) => (<ProductCard key={p.id} product={p} collectionHandle="baerbare" />))}
            </div>
          </SectionWrapper>
        )}
        <SectionWrapper background="sand"><TrustBar variant="accessory" /></SectionWrapper>
      </>
    );
  }

  let allProducts: Product[] = [];
  try {
    const templates = await getPublishedTemplates("laptop");
    const skuProducts = await getPublishedSkuProducts("laptop");
    // Task 17: PhoneSpot's own stock before Foxway dropship stock. Sort is
    // stable, so the existing display_name query order is preserved as the
    // secondary key. templateToProduct() doesn't carry has_own_stock onto
    // Product, so this must happen before conversion — see
    // src/lib/supabase/product-queries.ts for the has_own_stock field.
    const ownStockFirstTemplates = [...templates].sort(
      (a, b) => (b.has_own_stock ? 1 : 0) - (a.has_own_stock ? 1 : 0)
    );
    allProducts = [
      ...ownStockFirstTemplates.map((t) => templateToProduct(t)),
      ...skuProducts.map(skuProductToProduct),
    ];
  } catch {
    allProducts = [];
  }
  const laptops = filterRealLaptops(allProducts);
  const products = filterProductsByTier(laptops, tier);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Refurbished Bærbare", item: "https://phonespot.dk/baerbare" },
            { "@type": "ListItem", position: 3, name: tier.title, item: `https://phonespot.dk/baerbare/${brand}` },
          ],
        }}
      />

      <section className="bg-[#F7F7F8] py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <Link
            href="/baerbare"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[#6E6E73] transition-colors hover:text-[#111111]"
          >
            &larr; Alle bærbare
          </Link>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
            {tier.title} bærbare
          </p>
          <Heading size="xl" className="!text-[#111111]">
            {tier.title} bærbare
          </Heading>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6E6E73]">
            {tier.tagline}. Alle er testet med 30+ kontroller, rengjort og klar
            til brug med 36 måneders garanti.
          </p>
        </div>
      </section>

      <SectionWrapper>
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, idx) => (
              <FadeIn key={product.id} delay={idx * 0.04}>
                <ProductCard
                  product={product}
                  collectionHandle="baerbare"
                />
              </FadeIn>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-lg text-gray">
              Ingen {tier.title.toLowerCase()} bærbare tilgængelige lige nu.
            </p>
            <Link
              href="/baerbare"
              className="mt-4 inline-block text-sm font-semibold text-green-eco hover:underline"
            >
              Se alle bærbare &rarr;
            </Link>
          </div>
        )}
      </SectionWrapper>

      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
