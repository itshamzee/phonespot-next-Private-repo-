import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllSparePartPaths,
  getSparePartModel,
} from "@/lib/spare-parts";
import { getCollectionProducts } from "@/lib/medusa/client";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { PartTypeFilter } from "@/components/spare-parts/part-type-filter";

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
    description: `Køb reservedele til ${result.model.label}. Skærme, batterier og mere med 36 måneders garanti hos PhoneSpot.`,
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
          Find skærme, batterier og andre reservedele til{" "}
          {modelConfig.label}. Alle dele leveres med 36 måneders garanti.
        </p>
      </SectionWrapper>

      {/* Products with filter */}
      <SectionWrapper>
        {products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-lg text-gray">
              Ingen reservedele fundet for {modelConfig.label} i øjeblikket.
            </p>
            <Link
              href={`/reservedele/${cat.slug}`}
              className="mt-4 inline-block text-sm font-semibold text-green-eco hover:underline"
            >
              &larr; Tilbage til {cat.label}
            </Link>
          </div>
        ) : (
          <PartTypeFilter
            products={products}
            collectionHandle={`reservedele/${cat.slug}/${modelConfig.slug}`}
          />
        )}
      </SectionWrapper>

      {/* Trust */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
