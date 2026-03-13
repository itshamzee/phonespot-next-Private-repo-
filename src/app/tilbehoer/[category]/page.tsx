import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublishedSkuProducts } from "@/lib/supabase/product-queries";
import {
  getCategoryConfig,
  getAllCategoryParams,
} from "@/lib/tilbehoer-config";
import { Heading } from "@/components/ui/heading";
import { FadeIn } from "@/components/ui/fade-in";
import { TrustBar } from "@/components/ui/trust-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/tilbehoer/breadcrumb";
import type { SkuProduct } from "@/lib/supabase/platform-types";

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

function formatDKK(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

function AccessoryCard({ product, category }: { product: SkuProduct; category: string }) {
  const href = product.slug ? `/tilbehoer/${category}/${product.slug}` : "#";
  const price = product.sale_price ?? product.selling_price;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-sand bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-cream">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.title}
            className="h-full w-full object-contain p-4 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sand">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </div>
        )}
        {product.sale_price != null && product.sale_price < product.selling_price && (
          <div className="absolute top-2 left-2">
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              SALE
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        {product.brand && <p className="text-xs text-gray">{product.brand}</p>}
        <p className="text-sm font-semibold text-charcoal line-clamp-2">{product.title}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <p className="text-sm font-bold text-green-eco">{formatDKK(price)}</p>
          {product.sale_price != null && product.sale_price < product.selling_price && (
            <p className="text-xs text-charcoal/40 line-through">{formatDKK(product.selling_price)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function TilbehoerCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) notFound();

  // Fetch published SKU products for this category
  const products = await getPublishedSkuProducts(category);

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
            <p className="mt-1 text-sm text-gray">{products.length} produkter</p>
          </div>
        </FadeIn>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product, index) => (
              <FadeIn key={product.id} delay={Math.min(index * 0.03, 0.3)}>
                <AccessoryCard product={product} category={category} />
              </FadeIn>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-lg font-medium text-charcoal/60">
              Ingen produkter fundet
            </p>
            <p className="mt-2 text-sm text-gray">
              Se alle vores tilbehørskategorier.
            </p>
            <Link
              href="/tilbehoer"
              className="mt-4 inline-block text-sm font-semibold text-green-eco hover:underline"
            >
              Tilbage til tilbehør &rarr;
            </Link>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <TrustBar />
      </section>
    </>
  );
}
