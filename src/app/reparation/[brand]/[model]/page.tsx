import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { DeviceImage } from "@/components/repair/device-image";
import {
  getBrandBySlug,
  getModelBySlug,
  getServicesByModel,
  getAllModelSlugs,
} from "@/lib/supabase/repairs";

export const revalidate = 3600;

type Props = {
  params: Promise<{ brand: string; model: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllModelSlugs();
  return slugs.map(({ brand, model }) => ({ brand, model }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug, model: modelSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};
  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) return {};

  const cheapest = (await getServicesByModel(model.id)).filter(s => s.price_dkk > 0).sort((a, b) => a.price_dkk - b.price_dkk)[0];

  return {
    title: `${model.name} Reparation Slagelse — Fra ${cheapest?.price_dkk ?? ""} DKK | PhoneSpot`,
    description: `${model.name} reparation i Slagelse. Skaermskift, batteriskift og mere fra ${cheapest?.price_dkk ?? ""} DKK. Garanti paa alle reparationer. Hurtig service hos PhoneSpot.`,
    alternates: {
      canonical: `https://phonespot.dk/reparation/${brand.slug}/${model.slug}`,
    },
  };
}

// Service type → icon mapping
const SERVICE_ICONS: Record<string, string> = {
  "skaermskift-original": "screen",
  "skaermskift-oem": "screen",
  "skaermskift": "screen",
  "batteriskift": "battery",
  "opladerstik": "charging",
  "bagkamera": "camera",
  "frontkamera": "camera",
  "bagglas": "glass",
  "hoejttaler": "speaker",
  "mikrofon": "mic",
  "power-knap": "button",
  "diagnostik": "diagnostic",
  "vandskade": "water",
  "tastatur": "keyboard",
  "hdmi-port": "hdmi",
  "blaeser": "fan",
  "termisk-pasta": "thermal",
  "controller-reparation": "controller",
};

function ServiceIcon({ type }: { type: string }) {
  const icon = SERVICE_ICONS[type] ?? "wrench";

  const icons: Record<string, React.ReactNode> = {
    screen: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="5" y1="18" x2="19" y2="18" />
        <path d="M8 6h8M8 10h5" strokeOpacity="0.5" />
      </svg>
    ),
    battery: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <rect x="2" y="7" width="18" height="10" rx="2" />
        <path d="M22 11v2" />
        <rect x="5" y="10" width="8" height="4" rx="0.5" fill="currentColor" opacity="0.2" />
      </svg>
    ),
    charging: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M12 2v6M12 16v6" />
        <rect x="6" y="8" width="12" height="8" rx="2" />
        <path d="M10 11l2 2 2-2" />
      </svg>
    ),
    camera: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    glass: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M5 6l14 12M9 2l10 16" strokeOpacity="0.4" />
      </svg>
    ),
    speaker: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
      </svg>
    ),
    mic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
    button: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    diagnostic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
        <path d="M14 9l-2 2 4 4" />
      </svg>
    ),
    water: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
      </svg>
    ),
    keyboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
      </svg>
    ),
    hdmi: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M4 7h16v10H4z" />
        <path d="M7 17v3M17 17v3M2 7l2-3h16l2 3" />
      </svg>
    ),
    fan: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 9c0-3-2-6-6-6 0 4 2 6 6 6zM15 12c3 0 6-2 6-6-4 0-6 2-6 6zM12 15c0 3 2 6 6 6 0-4-2-6-6-6zM9 12c-3 0-6 2-6 6 4 0 6-2 6-6z" />
      </svg>
    ),
    thermal: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M14 4v10.54a4 4 0 11-4 0V4a2 2 0 014 0z" />
        <circle cx="12" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
    controller: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" />
        <path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 004.4 2.66l.775-.516A2 2 0 018.288 18h7.424a2 2 0 011.114.344l.775.516A3 3 0 0022 16c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.152A4 4 0 0017.32 5z" />
      </svg>
    ),
    wrench: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  };

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-eco/10 text-green-eco">
      {icons[icon] ?? icons.wrench}
    </div>
  );
}

export default async function ModelPricePage({ params }: Props) {
  const { brand: brandSlug, model: modelSlug } = await params;

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) notFound();

  const services = await getServicesByModel(model.id);
  const paidServices = services.filter(s => s.price_dkk > 0);
  const cheapest = paidServices.length > 0
    ? Math.min(...paidServices.map(s => s.price_dkk))
    : null;
  const totalServices = services.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: STORE.name,
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
      name: `${model.name} Reparation`,
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name },
        price: s.price_dkk,
        priceCurrency: "DKK",
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Breadcrumb header */}
      <div className="border-b border-soft-grey bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <nav aria-label="Breadcrumb" className="text-sm text-gray">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/reparation" className="text-green-eco hover:underline">Reparation</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href={`/reparation/${brand.slug}`} className="text-green-eco hover:underline">{brand.name}</Link></li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-charcoal">{model.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main content — two columns */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">

          {/* Left column — device info + price table */}
          <div>
            {/* Device header */}
            <div className="mb-8 flex items-start gap-6">
              <div className="hidden h-24 w-16 shrink-0 sm:block">
                <DeviceImage
                  brandSlug={brand.slug}
                  deviceType={brand.device_type}
                  imageUrl={model.image_url}
                  modelName={model.name}
                  className="h-full w-full"
                />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal md:text-4xl">
                  {model.name} Reparation
                </h1>
                <p className="mt-2 text-gray">
                  Se priser paa alle {model.name} reparationer herunder. Alle priser er inkl. moms, reservedele og garanti.
                </p>
              </div>
            </div>

            {/* Service list */}
            <div className="space-y-3">
              {services.length === 0 && (
                <div className="rounded-2xl border border-soft-grey bg-white p-10 text-center text-gray">
                  Ingen reparationer tilgaengelige for denne model endnu.
                </div>
              )}

              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-4 rounded-2xl border border-soft-grey bg-white p-4 transition-colors hover:border-green-eco/40"
                >
                  {/* Icon */}
                  <ServiceIcon type={service.slug} />

                  {/* Name + time */}
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold text-charcoal">
                      {service.name}
                    </p>
                    {service.estimated_minutes && (
                      <p className="text-xs text-gray">
                        ca. {service.estimated_minutes} min
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <span className="whitespace-nowrap text-sm font-bold text-charcoal">
                    {service.price_dkk === 0
                      ? "Gratis"
                      : `${service.price_dkk} DKK`}
                  </span>

                  {/* Book button */}
                  <Link
                    href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}&service=${service.slug}`}
                    className="hidden rounded-full bg-green-eco px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:inline-block"
                  >
                    Book
                  </Link>
                </div>
              ))}
            </div>

            {/* Mobile book CTA */}
            <div className="mt-6 sm:hidden">
              <Link
                href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}`}
                className="block rounded-full bg-green-eco py-4 text-center font-semibold text-white transition-opacity hover:opacity-90"
              >
                Book {model.name} reparation
              </Link>
            </div>
          </div>

          {/* Right column — sticky sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              {/* Overview card */}
              <div className="rounded-2xl border border-soft-grey bg-white p-6">
                <h2 className="font-display text-lg font-bold text-charcoal">Oversigt</h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray">Model</span>
                    <span className="font-medium text-charcoal">{model.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Reparationer</span>
                    <span className="font-medium text-charcoal">{totalServices} typer</span>
                  </div>
                  {cheapest && (
                    <div className="flex justify-between">
                      <span className="text-gray">Priser fra</span>
                      <span className="font-bold text-green-eco">{cheapest} DKK</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray">Leveringstid</span>
                    <span className="font-medium text-charcoal">1-3 hverdage</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Garanti</span>
                    <span className="font-medium text-charcoal">Inkluderet</span>
                  </div>
                </div>

                <Link
                  href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}`}
                  className="mt-6 block rounded-full bg-green-eco py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Book reparation
                </Link>

                <Link
                  href="/kontakt"
                  className="mt-3 block rounded-full border border-soft-grey py-3 text-center text-sm font-semibold text-charcoal transition-colors hover:bg-sand"
                >
                  Kontakt os
                </Link>
              </div>

              {/* Trust badges */}
              <div className="rounded-2xl border border-soft-grey bg-white p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-charcoal">Garanti paa alt</p>
                      <p className="text-xs text-gray">Arbejde og reservedele</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-charcoal">Hurtig service</p>
                      <p className="text-xs text-gray">De fleste reparationer 1-3 hverdage</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-charcoal">Professionelle teknikere</p>
                      <p className="text-xs text-gray">Specialuddannede i {brand.name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rich SEO content */}
      <div className="border-t border-soft-grey bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-charcoal">
            {model.name} Reparation
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-charcoal/70">
            <p>
              Har din {model.name} brug for en reparation? Hos PhoneSpot i {STORE.mall}, {STORE.city},
              tilbyder vi professionel reparation af din {model.name} til faste priser.
              Alle reparationer udfoeres af erfarne teknikere med kvalitetsdele, og du faar
              garanti paa baade arbejde og reservedele.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Specialister i {model.name} reparation
            </h3>
            <p>
              Vores teknikere har stor erfaring med {brand.name} enheder og kender din {model.name}
              indgaaende. Vi bruger kun reservedele der matcher de originale specifikationer,
              saa din enhed fungerer praecis som ny efter reparationen.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Skaermskift, batteriskift og meget mere
            </h3>
            <p>
              Vi tilbyder et bredt udvalg af reparationer til din {model.name}. De mest
              populaere reparationer inkluderer skaermskift, batteriskift og udskiftning af
              opladerstik. Se den fulde prisliste ovenfor for alle tilgaengelige reparationer
              med faste priser.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Konkurrencedygtige priser uden overraskelser
            </h3>
            <p>
              Alle priser er faste og inkluderer moms, reservedele og garanti. Vi oplyser
              altid den endelige pris inden reparationen starter, saa der er ingen
              overraskelser. {cheapest && `Priser paa ${model.name} reparation starter fra ${cheapest} DKK.`}
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Praktisk placering og hurtig service
            </h3>
            <p>
              Du finder os i {STORE.mall}, {STORE.street}, {STORE.zip} {STORE.city}.
              De fleste reparationer af din {model.name} udfoeres inden for 1-3 hverdage.
              Du kan booke tid online eller komme forbi som drop-in i vores aabningstider.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Faa din {model.name} repareret hos PhoneSpot
            </h3>
            <p>
              Hos PhoneSpot kombinerer vi kvalitet, hurtig service og faste priser. Vaelg
              din reparation i prislisten ovenfor og book med det samme, eller kontakt os
              hvis du har spoergsmaal. Vi er altid klar til at hjaelpe dig med din {model.name}.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Ofte stillede spoergsmaal
            </h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Hvor lang tid tager en {model.name} reparation?</strong> De fleste
                reparationer udfoeres inden for 1-3 hverdage. Skaermskift og batteriskift
                kan ofte klares paa 1-2 hverdage.
              </li>
              <li>
                <strong>Faar jeg garanti?</strong> Ja, alle reparationer leveres med garanti
                paa baade arbejde og reservedele.
              </li>
              <li>
                <strong>Mister jeg mine data?</strong> Ved de fleste reparationer bevares
                dine data. Vi anbefaler dog altid at tage backup inden du sender enheden.
              </li>
            </ul>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 rounded-2xl bg-charcoal p-8 text-center text-white">
            <h3 className="font-display text-xl font-bold uppercase">
              Klar til at booke din {model.name} reparation?
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Vaelg din reparation ovenfor eller kontakt os for en gratis vurdering.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}`}
                className="inline-block rounded-full bg-green-eco px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Book reparation
              </Link>
              <Link
                href="/kontakt"
                className="inline-block rounded-full border border-white/30 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-charcoal"
              >
                Kontakt os
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
