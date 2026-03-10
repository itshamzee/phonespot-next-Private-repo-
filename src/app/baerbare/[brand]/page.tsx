import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionProducts, getProduct } from "@/lib/shopify/client";

export const dynamic = "force-dynamic";
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
import { ConditionIllustrations } from "@/components/product/condition-illustrations";
import { Suspense } from "react";

function getTier(brand: string) {
  return LAPTOP_TIERS.find((t) => t.slug === brand);
}

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

  // Fallback: try as product handle
  let product: Product | null = null;
  try { product = await getProduct(brand); } catch { /* */ }
  if (!product) return { title: "Ikke fundet - PhoneSpot" };

  const title = product.seo.title ?? `${product.title} - Refurbished | PhoneSpot`;
  const description = product.seo.description ?? `Køb ${product.title} refurbished med 36 mdr. garanti hos PhoneSpot.`;
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

  // If not a tier slug, try rendering as a product page
  if (!tier) {
    let product: Product | null = null;
    try { product = await getProduct(brand); } catch { /* */ }
    if (!product) notFound();

    const config = getCollectionConfig("baerbare");
    let relatedProducts: Product[] = [];
    if (config) {
      try {
        const related = await getCollectionProducts(config.shopifyHandle);
        relatedProducts = (related?.products ?? []).filter((p) => p.handle !== brand).slice(0, 4);
      } catch { /* */ }
    }

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
            <ImageGalleryWithGrade images={product.images} title={product.title} deviceType="laptop" />
            <div className="flex flex-col gap-4">
              <Suspense fallback={null}>
                <ProductInfo product={product} collectionSlug="baerbare" />
              </Suspense>
            </div>
          </div>
        </section>
        <SectionWrapper background="default" id="hvad-betyder-standen">
          <Heading as="h2" size="md" className="mb-4 text-center">Hvad betyder standen?</Heading>
          <p className="mx-auto mb-8 max-w-2xl text-center font-body text-charcoal/70">
            Alle vores enheder er 100&nbsp;% funktionelle og gennemgår en grundig kvalitetstest med mindst 30 kontrolpunkter.
            Standen beskriver udelukkende det kosmetiske udseende.
          </p>
          <ConditionIllustrations deviceType="laptop" />
        </SectionWrapper>
        <SectionWrapper background="cream">
          <Heading as="h2" size="md" className="mb-8 text-center">Om dette produkt</Heading>
          <ProductDetails product={product} />
        </SectionWrapper>
        {relatedProducts.length > 0 && (
          <SectionWrapper background="sand">
            <Heading as="h2" size="md" className="mb-10 text-center">Andre kunder kiggede også på</Heading>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {relatedProducts.map((p) => (<ProductCard key={p.id} product={p} collectionHandle="baerbare" />))}
            </div>
          </SectionWrapper>
        )}
        <SectionWrapper background="sand"><TrustBar /></SectionWrapper>
      </>
    );
  }

  let collectionData: Awaited<ReturnType<typeof getCollectionProducts>> = null;
  try {
    collectionData = await getCollectionProducts("baerbare", sort);
  } catch {
    collectionData = null;
  }

  const allProducts = collectionData?.products ?? [];
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

      <SectionWrapper background="charcoal" className="text-center text-white">
        <Link
          href="/baerbare"
          className="mb-6 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/80"
        >
          &larr; Alle bærbare
        </Link>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
          {tier.title} bærbare
        </p>
        <Heading size="xl" className="text-white">
          {tier.title} bærbare
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          {tier.tagline}. Alle er testet med 30+ kontroller, rengjort og klar
          til brug med 36 måneders garanti.
        </p>
      </SectionWrapper>

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
