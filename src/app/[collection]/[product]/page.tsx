import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCollectionConfig } from "@/lib/collections";
import { getSkuProductBySlug, getPublishedSkuProducts } from "@/lib/supabase/product-queries";
import { skuProductToProduct } from "@/lib/supabase/product-adapter";

export const dynamic = "force-dynamic";
import type { Product } from "@/lib/shopify/types";
import { ImageGalleryWithGrade } from "@/components/product/image-gallery-with-grade";
import { ProductInfo } from "@/components/product/product-info";
import { ProductDetails } from "@/components/product/product-details";
import { UpsellWrapper } from "@/components/product/upsell-wrapper";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ProductCard } from "@/components/product/product-card";
import { TrustpilotStars } from "@/components/trustpilot/trustpilot-stars";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { ConditionIllustrations } from "@/components/product/condition-illustrations";
import { JsonLd } from "@/components/seo/json-ld";
import { Suspense } from "react";

// Allow any product handle to be rendered on-demand (not just pre-built ones)
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build Product JSON-LD for SEO / PriceRunner. */
function getProductJsonLd(product: Product, url: string): Record<string, unknown> {
  const price = product.priceRange.minVariantPrice;
  const condition = "https://schema.org/RefurbishedCondition";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((img) => img.url),
    brand: {
      "@type": "Brand",
      name: product.vendor || "PhoneSpot",
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: parseFloat(product.priceRange.minVariantPrice.amount),
      highPrice: parseFloat(product.priceRange.maxVariantPrice.amount),
      priceCurrency: price.currencyCode,
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: condition,
      seller: {
        "@type": "Organization",
        name: "PhoneSpot",
      },
      url,
    },
    ...(product.tags.find((t) => t.startsWith("ean:"))
      ? { gtin13: product.tags.find((t) => t.startsWith("ean:"))!.slice(4) }
      : {}),
    ...(product.tags.find((t) => t.startsWith("mpn:"))
      ? { mpn: product.tags.find((t) => t.startsWith("mpn:"))!.slice(4) }
      : {}),
  };
}


// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}): Promise<Metadata> {
  const { collection: collectionSlug, product: productHandle } = await params;

  const config = getCollectionConfig(collectionSlug);

  const skuProduct = await getSkuProductBySlug(productHandle);
  if (!skuProduct) {
    return { title: "Produkt ikke fundet - PhoneSpot" };
  }
  const productData = skuProductToProduct(skuProduct);

  const title =
    productData.seo.title ?? `${productData.title} - Refurbished | PhoneSpot`;
  const description =
    productData.seo.description ??
    `Køb ${productData.title} refurbished med 36 mdr. garanti hos PhoneSpot. ${productData.description.slice(0, 120)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: productData.images[0]
        ? [{ url: productData.images[0].url }]
        : undefined,
      siteName: "PhoneSpot",
      locale: "da_DK",
      type: "website",
    },
    alternates: {
      canonical: `https://phonespot.dk/${collectionSlug}/${productHandle}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductPage({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}) {
  const { collection: collectionSlug, product: productHandle } = await params;

  // Look up collection config (may be null for spare-parts etc.)
  const config = getCollectionConfig(collectionSlug);

  // Fetch product from Supabase
  const skuProduct = await getSkuProductBySlug(productHandle);
  if (!skuProduct) notFound();
  const product = skuProductToProduct(skuProduct);

  // Fetch related products from same category
  const accessories: Product[] = [];
  let relatedProducts: Product[] = [];
  try {
    const related = await getPublishedSkuProducts(skuProduct.category ?? undefined);
    relatedProducts = related
      .filter((p) => p.slug !== productHandle)
      .slice(0, 4)
      .map(skuProductToProduct);
  } catch {
    relatedProducts = [];
  }

  return (
    <>
      {/* Product JSON-LD for SEO / PriceRunner */}
      <JsonLd data={getProductJsonLd(product, `https://phonespot.dk/${collectionSlug}/${productHandle}`)} />

      {/* ----------------------------------------------------------------- */}
      {/* 1. Breadcrumbs                                                     */}
      {/* ----------------------------------------------------------------- */}
      <nav
        aria-label="Brødkrumme"
        className="mx-auto max-w-7xl px-4 pt-2 pb-1 md:pt-4 md:pb-2"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray">
          <li>
            <Link href="/" className="transition-colors hover:text-charcoal">
              Hjem
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/${collectionSlug}`}
              className="transition-colors hover:text-charcoal"
            >
              {config?.title ?? collectionSlug}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-charcoal font-medium truncate max-w-[200px] md:max-w-none">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Product hero (two-column)                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-4 md:py-12">
        <div className="grid gap-4 md:grid-cols-2 md:gap-12">
          {/* Left: Image gallery — syncs with grade picker via URL params */}
          <ImageGalleryWithGrade
            images={product.images}
            title={product.title}
            deviceType={
              collectionSlug.includes("watch") || collectionSlug.includes("smartwatch") ? "watch" :
              collectionSlug.includes("ipad") ? "ipad" :
              collectionSlug.includes("baerbar") || collectionSlug.includes("laptop") ? "laptop" : "phone"
            }
          />

          {/* Right: Product info */}
          <div className="flex flex-col gap-4">
            <Suspense fallback={null}>
              <TrustpilotStars />
            </Suspense>
            <ProductInfo product={product} collectionSlug={collectionSlug} />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Hvad betyder standen? (linked from grade picker)                */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="default" id="hvad-betyder-standen">
        <Heading as="h2" size="md" className="mb-4 text-center">
          Hvad betyder standen?
        </Heading>
        <p className="mx-auto mb-8 max-w-2xl text-center font-body text-charcoal/70">
          Alle vores enheder er 100&nbsp;% funktionelle og gennemgår en
          grundig kvalitetstest med mindst 30 kontrolpunkter. Standen
          beskriver udelukkende det kosmetiske udseende.
        </p>

        <ConditionIllustrations
          deviceType={
            collectionSlug.includes("watch") || collectionSlug.includes("smartwatch") ? "watch" :
            collectionSlug.includes("ipad") ? "ipad" :
            collectionSlug.includes("baerbar") || collectionSlug.includes("laptop") ? "laptop" : "phone"
          }
        />

        <div className="mt-8 text-center">
          <Link
            href="/kvalitet"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-eco transition-colors hover:text-charcoal"
          >
            Læs mere om vores kvalitetsgaranti
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </SectionWrapper>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Om dette produkt — intro, highlights & specs                    */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="cream">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Om dette produkt
        </Heading>
        <ProductDetails product={product} />
      </SectionWrapper>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Inkluderet i boksen                                             */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="sand">
        <Heading as="h2" size="md" className="mb-10 text-center">
          Inkluderet i boksen
        </Heading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {/* Enhed */}
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mb-3 h-10 w-10 text-green-eco"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">Enhed</span>
            <span className="mt-1 text-xs text-gray">
              Testet &amp; kvalitetssikret
            </span>
          </div>

          {/* USB-C ladekabel */}
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mb-3 h-10 w-10 text-green-eco"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 19.5h13.5"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">
              USB-C ladekabel
            </span>
            <span className="mt-1 text-xs text-gray">Kompatibelt kabel</span>
          </div>

          {/* Oplader */}
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mb-3 h-10 w-10 text-green-eco"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">
              Oplader
            </span>
            <span className="mt-1 text-xs text-gray">Hurtig opladning</span>
          </div>

          {/* Hurtigstart-guide */}
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mb-3 h-10 w-10 text-green-eco"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">
              Hurtigstart-guide
            </span>
            <span className="mt-1 text-xs text-gray">Kom nemt i gang</span>
          </div>
        </div>
      </SectionWrapper>

      {/* ----------------------------------------------------------------- */}
      {/* 6b. Trustpilot Reviews                                              */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper>
        <Heading as="h2" size="lg">
          Trustpilot Anmeldelser
        </Heading>
        <div className="mt-8">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-sand" />}>
            <TrustpilotReviews />
          </Suspense>
        </div>
      </SectionWrapper>

      {/* ----------------------------------------------------------------- */}
      {/* 7. Accessory upsell                                                */}
      {/* ----------------------------------------------------------------- */}
      {accessories.length > 0 && (
        <SectionWrapper background="default">
          <Heading as="h2" size="md" className="mb-8 text-center">
            Beskyt din enhed
          </Heading>
          <UpsellWrapper accessories={accessories} />
        </SectionWrapper>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 8. Relaterede produkter                                            */}
      {/* ----------------------------------------------------------------- */}
      {relatedProducts.length > 0 && (
        <SectionWrapper background="sand">
          <Heading as="h2" size="md" className="mb-10 text-center">
            Andre kunder kiggede også på
          </Heading>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                collectionHandle={collectionSlug}
              />
            ))}
          </div>
        </SectionWrapper>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 9. Produktspecifik FAQ                                              */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="default">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Spørgsmål om dette produkt
        </Heading>
        <div className="mx-auto max-w-2xl divide-y divide-sand rounded-2xl border border-sand bg-white shadow-sm">
          {/* Q1 */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
              <span>Hvad er standen på denne enhed?</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">
              Vi vurderer alle enheder efter et A/B/C-system. Stand A er
              næsten som ny uden synlige ridser. Stand B har lette
              brugsspor, men skærmen er perfekt. Stand C kan have tydelige
              kosmetiske mærker, men er fuldt funktionel. Alle enheder
              gennemgår minimum 30 kontrolpunkter uanset stand.
            </div>
          </details>

          {/* Q2 */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
              <span>Hvad gør jeg hvis enheden har en fejl?</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">
              Alle vores produkter leveres med 36 måneders garanti. Hvis du
              oplever en fejl, kontakt vores kundeservice, og vi finder en
              løsning hurtigst muligt — enten reparation, ombytning eller
              refundering. Du er altid dækket.
            </div>
          </details>

          {/* Q3 */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
              <span>Hvor hurtigt leverer I?</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">
              Vi sender din ordre inden for 1-2 hverdage. Du modtager en
              sporings-mail så snart pakken er afsendt, så du altid ved
              hvor den er. Vi leverer med GLS eller PostNord direkte til
              din dør eller nærmeste pakkeshop.
            </div>
          </details>

          {/* Q4 */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
              <span>Kan jeg returnere enheden?</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">
              Ja, du har altid 14 dages fuld returret fra den dag du
              modtager din ordre. Enheden skal returneres i samme stand som
              du modtog den. Kontakt os, og vi sender dig en returetiket.
              Pengene refunderes inden for 3-5 hverdage efter vi har
              modtaget enheden.
            </div>
          </details>
        </div>
      </SectionWrapper>

      {/* ----------------------------------------------------------------- */}
      {/* 10. Trust bar                                                      */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
