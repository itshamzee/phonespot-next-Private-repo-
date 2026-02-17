import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getAllSparePartPaths,
  getSparePartModel,
} from "@/lib/spare-parts";
import { getCollectionProducts } from "@/lib/shopify/client";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return getAllSparePartPaths();
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; model: string }>;
}): Promise<Metadata> {
  const { category, model } = await params;
  const result = getSparePartModel(category, model);
  if (!result) return { title: "Ikke fundet - PhoneSpot" };

  return {
    title: `${result.model.label} Reservedele | PhoneSpot`,
    description: `Kob reservedele til ${result.model.label}. Skaerme, batterier og mere med 24 maneders garanti hos PhoneSpot.`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ModelPartsPage({
  params,
}: {
  params: Promise<{ category: string; model: string }>;
}) {
  const { category, model } = await params;
  const result = getSparePartModel(category, model);
  if (!result) notFound();

  const { category: cat, model: modelConfig } = result;

  let collectionData: Awaited<ReturnType<typeof getCollectionProducts>> = null;
  try {
    collectionData = await getCollectionProducts(modelConfig.shopifyHandle);
  } catch {
    collectionData = null;
  }

  const products = collectionData?.products ?? [];

  return (
    <>
      {/* Hero */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <nav className="mb-4 text-sm text-white/50" aria-label="Breadcrumb">
          <Link href="/reservedele" className="hover:text-white/80">
            Reservedele
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <Link
            href={`/reservedele/${cat.slug}`}
            className="hover:text-white/80"
          >
            {cat.label}
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="text-white/80">{modelConfig.label}</span>
        </nav>
        <Heading as="h1" size="lg" className="text-white">
          {modelConfig.label} Reservedele
        </Heading>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          Find skaerme, batterier og andre reservedele til{" "}
          {modelConfig.label}. Alle dele leveres med 24 maneders garanti.
        </p>
      </SectionWrapper>

      {/* Products */}
      <SectionWrapper>
        {products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-lg text-gray">
              Ingen reservedele fundet for {modelConfig.label} i oebliekket.
            </p>
            <Link
              href={`/reservedele/${cat.slug}`}
              className="mt-4 inline-block text-sm font-semibold text-green-eco hover:underline"
            >
              &larr; Tilbage til {cat.label}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray">
              {products.length} reservedel{products.length !== 1 ? "e" : ""}{" "}
              fundet
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const image = product.images[0];
                const price = product.priceRange.minVariantPrice;

                return (
                  <Link
                    key={product.id}
                    href={`/reservedele/${product.handle}`}
                    className="group overflow-hidden rounded-xl border border-sand bg-white transition-all hover:border-green-eco hover:shadow-lg"
                  >
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-cream">
                      {image ? (
                        <Image
                          src={image.url}
                          alt={image.altText || product.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-contain p-4 transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray/40">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1}
                            className="h-12 w-12"
                          >
                            <rect
                              x="3"
                              y="3"
                              width="18"
                              height="18"
                              rx="2"
                            />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-display text-sm font-semibold uppercase tracking-[1px] text-charcoal line-clamp-2">
                        {product.title}
                      </h3>
                      <p className="mt-2 text-lg font-bold text-green-eco">
                        {Number(price.amount).toLocaleString("da-DK")} {price.currencyCode}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </SectionWrapper>

      {/* Trust */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
