import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getSkuProductBySlug, getPublishedSkuProducts } from "@/lib/supabase/product-queries";
import { skuProductToProduct } from "@/lib/supabase/product-adapter";
import type { Product } from "@/lib/shopify/types";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductCard } from "@/components/product/product-card";
import { CoverProductHero } from "@/components/cover/cover-product-hero";
import { KlarnaBanner } from "@/components/ui/klarna-banner";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProductJsonLd(product: Product, url: string): Record<string, unknown> {
  const price = product.priceRange.minVariantPrice;
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
      "@type": "Offer",
      price: parseFloat(price.amount),
      priceCurrency: price.currencyCode,
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "PhoneSpot" },
      url,
    },
  };
}

/** Extract compatible models from tags like "iPhone 15 Pro", "iPhone 15 Pro Max" etc. */
function getCompatibleModels(tags: string[]): string[] {
  const modelPatterns = /^(iPhone|iPad|Samsung|Galaxy|Google Pixel|OnePlus|Huawei)/i;
  return tags.filter((t) => modelPatterns.test(t));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ product: string }>;
}): Promise<Metadata> {
  const { product: productHandle } = await params;

  const skuData = await getSkuProductBySlug(productHandle);
  if (!skuData) return { title: "Cover ikke fundet - PhoneSpot" };
  const product = skuProductToProduct(skuData);

  const title = product.seo.title ?? `${product.title} | PhoneSpot`;
  const description =
    product.seo.description ??
    `Køb ${product.title} hos PhoneSpot. Hurtig levering og skarpe priser.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
      siteName: "PhoneSpot",
      locale: "da_DK",
      type: "website",
    },
    alternates: {
      canonical: `https://phonespot.dk/covers/${productHandle}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CoverProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product: productHandle } = await params;

  const skuData = await getSkuProductBySlug(productHandle);
  if (!skuData) notFound();
  const product = skuProductToProduct(skuData);

  const compatibleModels = getCompatibleModels(product.tags);

  // Fetch related covers
  let relatedProducts: Product[] = [];
  try {
    const related = await getPublishedSkuProducts("accessory");
    relatedProducts = related
      .filter((p) => p.slug !== productHandle)
      .slice(0, 4)
      .map(skuProductToProduct);
  } catch {
    // non-fatal
  }

  const url = `https://phonespot.dk/covers/${productHandle}`;

  return (
    <>
      <JsonLd data={getProductJsonLd(product, url)} />

      {/* Breadcrumbs */}
      <nav aria-label="Brødkrumme" className="mx-auto max-w-7xl px-4 pt-4 pb-2">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray">
          <li>
            <Link href="/" className="transition-colors hover:text-charcoal">Hjem</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/tilbehoer" className="transition-colors hover:text-charcoal">Tilbehør</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/tilbehoer/covers" className="transition-colors hover:text-charcoal">Covers</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-charcoal truncate max-w-[200px] md:max-w-none">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* Product hero */}
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12"><div className="h-[500px] animate-pulse rounded-3xl bg-sand" /></div>}>
        <CoverProductHero product={product} compatibleModels={compatibleModels} />
      </Suspense>

      {/* Klarna banner */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <KlarnaBanner
          priceAmount={product.priceRange.minVariantPrice.amount}
          currencyCode={product.priceRange.minVariantPrice.currencyCode}
        />
      </div>

      {/* Trust badges */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { icon: "M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H21M3.375 14.25h.386c.51 0 .995-.186 1.374-.514l4.49-3.882c.456-.395 1.059-.539 1.625-.389l3.126.834c.478.128.98.066 1.41-.178l3.1-1.759A1.5 1.5 0 0 0 19.5 7.29V3.75m0 0h-3.75m3.75 0-.75 4.5", label: "Hurtig levering", desc: "1-2 hverdage" },
            { icon: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z", label: "Kvalitets-cover", desc: "Testet pasform" },
            { icon: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182", label: "14 dages retur", desc: "Fuld returret" },
            { icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z", label: "Sikker betaling", desc: "Visa, MC, MobilePay" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-sand bg-white px-4 py-3.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-eco/10">
                <svg className="h-5 w-5 text-green-eco" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                <p className="text-xs text-gray">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Related covers */}
      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <h2 className="mb-8 font-display text-2xl font-bold text-charcoal md:text-3xl">
            Andre covers du vil elske
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} collectionHandle="covers" />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
