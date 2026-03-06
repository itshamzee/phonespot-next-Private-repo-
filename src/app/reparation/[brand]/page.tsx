import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllBrandSlugs,
  getBrandBySlug,
  getModelsByBrand,
  getCheapestPrice,
} from "@/lib/supabase/repairs";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { ModelGrid, type ModelCardData } from "./model-grid";

// ---------------------------------------------------------------------------
// ISR — revalidate every hour
// ---------------------------------------------------------------------------

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ brand: string }> };

export async function generateStaticParams() {
  const slugs = await getAllBrandSlugs();
  return slugs.map((brand) => ({ brand }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};

  return {
    title: `${brand.name} Reparation Slagelse | PhoneSpot`,
    description: `Fa din ${brand.name} repareret i Slagelse. Se priser pa alle ${brand.name} reparationer. Garanti pa alle reparationer.`,
    alternates: {
      canonical: `https://phonespot.dk/reparation/${brand.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BrandPage({ params }: Props) {
  const { brand: brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const models = await getModelsByBrand(brand.id);

  // Fetch cheapest prices in parallel for all models
  const modelCards: ModelCardData[] = await Promise.all(
    models.map(async (model) => ({
      slug: model.slug,
      name: model.name,
      cheapestPrice: await getCheapestPrice(model.id),
      brandSlug: brand.slug,
    })),
  );

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${brand.name} Reparation - ${STORE.name}`,
    url: `https://phonespot.dk/reparation/${brand.slug}`,
    description: `Professionel ${brand.name} reparation i ${STORE.city}. Garanti pa alle reparationer.`,
    address: {
      "@type": "PostalAddress",
      streetAddress: STORE.street,
      addressLocality: STORE.city,
      postalCode: STORE.zip,
      addressCountry: STORE.countryCode,
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${brand.name} Reparationer`,
      itemListElement: modelCards
        .filter((m) => m.cheapestPrice != null)
        .map((m) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: `${m.name} Reparation`,
          },
          priceCurrency: "DKK",
          price: m.cheapestPrice,
        })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <nav className="mb-4 text-sm text-white/50" aria-label="Breadcrumb">
          <Link href="/reparation" className="hover:text-white/80">
            Reparation
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="text-white/80">{brand.name}</span>
        </nav>

        <Heading as="h1" size="xl" className="text-white">
          {brand.name} Reparation Slagelse
        </Heading>

        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          Professionel {brand.name} reparation i {STORE.city}. Vi tilbyder
          hurtig service med garanti pa alle reparationer.
        </p>
      </SectionWrapper>

      {/* Model grid with client-side search */}
      <SectionWrapper>
        <Heading as="h2" size="md" className="mb-2 text-center">
          Valg din {brand.name} model
        </Heading>
        <p className="mx-auto mb-8 max-w-xl text-center text-gray-500">
          Find din model herunder og se priser pa alle reparationer.
        </p>

        <ModelGrid models={modelCards} />
      </SectionWrapper>

      {/* SEO content block */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl">
          <Heading as="h2" size="sm" className="mb-4">
            {brand.name} Reparation hos PhoneSpot
          </Heading>
          <div className="space-y-4 text-charcoal/80">
            <p>
              Hos PhoneSpot i {STORE.mall}, {STORE.city}, tilbyder vi
              professionel reparation af alle {brand.name} modeller. Uanset om
              du har brug for skarmskift, batteriskift eller anden reparation,
              star vi klar til at hjalpe dig.
            </p>
            <p>
              Alle vores reparationer udforres med reservedele af hojeste
              kvalitet, og vi giver garanti pa alle reparationer. Vi bestraber os
              pa at tilbyde de bedste priser i {STORE.city} og omegn.
            </p>
            <p>
              Kom forbi vores butik i {STORE.mall} eller bestil tid online. Vi
              tilbyder ogsa drop-in service, sa du kan komme forbi nar det
              passer dig.
            </p>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
