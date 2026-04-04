import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES } from "@/lib/store-config";
import { getActiveBrands, getAllModelsWithBrand } from "@/lib/supabase/repairs";
import { BrandPicker } from "../brand-picker";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { TrustpilotStars } from "@/components/trustpilot/trustpilot-stars";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ location: string }> };

export function generateStaticParams() {
  return Object.keys(STORES).map((location) => ({ location }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location } = await params;
  const store = STORES[location];
  if (!store) return {};
  const city = store.city;
  return {
    title: `Reparation af iPhone, iPad, Samsung & Mere i ${city} | PhoneSpot`,
    description: `Professionel reparation i ${city}. Skærmskift, batteriskift og mere på 30 min med livstidsgaranti. Besøg os på ${store.street}, ${store.zip} ${city}.`,
    keywords: `iphone reparation ${city.toLowerCase()}, skærmskift ${city.toLowerCase()}, samsung reparation ${city.toLowerCase()}, telefon reparation ${city.toLowerCase()}`,
    alternates: { canonical: `https://phonespot.dk/reparation/${location}` },
    openGraph: {
      title: `Reparation af iPhone, iPad & Samsung i ${city} | PhoneSpot`,
      description: `Professionel reparation i ${city} med livstidsgaranti. Hurtig service hos PhoneSpot.`,
      url: `https://phonespot.dk/reparation/${location}`,
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// FAQ data (location-aware)
// ---------------------------------------------------------------------------

function getRepairFaq(location: string) {
  const store = STORES[location];
  const city = store.city;
  const locationLabel = store.mall ? `${store.mall}, ${city}` : `${store.street}, ${city}`;

  return [
    {
      question: "Hvad koster en skærmudskiftning?",
      answer:
        "Prisen afhænger af modellen. Vælg dit mærke og model ovenfor for faste priser. Alle skærmskift inkluderer garanti og kvalitetsdele.",
    },
    {
      question: "Hvor lang tid tager en reparation?",
      answer:
        `90% af alle reparationer i ${city} tager kun 30 minutter. Skærmskift, batteriskift og de fleste andre reparationer udføres mens du venter. Vi holder dig opdateret undervejs.`,
    },
    {
      question: "Får jeg garanti på reparationen?",
      answer:
        "Ja — livstidsgaranti på alle reparationer. Hvis den samme fejl opstår igen, reparerer vi uden beregning. Du er dækket.",
    },
    {
      question: "Bruger I originale reservedele?",
      answer:
        "Vi bruger højkvalitets reservedele der matcher de originale specifikationer — korrekt farvegengivelse, touch-respons og fuld funktionalitet.",
    },
    {
      question: "Kan jeg komme forbi uden tidsbestilling?",
      answer:
        `Ja! Vi tilbyder walk-in service på ${locationLabel}. Du kan også booke tid online for at sikre dig en plads.`,
    },
    {
      question: "Mister jeg mine data?",
      answer:
        "Ved de fleste reparationer bevares dine data. Vi anbefaler altid backup inden indsendelse, men data-tab er sjældent ved standard reparationer.",
    },
  ];
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

function getJsonLd(location: string) {
  const store = STORES[location];
  const city = store.city;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    description: `Professionel reparation af smartphones, tablets og bærbare i ${city}. Skærmskift, batteriskift, vandskade og mere med faste priser og garanti.`,
    url: `https://phonespot.dk/reparation/${location}`,
    telephone: store.phone,
    email: store.email,
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
    ],
    priceRange: "$$",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Reparationsservices",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Skærmskift",
          description: "Professionel udskiftning af skærm på smartphones og tablets",
        },
        {
          "@type": "OfferCatalog",
          name: "Batteriskift",
          description: "Udskiftning af batteri med højkapacitets reservedele",
        },
        {
          "@type": "OfferCatalog",
          name: "Vandskade-behandling",
          description: "Professionel rensning og reparation af vandskadede enheder",
        },
      ],
    },
  };

  return localBusiness;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LocationReparationPage({ params }: Props) {
  const { location } = await params;
  const store = STORES[location];
  if (!store) notFound();

  const city = store.city;
  const locationLabel = store.mall ? `${store.mall}, ${city}` : `${store.street}, ${city}`;
  const repairFaq = getRepairFaq(location);

  const [brands, allModels] = await Promise.all([
    getActiveBrands(),
    getAllModelsWithBrand(),
  ]);

  return (
    <>
      <JsonLd data={getJsonLd(location)} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: repairFaq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }} />

      {/* ================================================================= */}
      {/*  SECTION 1: HERO — Workshop background + USP cards                */}
      {/* ================================================================= */}
      <section className="px-4 pt-4 pb-0 md:px-6 md:pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl md:rounded-3xl">
          <Image
            src="/images/lifestyle/workshop.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-green-eco/90 via-green-eco/80 to-green-eco/50" />

          <div className="relative z-10 mx-auto max-w-4xl px-8 py-10 text-center md:py-14">
            <div className="mb-4 inline-flex">
              <Suspense fallback={<div className="text-white/60 text-sm">Indlæser anmeldelser...</div>}>
                <TrustpilotStars />
              </Suspense>
            </div>

            <h1 className="font-display text-3xl font-bold leading-[0.95] tracking-tight text-white sm:text-4xl md:text-5xl">
              Reparation i {city}
              <br />
              <span className="text-white/80">— hurtigt og professionelt</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Professionel reparation af iPhones, iPads, Samsung, MacBooks og mere
              {store.mall ? ` i ${store.mall}` : ""} i {city}. Livstidsgaranti, faste priser og 90% klar på 30 minutter.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a href="#find-din-pris" className="rounded-full border-2 border-white bg-white px-8 py-3.5 text-sm font-bold text-green-eco transition-all hover:bg-white/90">
                Find din pris
              </a>
              <Link href="/reparation/booking" className="rounded-full border-2 border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20">
                Book reparation
              </Link>
            </div>

            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { title: "Livstidsgaranti", desc: "På arbejde & dele" },
                { title: "30 minutter", desc: "90% klar samme dag" },
                { title: "Faste priser", desc: "Inkl. moms & dele" },
                { title: "Walk-in", desc: "Ingen tidsbestilling" },
              ].map(({ title, desc }) => (
                <div key={title} className="rounded-xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-white/60">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SECTION 2: TRUST BADGES — One compact line                       */}
      {/* ================================================================= */}
      <section className="border-b border-[#E5E5EA] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3.5 text-sm sm:gap-x-6">
          {[
            { icon: "shield", label: "Livstidsgaranti" },
            { icon: "clock", label: "90% klar på 30 min" },
            { icon: "tag", label: "Fast pris" },
            { icon: "star", label: "Trustpilot 4.4" },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-[#111111]">
              <span className="flex h-5 w-5 items-center justify-center text-[#1A3D2E]">
                {icon === "shield" && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M8 1l6 2.5v4c0 3.5-2.5 6.5-6 8-3.5-1.5-6-4.5-6-8v-4L8 1z" />
                  </svg>
                )}
                {icon === "clock" && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                  </svg>
                )}
                {icon === "tag" && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M2.5 7.775V2.75a.25.25 0 0 1 .25-.25h2.025a.25.25 0 0 1 .177.073l6.25 6.25a.25.25 0 0 1 0 .354l-2.025 2.025a.25.25 0 0 1-.354 0l-6.25-6.25a.25.25 0 0 1-.073-.177Z" clipRule="evenodd" />
                  </svg>
                )}
                {icon === "star" && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M8 1.63l1.766 4.278 4.584.422-3.48 2.98 1.082 4.471L8 11.49l-3.952 2.291 1.082-4.471-3.48-2.98 4.584-.422L8 1.63z" />
                  </svg>
                )}
              </span>
              <span className="font-medium">{label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SECTION 3: FIND DIN PRIS — Brand + Model selector (MAIN CTA)    */}
      {/* ================================================================= */}
      <section id="find-din-pris" className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <div className="mb-6 max-w-xl">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Find din pris
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
              Hvad skal repareres?
            </h2>
            <p className="mt-2 text-[#86868B]">
              Vælg dit mærke og model for at se faste priser på alle reparationer.
              Alle priser inkluderer moms, reservedele og livstidsgaranti.
            </p>
          </div>

          <BrandPicker brands={brands} models={allModels} basePath={`/reparation/${location}`} />
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SECTION 4: HOW IT WORKS — Simple 3-step                         */}
      {/* ================================================================= */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <div className="mb-10 text-center">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Sådan virker det
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              3 nemme trin
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Vælg reparation",
                desc: "Find dit mærke og model ovenfor, og se faste priser på alle reparationer.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
              },
              {
                step: "2",
                title: "Book tid",
                desc: `Book online eller kom forbi som walk-in i ${city} — ingen tidsbestilling nødvendig.`,
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                ),
              },
              {
                step: "3",
                title: "Få din enhed repareret",
                desc: `90% af reparationer tager kun 30 min. Vent i butikken i ${city} og få din enhed tilbage.`,
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-eco/10 text-[#1A3D2E]">
                  {icon}
                </div>
                <div className="mb-1 font-display text-xs font-bold uppercase tracking-wider text-[#1A3D2E]">
                  Trin {step}
                </div>
                <h3 className="font-display text-lg font-bold text-[#111111]">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#86868B]">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SECTION 5: LOCATION — Store info                                */}
      {/* ================================================================= */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-green-eco">
                Find os
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-charcoal">
                {store.name}
              </h2>
              <p className="mt-4 text-base text-gray">
                {store.mall
                  ? `Vi holder til i ${store.mall} i ${city}, hvor vi tilbyder walk-in reparation uden tidsbestilling. De fleste reparationer tager kun 30 minutter.`
                  : `Vi holder til på ${store.street} i ${city}, hvor vi tilbyder walk-in reparation uden tidsbestilling. De fleste reparationer tager kun 30 minutter.`}
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <circle cx="12" cy="11" r="3" />
                    </svg>
                  </div>
                  <div>
                    {store.mall && <p className="font-bold text-charcoal">{store.mall}</p>}
                    <p className={store.mall ? "text-sm text-gray" : "font-bold text-charcoal"}>{store.street}, {store.zip} {city}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-charcoal">Åbningstider</p>
                    <p className="text-sm text-gray">Hverdage: {store.hours.weekdays}</p>
                    <p className="text-sm text-gray">Lørdag: {store.hours.saturday}</p>
                    <p className="text-sm text-gray">Søndag: {store.hours.sunday}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-charcoal">Kontakt</p>
                    <p className="text-sm text-gray">{store.phone}</p>
                    <p className="text-sm text-gray">{store.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <a
                href={store.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-green-eco px-8 py-3.5 font-display text-sm font-bold tracking-wide text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-[#1A3D2E]/20"
              >
                Se på Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SECTION 6: TRUSTPILOT REVIEWS                                    */}
      {/* ================================================================= */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="mb-8 text-center">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Kundeanmeldelser
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Det siger vores kunder
            </h2>
          </div>
          <Suspense fallback={<div className="py-8 text-center text-[#86868B]">Indlæser anmeldelser...</div>}>
            <TrustpilotReviews />
          </Suspense>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SECTION 7: FAQ                                                   */}
      {/* ================================================================= */}
      <section className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <div className="mb-8 text-center">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              FAQ
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Ofte stillede spørgsmål
            </h2>
          </div>

          <div className="divide-y divide-[#E5E5EA] rounded-2xl border border-[#E5E5EA] bg-white">
            {repairFaq.map((item) => (
              <details key={item.question} className="group px-6 py-5">
                <summary className="flex cursor-pointer items-center justify-between font-display text-base font-bold text-[#111111]">
                  {item.question}
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 shrink-0 text-[#86868B] transition-transform duration-200 group-open:rotate-180"
                  >
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-3 text-base leading-relaxed text-[#86868B]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  BOTTOM CTA                                                       */}
      {/* ================================================================= */}
      <section className="border-t border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center md:py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            Klar til at få din enhed fikset?
          </h2>
          <p className="mt-3 text-[#86868B]">
            Walk-in eller book online — vi er klar til at hjælpe dig {store.mall ? `i ${store.mall}` : `på ${store.street}`}, {city}.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#find-din-pris"
              className="inline-flex items-center gap-2 rounded-full bg-green-eco px-8 py-3.5 font-display text-sm font-bold tracking-wide text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-[#1A3D2E]/20"
            >
              Find din pris
            </a>
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#E5E5EA] px-8 py-3.5 font-display text-sm font-bold tracking-wide text-[#111111] transition-all hover:border-[#111111]/30 hover:bg-[#F7F7F8]"
            >
              Kontakt os
            </Link>
          </div>
          <div className="mt-5 flex justify-center">
            <Suspense fallback={null}>
              <TrustpilotStars />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
