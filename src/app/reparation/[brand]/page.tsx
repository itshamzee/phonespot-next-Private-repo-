import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllBrandSlugs,
  getBrandBySlug,
  getModelsByBrand,
  getCheapestPrice,
} from "@/lib/supabase/repairs";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { ModelGrid, type ModelCardData } from "./model-grid";

export const revalidate = 3600;

type Props = { params: Promise<{ brand: string }> };

export async function generateStaticParams() {
  const slugs = await getAllBrandSlugs();
  return slugs.map((brand) => ({ brand }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};

  return {
    title: `${brand.name} Reparation Slagelse — Se Priser | PhoneSpot`,
    description: `Professionel ${brand.name} reparation i Slagelse. Se priser pa skaermskift, batteriskift og mere for alle ${brand.name} modeller. Garanti pa alle reparationer.`,
    alternates: {
      canonical: `https://phonespot.dk/reparation/${brand.slug}`,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { brand: brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const models = await getModelsByBrand(brand.id);

  const modelCards: ModelCardData[] = await Promise.all(
    models.map(async (model) => ({
      slug: model.slug,
      name: model.name,
      cheapestPrice: await getCheapestPrice(model.id),
      brandSlug: brand.slug,
      imageUrl: model.image_url,
      deviceType: brand.device_type,
    })),
  );

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
    geo: {
      "@type": "GeoCoordinates",
      latitude: STORE.coordinates.lat,
      longitude: STORE.coordinates.lng,
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

      {/* Compact header with breadcrumb */}
      <div className="border-b border-soft-grey bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <nav className="mb-3 text-sm text-gray" aria-label="Breadcrumb">
            <Link href="/reparation" className="text-green-eco hover:underline">
              Reparation
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-charcoal">{brand.name}</span>
          </nav>

          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal md:text-4xl">
            {brand.name} Reparation
          </h1>
          <p className="mt-2 max-w-xl text-gray">
            Vaelg din {brand.name} model herunder for at se priser og booke reparation.
            Alle reparationer udfoeres med garanti i vores butik i {STORE.city}.
          </p>

          {/* Trust badges inline */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-charcoal/70">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-green-eco">
                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
              </svg>
              Garanti
            </span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-green-eco">
                <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
              </svg>
              1-3 hverdage
            </span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-green-eco">
                <path fillRule="evenodd" d="M2.5 7.775V2.75a.25.25 0 0 1 .25-.25h2.025a.25.25 0 0 1 .177.073l6.25 6.25a.25.25 0 0 1 0 .354l-2.025 2.025a.25.25 0 0 1-.354 0l-6.25-6.25a.25.25 0 0 1-.073-.177Z" clipRule="evenodd" />
              </svg>
              Faste priser
            </span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-green-eco">
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
              </svg>
              {STORE.city}
            </span>
          </div>
        </div>
      </div>

      {/* Model grid section */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <ModelGrid models={modelCards} brandName={brand.name} />
      </div>

      {/* SEO content */}
      <div className="border-t border-soft-grey bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-charcoal">
            {brand.name} Reparation hos PhoneSpot
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-charcoal/70">
            <p>
              Hos PhoneSpot i {STORE.mall}, {STORE.city}, tilbyder vi professionel
              reparation af alle {brand.name} modeller. Uanset om du har brug for
              skaermskift, batteriskift eller anden reparation, staar vi klar til
              at hjaelpe dig med hurtig service og faste priser.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Specialister i {brand.name} reparation
            </h3>
            <p>
              Vores teknikere er specialuddannede i {brand.name} reparation og
              bruger kun kvalitetsdele der matcher de originale specifikationer.
              Det sikrer at din enhed fungerer praecis som den skal efter
              reparationen — med korrekt farvegengivelse, touch-respons og fuld
              funktionalitet.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Konkurrencedygtige priser uden overraskelser
            </h3>
            <p>
              Vi oplyser altid prisen inden vi starter reparationen. Alle priser
              er inkl. moms, reservedele og garanti. Vaelg din {brand.name} model
              ovenfor for at se de aktuelle priser paa alle reparationer.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Beliggenhed og aabningstider
            </h3>
            <p>
              Du finder os i {STORE.mall}, {STORE.street}, {STORE.zip} {STORE.city}.
              Vi har aabent hverdage {STORE.hours.weekdays} og loerdage {STORE.hours.saturday}.
              Du kan baade booke tid online eller komme forbi som drop-in.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl bg-charcoal p-8 text-center text-white">
            <h3 className="font-display text-xl font-bold uppercase">
              Kan du ikke finde din model?
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Kontakt os, og vi hjaelper dig med at finde den rette reparation.
            </p>
            <Link
              href="/kontakt"
              className="mt-4 inline-block rounded-full bg-green-eco px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Kontakt os
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
