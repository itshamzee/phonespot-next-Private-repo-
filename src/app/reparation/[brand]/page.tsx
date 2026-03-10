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
    description: `Professionel ${brand.name} reparation i Slagelse. Se priser på skærmskift, batteriskift og mere for alle ${brand.name} modeller. Livstidsgaranti på alle reparationer.`,
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
      series: model.series,
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
    description: `Professionel ${brand.name} reparation i ${STORE.city}. Livstidsgaranti på alle reparationer.`,
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

      {/* ================================================================= */}
      {/*  HERO HEADER — Bold brand identity with trust signals              */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden bg-charcoal">
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />
        {/* Accent gradient */}
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-green-eco/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-white/40">
              <li>
                <Link href="/reparation" className="transition-colors hover:text-white/70">
                  Reparation
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-white">{brand.name}</li>
            </ol>
          </nav>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white md:text-5xl">
                {brand.name}<br />
                <span className="text-green-eco">Reparation</span>
              </h1>
              <p className="mt-4 max-w-lg text-white/60">
                Vælg din {brand.name} model herunder for at se priser og booke reparation.
                Alle reparationer udføres med livstidsgaranti i vores butik i {STORE.city}.
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-green-eco">
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
                  <span className="text-[10px] font-medium text-white/50">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile trust badges */}
          <div className="mt-6 flex flex-wrap gap-3 lg:hidden">
            {["Livstidsgaranti", "30 min service", "Faste priser", "Walk-in"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70"
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
      <section className="bg-warm-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ModelGrid models={modelCards} brandName={brand.name} />
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SEO CONTENT                                                       */}
      {/* ================================================================= */}
      <section className="border-t border-soft-grey bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-charcoal">
            {brand.name} Reparation hos PhoneSpot
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-charcoal/70">
            <p>
              Hos PhoneSpot i {STORE.mall}, {STORE.city}, tilbyder vi professionel
              reparation af alle {brand.name} modeller. Uanset om du har brug for
              skærmskift, batteriskift eller anden reparation, står vi klar til
              at hjælpe dig med hurtig service og faste priser.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Specialister i {brand.name} reparation
            </h3>
            <p>
              Vores teknikere er specialuddannede i {brand.name} reparation og
              bruger kun kvalitetsdele der matcher de originale specifikationer.
              Det sikrer at din enhed fungerer præcis som den skal efter
              reparationen — med korrekt farvegengivelse, touch-respons og fuld
              funktionalitet.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Livstidsgaranti på alle reparationer
            </h3>
            <p>
              Alle {brand.name} reparationer fra PhoneSpot dækkes af vores livstidsgaranti.
              Det betyder at hvis den samme fejl opstår igen — uanset hvornår — reparerer
              vi enheden uden beregning. Vi står bag vores arbejde, altid.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Walk-in service eller book online
            </h3>
            <p>
              Du finder os i {STORE.mall}, {STORE.street}, {STORE.zip} {STORE.city}.
              Du kan komme forbi som walk-in i vores åbningstider (hverdage {STORE.hours.weekdays},
              lørdage {STORE.hours.saturday}) eller booke tid online for at sikre dig en plads.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Konkurrencedygtige priser uden overraskelser
            </h3>
            <p>
              Vi oplyser altid prisen inden vi starter reparationen. Alle priser
              er inkl. moms, reservedele og garanti. Vælg din {brand.name} model
              ovenfor for at se de aktuelle priser på alle reparationer.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl bg-charcoal p-8 text-center text-white">
            <h3 className="font-display text-xl font-bold uppercase">
              Kan du ikke finde din model?
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Kontakt os, og vi hjælper dig med at finde den rette reparation.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/kontakt"
                className="inline-block rounded-full bg-green-eco px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Kontakt os
              </Link>
              <Link
                href="/reparation"
                className="inline-block rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
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
