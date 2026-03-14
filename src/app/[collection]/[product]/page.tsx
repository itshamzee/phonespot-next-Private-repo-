import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCollectionConfig } from "@/lib/collections";
import {
  getSkuProductBySlug,
  getPublishedSkuProducts,
  getTemplateBySlug,
  getAvailableDevices,
  getPublishedTemplates,
} from "@/lib/supabase/product-queries";
import { skuProductToProduct } from "@/lib/supabase/product-adapter";

export const dynamic = "force-dynamic";
import type { Product } from "@/lib/shopify/types";
import { DeviceDetail } from "@/components/product/device-detail";
import { ImageGalleryWithGrade } from "@/components/product/image-gallery-with-grade";
import { ProductInfo } from "@/components/product/product-info";
import { ProductDetails } from "@/components/product/product-details";
import { UpsellWrapper } from "@/components/product/upsell-wrapper";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ProductCard } from "@/components/product/product-card";
import { ProductGridCard } from "@/components/product/product-grid-card";
import { TrustpilotStars } from "@/components/trustpilot/trustpilot-stars";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { ConditionIllustrations } from "@/components/product/condition-illustrations";
import { JsonLd } from "@/components/seo/json-ld";

// Allow any product handle to be rendered on-demand (not just pre-built ones)
export const dynamicParams = true;

/* ------------------------------------------------------------------ */
/*  Device type helper                                                 */
/* ------------------------------------------------------------------ */

type DeviceType = "phone" | "watch" | "ipad" | "laptop";

function getDeviceType(category: string): DeviceType {
  if (category === "smartwatch") return "watch";
  if (category === "ipad") return "ipad";
  if (category === "laptop") return "laptop";
  return "phone";
}

function getDeviceTypeFromSlug(slug: string): DeviceType {
  if (slug.includes("watch") || slug.includes("smartwatch")) return "watch";
  if (slug.includes("ipad")) return "ipad";
  if (slug.includes("baerbar") || slug.includes("laptop")) return "laptop";
  return "phone";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

  // Try product template first (devices: phones, watches, iPads, laptops)
  const template = await getTemplateBySlug(productHandle);
  if (template) {
    const title = template.meta_title ?? `${template.display_name} - Refurbished | PhoneSpot`;
    const description =
      template.meta_description ??
      `Køb refurbished ${template.display_name} med 36 måneders garanti. Testet med 30+ kontroller og klar til brug fra dag et.`;

    return {
      title,
      description,
      alternates: { canonical: `https://phonespot.dk/${collectionSlug}/${productHandle}` },
      openGraph: {
        title,
        description,
        url: `https://phonespot.dk/${collectionSlug}/${productHandle}`,
        images: template.images[0] ? [{ url: template.images[0] }] : [],
      },
    };
  }

  // Fall back to SKU product
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

  // ---------------------------------------------------------------------------
  // Try product template first (devices: phones, watches, iPads, laptops)
  // ---------------------------------------------------------------------------
  const template = await getTemplateBySlug(productHandle);

  if (template) {
    const [availableDevices, accessories, relatedTemplates] = await Promise.all([
      getAvailableDevices(template.id),
      getPublishedSkuProducts(undefined, template.id),
      getPublishedTemplates(template.category),
    ]);

    const related = relatedTemplates.filter((t) => t.id !== template.id).slice(0, 5);

    const categoryLabel =
      template.category === "iphone" ? "iPhones"
      : template.category === "ipad" ? "iPads"
      : template.category === "laptop" ? "Bærbare"
      : template.category === "smartwatch" ? "Smartwatches"
      : "Smartphones";

    const deviceType = getDeviceType(template.category);

    const minPrice = availableDevices.length > 0
      ? Math.min(...availableDevices.map((d) => d.selling_price ?? 0).filter(Boolean))
      : template.base_price_a;

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
        {
          "@type": "ListItem",
          position: 2,
          name: categoryLabel,
          item: `https://phonespot.dk/${collectionSlug}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: template.display_name,
          item: `https://phonespot.dk/${collectionSlug}/${productHandle}`,
        },
      ],
    };

    const productJsonLd = minPrice
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: template.display_name,
          description: template.description ?? undefined,
          image: template.images,
          brand: { "@type": "Brand", name: template.brand },
          offers: {
            "@type": "Offer",
            priceCurrency: "DKK",
            price: (minPrice / 100).toFixed(0),
            availability: availableDevices.length > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: "PhoneSpot" },
          },
        }
      : null;

    return (
      <>
        <JsonLd data={breadcrumbJsonLd} />
        {productJsonLd && <JsonLd data={productJsonLd} />}

        {/* ── Breadcrumb ── */}
        <nav className="mx-auto max-w-7xl px-4 pt-4 pb-2" aria-label="Brødkrumme">
          <ol className="flex items-center gap-1.5 text-sm text-gray">
            <li><Link href="/" className="hover:text-charcoal">Forside</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href={`/${collectionSlug}`} className="hover:text-charcoal">{categoryLabel}</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-charcoal font-medium truncate max-w-[200px] md:max-w-none">{template.display_name}</li>
          </ol>
        </nav>

        {/* ── 1. Product hero (DeviceDetail component) ── */}
        <section className="mx-auto max-w-7xl px-4 py-6 md:py-10">
          <DeviceDetail
            template={template}
            devices={availableDevices}
            accessories={accessories}
          />
        </section>

        {/* ── 2. Hvad betyder standen? ── */}
        <SectionWrapper background="sand" id="hvad-betyder-standen">
          <Heading as="h2" size="md" className="mb-4 text-center">
            Hvad betyder standen?
          </Heading>
          <p className="mx-auto mb-8 max-w-2xl text-center text-charcoal/70">
            Alle vores enheder er 100&nbsp;% funktionelle og gennemgår en grundig
            kvalitetstest med mindst 30 kontrolpunkter. Standen beskriver
            udelukkende det kosmetiske udseende.
          </p>
          <ConditionExplainer variant="full" deviceType={deviceType} />
          <div className="mt-6 text-center">
            <Link
              href="/kvalitet"
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-eco hover:underline"
            >
              Læs mere om vores kvalitetsgaranti
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </SectionWrapper>

        {/* ── 3. Inkluderet i boksen ── */}
        <SectionWrapper background="cream">
          <Heading as="h2" size="md" className="mb-10 text-center">
            Inkluderet i boksen
          </Heading>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-3 h-10 w-10 text-green-eco">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                ),
                label: "Enhed",
                sub: "Testet & kvalitetssikret",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-3 h-10 w-10 text-green-eco">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 19.5h13.5" />
                  </svg>
                ),
                label: "USB-C ladekabel",
                sub: "Kompatibelt kabel",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-3 h-10 w-10 text-green-eco">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                  </svg>
                ),
                label: "SIM-nål",
                sub: "Til SIM-kort åbning",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-3 h-10 w-10 text-green-eco">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                ),
                label: "36 mdr. garantibevis",
                sub: "Med QR-kode",
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
                {item.icon}
                <span className="text-sm font-semibold text-charcoal">{item.label}</span>
                <span className="mt-1 text-xs text-gray">{item.sub}</span>
              </div>
            ))}
          </div>
        </SectionWrapper>

        {/* ── 4. Trustpilot anmeldelser ── */}
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

        {/* ── 5. Relaterede produkter ── */}
        {related.length > 0 && (
          <SectionWrapper background="sand">
            <Heading as="h2" size="md" className="mb-10 text-center">
              Andre kunder kiggede også på
            </Heading>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {related.map((t) => (
                <ProductGridCard
                  key={t.id}
                  slug={t.slug}
                  image={t.images[0]}
                  title={t.display_name}
                  minPrice={t.min_price}
                  deviceCount={t.device_count}
                  brand={t.brand}
                  category={t.category}
                />
              ))}
            </div>
          </SectionWrapper>
        )}

        {/* ── 6. Produktspecifik FAQ ── */}
        <SectionWrapper background="default">
          <Heading as="h2" size="md" className="mb-8 text-center">
            Spørgsmål om dette produkt
          </Heading>
          <div className="mx-auto max-w-2xl divide-y divide-sand rounded-2xl border border-sand bg-white shadow-sm">
            {[
              {
                q: "Hvad er standen på denne enhed?",
                a: "Vi vurderer alle enheder efter et A/B/C-system. Stand A er næsten som ny uden synlige ridser. Stand B har lette brugsspor, men skærmen er perfekt. Stand C kan have tydelige kosmetiske mærker, men er fuldt funktionel. Alle enheder gennemgår minimum 30 kontrolpunkter uanset stand.",
              },
              {
                q: "Hvad gør jeg hvis enheden har en fejl?",
                a: "Alle vores produkter leveres med 36 måneders garanti. Hvis du oplever en fejl, kontakt vores kundeservice, og vi finder en løsning hurtigst muligt — enten reparation, ombytning eller refundering. Du er altid dækket.",
              },
              {
                q: "Hvor hurtigt leverer I?",
                a: "Vi sender din ordre inden for 1-2 hverdage. Du modtager en sporings-mail så snart pakken er afsendt. Vi leverer med DAO eller PostNord direkte til din dør eller nærmeste pakkeshop.",
              },
              {
                q: "Kan jeg returnere enheden?",
                a: "Ja, du har altid 14 dages fuld returret fra den dag du modtager din ordre. Enheden skal returneres i samme stand som du modtog den. Kontakt os, og vi sender dig en returetiket. Pengene refunderes inden for 3-5 hverdage.",
              },
            ].map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
                  <span>{faq.q}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">{faq.a}</div>
              </details>
            ))}
          </div>
        </SectionWrapper>

        {/* ── 7. Trust bar ── */}
        <SectionWrapper background="sand">
          <TrustBar />
        </SectionWrapper>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Fall back to SKU product (accessories, parts, etc.)
  // ---------------------------------------------------------------------------
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

  const deviceType = getDeviceTypeFromSlug(collectionSlug);

  return (
    <>
      {/* Product JSON-LD for SEO / PriceRunner */}
      <JsonLd data={getProductJsonLd(product, `https://phonespot.dk/${collectionSlug}/${productHandle}`)} />

      {/* ── 1. Breadcrumbs ── */}
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

      {/* ── 2. Product hero (two-column) ── */}
      <section className="mx-auto max-w-7xl px-4 py-4 md:py-12">
        <div className="grid gap-4 md:grid-cols-2 md:gap-12">
          <ImageGalleryWithGrade
            images={product.images}
            title={product.title}
            deviceType={deviceType}
          />
          <div className="flex flex-col gap-4">
            <Suspense fallback={null}>
              <TrustpilotStars />
            </Suspense>
            <ProductInfo product={product} collectionSlug={collectionSlug} />
          </div>
        </div>
      </section>

      {/* ── 3. Hvad betyder standen? ── */}
      <SectionWrapper background="default" id="hvad-betyder-standen">
        <Heading as="h2" size="md" className="mb-4 text-center">
          Hvad betyder standen?
        </Heading>
        <p className="mx-auto mb-8 max-w-2xl text-center font-body text-charcoal/70">
          Alle vores enheder er 100&nbsp;% funktionelle og gennemgår en
          grundig kvalitetstest med mindst 30 kontrolpunkter. Standen
          beskriver udelukkende det kosmetiske udseende.
        </p>
        <ConditionIllustrations deviceType={deviceType} />
        <div className="mt-8 text-center">
          <Link
            href="/kvalitet"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-eco transition-colors hover:text-charcoal"
          >
            Læs mere om vores kvalitetsgaranti
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </SectionWrapper>

      {/* ── 4. Om dette produkt ── */}
      <SectionWrapper background="cream">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Om dette produkt
        </Heading>
        <ProductDetails product={product} />
      </SectionWrapper>

      {/* ── 5. Inkluderet i boksen ── */}
      <SectionWrapper background="sand">
        <Heading as="h2" size="md" className="mb-10 text-center">
          Inkluderet i boksen
        </Heading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {[
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-3 h-10 w-10 text-green-eco">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              ),
              label: "Enhed",
              sub: "Testet & kvalitetssikret",
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-3 h-10 w-10 text-green-eco">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 19.5h13.5" />
                </svg>
              ),
              label: "USB-C ladekabel",
              sub: "Kompatibelt kabel",
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-3 h-10 w-10 text-green-eco">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
              ),
              label: "Oplader",
              sub: "Hurtig opladning",
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-3 h-10 w-10 text-green-eco">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              ),
              label: "36 mdr. garantibevis",
              sub: "Med QR-kode",
            },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
              {item.icon}
              <span className="text-sm font-semibold text-charcoal">{item.label}</span>
              <span className="mt-1 text-xs text-gray">{item.sub}</span>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── 6. Trustpilot Reviews ── */}
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

      {/* ── 7. Accessory upsell (phones/smartphones only) ── */}
      {accessories.length > 0 && (deviceType === "phone") && (
        <SectionWrapper background="default">
          <Heading as="h2" size="md" className="mb-8 text-center">
            Beskyt din enhed
          </Heading>
          <UpsellWrapper accessories={accessories} />
        </SectionWrapper>
      )}

      {/* ── 8. Relaterede produkter ── */}
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

      {/* ── 9. Produktspecifik FAQ ── */}
      <SectionWrapper background="default">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Spørgsmål om dette produkt
        </Heading>
        <div className="mx-auto max-w-2xl divide-y divide-sand rounded-2xl border border-sand bg-white shadow-sm">
          {[
            {
              q: "Hvad er standen på denne enhed?",
              a: "Vi vurderer alle enheder efter et A/B/C-system. Stand A er næsten som ny uden synlige ridser. Stand B har lette brugsspor, men skærmen er perfekt. Stand C kan have tydelige kosmetiske mærker, men er fuldt funktionel. Alle enheder gennemgår minimum 30 kontrolpunkter uanset stand.",
            },
            {
              q: "Hvad gør jeg hvis enheden har en fejl?",
              a: "Alle vores produkter leveres med 36 måneders garanti. Hvis du oplever en fejl, kontakt vores kundeservice, og vi finder en løsning hurtigst muligt — enten reparation, ombytning eller refundering. Du er altid dækket.",
            },
            {
              q: "Hvor hurtigt leverer I?",
              a: "Vi sender din ordre inden for 1-2 hverdage. Du modtager en sporings-mail så snart pakken er afsendt. Vi leverer med DAO eller PostNord direkte til din dør eller nærmeste pakkeshop.",
            },
            {
              q: "Kan jeg returnere enheden?",
              a: "Ja, du har altid 14 dages fuld returret fra den dag du modtager din ordre. Enheden skal returneres i samme stand som du modtog den. Kontakt os, og vi sender dig en returetiket. Pengene refunderes inden for 3-5 hverdage.",
            },
          ].map((faq) => (
            <details key={faq.q} className="group">
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
                <span>{faq.q}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">{faq.a}</div>
            </details>
          ))}
        </div>
      </SectionWrapper>

      {/* ── 10. Trust bar ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
