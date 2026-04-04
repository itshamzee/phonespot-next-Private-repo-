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
import { STORES } from "@/lib/store-config";
import { ModelGrid, type ModelCardData } from "../../[brand]/model-grid";

export const revalidate = 3600;

type Props = { params: Promise<{ location: string; brand: string }> };

export async function generateStaticParams() {
  const locations = Object.keys(STORES);
  const brandSlugs = await getAllBrandSlugs();
  return locations.flatMap((location) =>
    brandSlugs.map((brand) => ({ location, brand })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location, brand: brandSlug } = await params;
  const store = STORES[location];
  if (!store) return {};

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};

  const city = store.city;

  return {
    title: `${brand.name} Reparation ${city} — Se Priser | PhoneSpot`,
    description: `Professionel ${brand.name} reparation i ${city}. Se priser på skærmskift, batteriskift og mere. Livstidsgaranti. ${store.street}, ${store.zip} ${city}.`,
    alternates: {
      canonical: `https://phonespot.dk/reparation/${location}/${brand.slug}`,
    },
  };
}

export default async function LocationBrandPage({ params }: Props) {
  const { location, brand: brandSlug } = await params;
  const store = STORES[location];
  if (!store) notFound();

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const city = store.city;
  const models = await getModelsByBrand(brand.id);

  const modelCards: ModelCardData[] = await Promise.all(
    models.map(async (model) => ({
      slug: model.slug,
      name: model.name,
      series: model.series,
      cheapestPrice: await getCheapestPrice(model.id),
      brandSlug: brand.slug,
      imageUrl: model.image_url,
      deviceType: brand.device_type,
    })),
  );

  const storeLocation = store.mall
    ? `${store.mall}, ${store.street}`
    : store.street;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${brand.name} Reparation - ${store.name}`,
    url: `https://phonespot.dk/reparation/${location}/${brand.slug}`,
    description: `Professionel ${brand.name} reparation i ${city}. Livstidsgaranti på alle reparationer.`,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.street,
      addressLocality: city,
      postalCode: store.zip,
      addressCountry: store.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: store.coordinates.lat,
      longitude: store.coordinates.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: store.hours.weekdays.split(" – ")[0],
        closes: store.hours.weekdays.split(" – ")[1],
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: store.hours.saturday.split(" – ")[0],
        closes: store.hours.saturday.split(" – ")[1],
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: store.hours.sunday.split(" – ")[0],
        closes: store.hours.sunday.split(" – ")[1],
      },
    ],
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

      {/* ================================================================= */}
      {/*  HERO HEADER — Clean light brand header                           */}
      {/* ================================================================= */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-[#86868B]">
              <li>
                <Link href="/reparation" className="transition-colors hover:text-[#111111]">
                  Reparation
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/reparation/${location}`} className="transition-colors hover:text-[#111111]">
                  {city}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-[#111111]">{brand.name}</li>
            </ol>
          </nav>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-[#111111] md:text-5xl">
                {brand.name}<br />
                <span className="text-[#1A3D2E]">Reparation {city}</span>
              </h1>
              <p className="mt-4 max-w-lg text-[#86868B]">
                Valg din {brand.name} model herunder for at se priser og booke reparation.
                Alle reparationer udføres med livstidsgaranti i vores butik i {city}.
              </p>
            </div>

            {/* Trust badges — horizontal on desktop */}
            <div className="hidden items-center gap-6 lg:flex">
              {[
                { icon: "shield", label: "Livstidsgaranti" },
                { icon: "clock", label: "30 min service" },
                { icon: "tag", label: "Faste priser" },
                { icon: "walk", label: "Walk-in" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3D2E]/10 text-[#1A3D2E]">
                    {icon === "shield" && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    )}
                    {icon === "clock" && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                    {icon === "tag" && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                    )}
                    {icon === "walk" && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                        <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <circle cx="12" cy="11" r="3" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-[#86868B]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile trust badges */}
          <div className="mt-6 flex flex-wrap gap-3 lg:hidden">
            {["Livstidsgaranti", "30 min service", "Faste priser", "Walk-in"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-[#E5E5EA] bg-white px-3 py-1.5 text-xs font-medium text-[#86868B]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  MODEL GRID — Dense, searchable                                    */}
      {/* ================================================================= */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ModelGrid
            models={modelCards}
            brandName={brand.name}
            linkPrefix={`/reparation/${location}/${brand.slug}`}
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SEO CONTENT                                                       */}
      {/* ================================================================= */}
      <section className="border-t border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            {brand.name} Reparation i {city} hos PhoneSpot
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#111111]/70">
            <p>
              Hos PhoneSpot i {storeLocation}, {city}, tilbyder vi professionel
              reparation af alle {brand.name} modeller. Uanset om du har brug for
              skærmskift, batteriskift eller anden reparation, står vi klar til
              at hjælpe dig med hurtig service og faste priser.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Specialister i {brand.name} reparation i {city}
            </h3>
            <p>
              Vores teknikere er specialuddannede i {brand.name} reparation og
              bruger kun kvalitetsdele der matcher de originale specifikationer.
              Det sikrer at din enhed fungerer præcis som den skal efter
              reparationen — med korrekt farvegengivelse, touch-respons og fuld
              funktionalitet.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Livstidsgaranti på alle reparationer
            </h3>
            <p>
              Alle {brand.name} reparationer fra PhoneSpot {city} dækkes af vores livstidsgaranti.
              Det betyder at hvis den samme fejl opstår igen — uanset hvornår — reparerer
              vi enheden uden beregning. Vi står bag vores arbejde, altid.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Walk-in service eller book online
            </h3>
            <p>
              Du finder os på {store.street}, {store.zip} {city}.
              Du kan komme forbi som walk-in i vores åbningstider (hverdage {store.hours.weekdays},
              lørdage {store.hours.saturday}) eller booke tid online for at sikre dig en plads.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Konkurrencedygtige priser uden overraskelser
            </h3>
            <p>
              Vi oplyser altid prisen inden vi starter reparationen. Alle priser
              er inkl. moms, reservedele og garanti. Vælg din {brand.name} model
              ovenfor for at se de aktuelle priser på alle reparationer.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-8 text-center">
            <h3 className="font-display text-xl font-bold text-[#111111]">
              Kan du ikke finde din model?
            </h3>
            <p className="mt-2 text-sm text-[#86868B]">
              Kontakt os, og vi hjælper dig med at finde den rette reparation.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/kontakt"
                className="inline-block rounded-full bg-[#1A3D2E] px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Kontakt os
              </Link>
              <Link
                href={`/reparation/${location}`}
                className="inline-block rounded-full border border-[#E5E5EA] bg-white px-8 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F7F7F8]"
              >
                Alle mærker
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
