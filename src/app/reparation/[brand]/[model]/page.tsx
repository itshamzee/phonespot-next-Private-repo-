import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { DeviceImage } from "@/components/repair/device-image";
import { ServiceInfoTooltip } from "@/components/repair/service-info-tooltip";
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
    description: `${model.name} reparation i Slagelse. Skærmskift, batteriskift og mere fra ${cheapest?.price_dkk ?? ""} DKK. Livstidsgaranti på alle reparationer. Hurtig service hos PhoneSpot.`,
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
  "vibrator": "vibrator",
  "diagnostik": "diagnostic",
  "vandskade": "water",
  "software-fejl": "software",
  "tastatur": "keyboard",
  "topcase": "topcase",
  "blaeser": "fan",
  "termisk-pasta": "thermal",
  "hdmi-port": "hdmi",
  "controller-reparation": "controller",
};

function ServiceIcon({ type }: { type: string }) {
  const icon = SERVICE_ICONS[type] ?? "wrench";

  const icons: Record<string, React.ReactNode> = {
    screen: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="5" y1="18" x2="19" y2="18" />
      </svg>
    ),
    battery: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <rect x="2" y="7" width="18" height="10" rx="2" />
        <path d="M22 11v2" />
      </svg>
    ),
    charging: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M12 2v6M12 16v6" />
        <rect x="6" y="8" width="12" height="8" rx="2" />
      </svg>
    ),
    camera: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    glass: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M5 6l14 12M9 2l10 16" strokeOpacity="0.4" />
      </svg>
    ),
    speaker: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M15.54 8.46a5 5 0 010 7.07" />
      </svg>
    ),
    mic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
    button: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
      </svg>
    ),
    diagnostic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
        <path d="M14 9l-2 2 4 4" />
      </svg>
    ),
    water: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
      </svg>
    ),
    keyboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8" />
      </svg>
    ),
    hdmi: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M4 7h16v10H4z" />
        <path d="M7 17v3M17 17v3M2 7l2-3h16l2 3" />
      </svg>
    ),
    fan: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 9c0-3-2-6-6-6 0 4 2 6 6 6zM15 12c3 0 6-2 6-6-4 0-6 2-6 6zM12 15c0 3 2 6 6 6 0-4-2-6-6-6zM9 12c-3 0-6 2-6 6 4 0 6-2 6-6z" />
      </svg>
    ),
    thermal: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M14 4v10.54a4 4 0 11-4 0V4a2 2 0 014 0z" />
      </svg>
    ),
    vibrator: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M5 8l2-2 10 10-2 2z" />
        <path d="M19 4l1 1-2 2-1-1zM3 20l1 1 2-2-1-1z" strokeOpacity="0.5" />
      </svg>
    ),
    software: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    ),
    topcase: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M4 5h16a1 1 0 011 1v10H3V6a1 1 0 011-1z" />
        <path d="M2 17h20l-1 3H3l-1-3z" />
        <rect x="8" y="9" width="8" height="4" rx="1" strokeOpacity="0.4" />
      </svg>
    ),
    controller: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" />
        <rect x="2" y="6" width="20" height="12" rx="4" />
      </svg>
    ),
    wrench: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  };

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-eco/10 text-green-eco">
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
  const mostExpensive = paidServices.length > 0
    ? Math.max(...paidServices.map(s => s.price_dkk))
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

      {/* ================================================================= */}
      {/*  HERO HEADER                                                       */}
      {/* ================================================================= */}
      <section className="relative bg-charcoal">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-green-eco/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-14">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-1.5 text-white/40">
              <li><Link href="/reparation" className="hover:text-white/70">Reparation</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href={`/reparation/${brand.slug}`} className="hover:text-white/70">{brand.name}</Link></li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-white">{model.name}</li>
            </ol>
          </nav>

          <div className="flex items-center gap-6">
            {/* Device image */}
            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/5 md:flex">
              <DeviceImage
                brandSlug={brand.slug}
                deviceType={brand.device_type}
                imageUrl={model.image_url}
                modelName={model.name}
                className="h-14 w-14 object-contain drop-shadow-lg"
              />
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight text-white md:text-4xl">
                {model.name} <span className="text-green-eco">Reparation</span>
              </h1>
              <p className="mt-3 max-w-lg text-white/60">
                Se priser på alle {model.name} reparationer herunder. Alle priser er inkl. moms,
                reservedele og livstidsgaranti.
              </p>

              {/* Quick stats */}
              <div className="mt-4 flex flex-wrap gap-4">
                {cheapest && (
                  <span className="rounded-full bg-green-eco/20 px-4 py-1.5 text-sm font-bold text-green-eco">
                    Fra {cheapest} DKK
                  </span>
                )}
                <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/70">
                  {totalServices} reparationer
                </span>
                <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/70">
                  Livstidsgaranti
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  MAIN CONTENT — Two columns                                        */}
      {/* ================================================================= */}
      <section className="bg-warm-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

            {/* Left column — price table */}
            <div>
              {/* Section header */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold uppercase tracking-[2px] text-charcoal/50">
                  Prisliste
                </h2>
                <span className="text-xs text-gray">Alle priser inkl. moms</span>
              </div>

              {/* Service list */}
              <div className="space-y-2">
                {services.length === 0 && (
                  <div className="rounded-2xl border border-soft-grey bg-white p-10 text-center text-gray">
                    Ingen reparationer tilgængelige for denne model endnu.
                  </div>
                )}

                {services.map((service) => (
                  <div
                    key={service.id}
                    className="group flex items-center gap-4 rounded-xl border border-soft-grey bg-white p-4 transition-all hover:border-green-eco/30 hover:shadow-sm"
                  >
                    <ServiceIcon type={service.slug} />

                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold text-charcoal">
                        <span className="flex items-center">
                          {service.name}
                          <ServiceInfoTooltip info={service} />
                        </span>
                      </p>
                      {service.estimated_minutes && (
                        <p className="text-xs text-gray">
                          ca. {service.estimated_minutes} min
                        </p>
                      )}
                    </div>

                    <span className="whitespace-nowrap font-display text-sm font-bold text-charcoal">
                      {service.price_dkk === 0 ? "Gratis" : `${service.price_dkk} DKK`}
                    </span>

                    <Link
                      href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}&service=${service.slug}`}
                      className="hidden rounded-full bg-green-eco px-5 py-2 text-xs font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-md hover:shadow-green-eco/20 sm:inline-block"
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
                  className="flex items-center justify-center gap-2 rounded-full bg-green-eco py-4 font-display text-sm font-bold uppercase text-white transition-opacity hover:opacity-90"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                  </svg>
                  Book {model.name} reparation
                </Link>
              </div>

              {/* Upsell banner */}
              <div className="mt-6 flex items-center gap-4 rounded-xl border-2 border-dashed border-green-eco/30 bg-green-eco/[0.03] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-charcoal">Tilføj panserglas for kun 99 DKK</p>
                  <p className="text-xs text-gray">Beskyt din nye skærm — tilføjes automatisk ved booking.</p>
                </div>
              </div>
            </div>

            {/* Right column — sticky sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-8 space-y-4">
                {/* Overview card */}
                <div className="rounded-2xl border border-soft-grey bg-white p-6">
                  <h2 className="font-display text-base font-bold text-charcoal">Oversigt</h2>

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
                        <span className="text-gray">Priser</span>
                        <span className="font-bold text-green-eco">
                          {cheapest}{mostExpensive && cheapest !== mostExpensive ? ` – ${mostExpensive}` : ""} DKK
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray">Leveringstid</span>
                      <span className="font-medium text-charcoal">Ca. 30 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray">Garanti</span>
                      <span className="font-bold text-green-eco">Livstidsgaranti</span>
                    </div>
                  </div>

                  <Link
                    href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}`}
                    className="mt-6 flex items-center justify-center gap-2 rounded-full bg-green-eco py-3 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                    </svg>
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
                <div className="rounded-2xl border border-soft-grey bg-white p-5">
                  <div className="space-y-4">
                    {[
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M9 12l2 2 4-4" />
                          </svg>
                        ),
                        title: "Livstidsgaranti",
                        desc: "På alle reparationer",
                      },
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        ),
                        title: "Hurtig service",
                        desc: "90% klar på kun 30 minutter",
                      },
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                            <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <circle cx="12" cy="11" r="3" />
                          </svg>
                        ),
                        title: "Walk-in service",
                        desc: `${STORE.mall}, ${STORE.city}`,
                      },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-charcoal">{item.title}</p>
                          <p className="text-xs text-gray">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trustpilot mini */}
                <div className="rounded-2xl border border-soft-grey bg-white p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4 fill-[#00b67a]">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-charcoal">4.8</span>
                    <span className="text-xs text-gray">på Trustpilot</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  RICH SEO CONTENT                                                  */}
      {/* ================================================================= */}
      <section className="border-t border-soft-grey bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-charcoal">
            {model.name} Reparation
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-charcoal/70">
            <p>
              Har din {model.name} brug for en reparation? Hos PhoneSpot i {STORE.mall}, {STORE.city},
              tilbyder vi professionel reparation af din {model.name} til faste priser.
              Alle reparationer udføres af erfarne teknikere med kvalitetsdele, og du får
              livstidsgaranti på både arbejde og reservedele.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Specialister i {model.name} reparation
            </h3>
            <p>
              Vores teknikere har stor erfaring med {brand.name} enheder og kender din {model.name}
              indgående. Vi bruger kun reservedele der matcher de originale specifikationer,
              så din enhed fungerer præcis som ny efter reparationen.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Skærmskift, batteriskift og meget mere
            </h3>
            <p>
              Vi tilbyder et bredt udvalg af reparationer til din {model.name}. De mest
              populære reparationer inkluderer skærmskift, batteriskift og udskiftning af
              opladerstik. Se den fulde prisliste ovenfor for alle tilgængelige reparationer
              med faste priser.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Livstidsgaranti på alle reparationer
            </h3>
            <p>
              Alle {model.name} reparationer fra PhoneSpot dækkes af vores livstidsgaranti.
              Det betyder at hvis den samme fejl opstår igen — uanset hvornår — reparerer
              vi enheden uden beregning. {cheapest && `Priser på ${model.name} reparation starter fra ${cheapest} DKK.`}
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Walk-in service eller book online
            </h3>
            <p>
              Du finder os i {STORE.mall}, {STORE.street}, {STORE.zip} {STORE.city}.
              90% af alle {model.name} reparationer tager kun 30 minutter.
              Du kan komme forbi som walk-in eller booke tid online.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-charcoal">
              Ofte stillede spørgsmål
            </h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Hvor lang tid tager en {model.name} reparation?</strong> De fleste
                reparationer tager kun 30 minutter. Du kan vente i butikken mens vi
                fikser din enhed.
              </li>
              <li>
                <strong>Får jeg garanti?</strong> Ja, livstidsgaranti på alle reparationer —
                både arbejde og reservedele.
              </li>
              <li>
                <strong>Mister jeg mine data?</strong> Ved de fleste reparationer bevares
                dine data. Vi anbefaler dog altid at tage backup inden du sender enheden.
              </li>
            </ul>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 overflow-hidden rounded-2xl bg-charcoal p-8 text-center text-white">
            <h3 className="font-display text-xl font-bold uppercase">
              Klar til at booke din {model.name} reparation?
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Vælg din reparation ovenfor eller kontakt os for en gratis vurdering.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-green-eco px-8 py-3 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25"
              >
                Book reparation
              </Link>
              <Link
                href="/kontakt"
                className="inline-block rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
              >
                Kontakt os
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
