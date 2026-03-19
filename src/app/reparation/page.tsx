import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { getActiveBrands, getAllModelsWithBrand } from "@/lib/supabase/repairs";
import { BrandPicker } from "./brand-picker";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { TrustpilotStars } from "@/components/trustpilot/trustpilot-stars";

export const revalidate = 3600;

export const metadata: Metadata = {
  title:
    "Reparation af iPhone, iPad, Samsung & Mere | PhoneSpot Slagelse",
  description:
    "Professionel reparation af iPhones, iPads, MacBooks, Samsung og mere i Slagelse. Skærmskift, batteriskift, vandskade og mere. Faste priser, hurtig service og garanti på alle reparationer.",
  keywords:
    "iphone reparation, ipad reparation, samsung reparation, skærmskift, batteriskift, reparation slagelse, macbook reparation, telefon reparation slagelse, reparation vestsjællandscentret",
  alternates: {
    canonical: "https://phonespot.dk/reparation",
  },
  openGraph: {
    title: "Reparation af iPhone, iPad, Samsung & Mere | PhoneSpot Slagelse",
    description:
      "Professionel reparation med kvalitetsdele og garanti. Skærmskift, batteriskift, vandskade og mere. Faste priser og hurtig service i Slagelse.",
    url: "https://phonespot.dk/reparation",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Services data
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    title: "Skærmskift",
    description: "Smadret eller ridset skærm? Vi udskifter med kvalitetsdele der matcher originalen.",
    badge: "Ca. 30 min",
  },
  {
    title: "Batteriskift",
    description: "Holder batteriet ikke? Nyt højkapacitets batteri så din enhed kører som ny.",
    badge: "100% kapacitet",
  },
  {
    title: "Vandskade",
    description: "Fået vand? Jo hurtigere du handler, jo større chance for at redde den.",
    badge: "Akut service",
  },
  {
    title: "Kamera",
    description: "Sløret billede eller defekt autofokus? Vi reparerer front- og bagkamera.",
    badge: "Face ID kompatibel",
  },
  {
    title: "Ladestik & porte",
    description: "Lader din enhed ikke? Vi udskifter Lightning/USB-C porte professionelt.",
    badge: "Lightning & USB-C",
  },
  {
    title: "Øvrige",
    description: "Højttalere, mikrofon, knapper, bagglas — vi diagnosticerer og fikser det meste.",
    badge: "Gratis diagnose",
  },
];

const REPAIR_FAQ = [
  {
    question: "Hvad koster en skærmudskiftning?",
    answer:
      "Prisen afhænger af modellen. Vælg dit mærke og model ovenfor for faste priser. Alle skærmskift inkluderer garanti og kvalitetsdele.",
  },
  {
    question: "Hvor lang tid tager en reparation?",
    answer:
      "90% af alle reparationer tager kun 30 minutter. Skærmskift, batteriskift og de fleste andre reparationer udføres mens du venter. Vi holder dig opdateret undervejs.",
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
      `Ja! Vi tilbyder walk-in service i ${STORE.mall}, ${STORE.city}. Du kan også booke tid online for at sikre dig en plads.`,
  },
  {
    question: "Mister jeg mine data?",
    answer:
      "Ved de fleste reparationer bevares dine data. Vi anbefaler altid backup inden indsendelse, men data-tab er sjældent ved standard reparationer.",
  },
];

// ---------------------------------------------------------------------------
// Guarantee Badge
// ---------------------------------------------------------------------------

function GuaranteeBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "h-14 w-14" : "h-20 w-20";
  const textSize = size === "sm" ? "text-[8px]" : "text-[10px]";
  const innerText = size === "sm" ? "text-[7px]" : "text-[9px]";
  return (
    <div className={`${sizeClasses} relative flex shrink-0 items-center justify-center`}>
      {/* Rotating border */}
      <div className="absolute inset-0 animate-[spin_20s_linear_infinite] rounded-full border-2 border-dashed border-[#1A3D2E]/40" />
      <div className="flex flex-col items-center justify-center rounded-full bg-[#1A3D2E] p-1 text-white"
        style={{ width: "85%", height: "85%" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={size === "sm" ? "h-3 w-3" : "h-4 w-4"}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span className={`${textSize} font-bold uppercase leading-none`}>Livstids</span>
        <span className={`${innerText} uppercase leading-none opacity-80`}>garanti</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

const REPAIR_SERVICE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: STORE.name,
  description:
    "Professionel reparation af smartphones, tablets og bærbare i Slagelse. Skærmskift, batteriskift, vandskade og mere med faste priser og garanti.",
  url: "https://phonespot.dk/reparation",
  telephone: STORE.phone,
  email: STORE.email,
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
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "10:00",
      closes: "16:00",
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReparationPage() {
  const [brands, allModels] = await Promise.all([
    getActiveBrands(),
    getAllModelsWithBrand(),
  ]);

  return (
    <>
      <JsonLd data={REPAIR_SERVICE_JSONLD} />

      {/* ================================================================= */}
      {/*  HERO — Workshop background with green overlay                     */}
      {/* ================================================================= */}
      <section className="px-4 pt-4 pb-0 md:px-6 md:pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl md:rounded-3xl">
          {/* Background image */}
          <Image
            src="/images/lifestyle/workshop.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
            aria-hidden="true"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A3D2E]/90 via-[#1A3D2E]/80 to-[#1A3D2E]/50" />

          <div className="relative z-10 mx-auto max-w-4xl px-8 py-10 text-center md:py-12">
            <div className="mb-4 inline-flex">
              <Suspense fallback={<div className="text-white/60 text-sm">Indlæser anmeldelser...</div>}>
                <TrustpilotStars />
              </Suspense>
            </div>

            <h1 className="font-display text-3xl font-bold leading-[0.95] tracking-tight text-white sm:text-4xl md:text-5xl">
              Reparation i{" "}
              <span className="text-white/90">Slagelse</span>
              <br />
              — hurtigt og professionelt
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Professionel reparation af iPhones, iPads, Samsung, MacBooks og mere i VestsjællandsCentret, Slagelse. Livstidsgaranti, faste priser og 90% klar på 30 minutter.
            </p>

            {/* USP cards */}
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: "shield", title: "Livstidsgaranti", desc: "På arbejde & dele" },
                { icon: "clock", title: "30 minutter", desc: "90% klar samme dag" },
                { icon: "tag", title: "Faste priser", desc: "Inkl. moms & dele" },
                { icon: "walk", title: "Walk-in", desc: "Ingen tidsbestilling" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-white/15 bg-white/10 px-5 py-6 backdrop-blur-sm">
                  <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
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
                    {icon === "walk" && (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                      </svg>
                    )}
                  </span>
                  <p className="font-display text-base font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-white/60">{desc}</p>
                </div>
              ))}
            </div>

            {/* Dual CTA */}
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="#vaelg-maerke"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-display text-sm font-bold tracking-wide text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
              >
                Se priser
              </Link>
              <Link
                href="/reparation/booking"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 font-display text-sm font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Book reparation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  STATS BAR — Social proof strip                                    */}
      {/* ================================================================= */}
      <section className="border-b border-[#E5E5EA] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-5 sm:justify-between sm:gap-8">
          {[
            { value: "1.000+", label: "Reparationer udført" },
            { value: "4.4★", label: "Trustpilot score" },
            { value: "30 min", label: "90% af reparationer" },
            { value: "Livstid", label: "Garanti på alt" },
          ].map(({ value, label }) => (
            <div key={label} className="flex items-center gap-3 text-center sm:text-left">
              <span className="font-display text-xl font-bold text-[#111111]">{value}</span>
              <span className="text-xs text-[#86868B]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/*  BRAND PICKER — Dense grid                                         */}
      {/* ================================================================= */}
      <section id="vaelg-maerke" className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 max-w-xl">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Vælg mærke
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
              Hvad skal repareres?
            </h2>
            <p className="mt-2 text-[#86868B]">
              Find dit mærke og model for at se faste priser på alle reparationer.
              Alle priser inkluderer moms, reservedele og livstidsgaranti.
            </p>
          </div>

          {/* Brand scroll strip */}
          <div className="mb-2 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {[
              { slug: "iphone", name: "iPhone", logo: "/images/brands/apple.svg" },
              { slug: "ipad", name: "iPad", logo: "/images/brands/apple.svg" },
              { slug: "samsung", name: "Samsung", logo: "/images/brands/samsung.svg" },
              { slug: "macbook", name: "MacBook", logo: "/images/brands/apple.svg" },
              { slug: "google-pixel", name: "Google Pixel", logo: "/images/brands/google.svg" },
              { slug: "oneplus", name: "OnePlus", logo: "/images/brands/oneplus.svg" },
              { slug: "huawei", name: "Huawei", logo: "/images/brands/huawei.svg" },
              { slug: "xiaomi", name: "Xiaomi", logo: "/images/brands/xiaomi.svg" },
              { slug: "sony", name: "Sony", logo: "/images/brands/sony.svg" },
            ].map(({ slug, name, logo }) => (
              <Link
                key={slug}
                href={`/reparation/${slug}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E5E5EA] bg-white px-4 py-2 text-sm font-semibold text-[#111111] transition-all hover:border-[#1A3D2E]/40 hover:bg-[#1A3D2E]/5 hover:text-[#1A3D2E]"
              >
                <img src={logo} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
                {name}
              </Link>
            ))}
          </div>

          {/* Popular repairs quick links */}
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#86868B]">Populære reparationer:</span>
            {[
              { label: "Skærmskift iPhone", href: "/reparation/iphone" },
              { label: "Batteriskift iPhone", href: "/reparation/iphone" },
              { label: "Skærmskift Samsung", href: "/reparation/samsung" },
              { label: "iPad Reparation", href: "/reparation/ipad" },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="inline-flex items-center rounded-full border border-[#1A3D2E]/20 bg-[#1A3D2E]/5 px-3 py-1 text-xs font-semibold text-[#1A3D2E] transition-all hover:bg-[#1A3D2E]/10"
              >
                {label}
              </Link>
            ))}
          </div>

          <BrandPicker brands={brands} models={allModels} />
        </div>
      </section>

      {/* ================================================================= */}
      {/*  SERVICES — Visual cards                                           */}
      {/* ================================================================= */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
                Reparationer
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
                Hvad kan vi fikse?
              </h2>
            </div>
            <Link
              href="#book-reparation"
              className="hidden items-center gap-1 text-sm font-semibold text-[#1A3D2E] hover:underline sm:flex"
            >
              Book nu
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <div
                key={service.title}
                className="group rounded-2xl border border-[#E5E5EA] bg-white p-6 transition-all hover:border-[#1A3D2E]/30 hover:shadow-md"
              >
                <span className="mb-4 inline-flex items-center rounded-full bg-[#1A3D2E]/10 px-4 py-1.5 text-sm font-bold text-[#1A3D2E]">
                  {service.badge}
                </span>
                <h3 className="font-display text-lg font-bold text-[#111111]">
                  {service.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-[#86868B]">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  LOCATION — Local SEO for Slagelse                                */}
      {/* ================================================================= */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
                Find os
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
                PhoneSpot Slagelse
              </h2>
              <p className="mt-4 text-base text-[#86868B]">
                Vi holder til i VestsjællandsCentret i Slagelse, hvor vi tilbyder walk-in reparation
                uden tidsbestilling. De fleste reparationer tager kun 30 minutter.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E]/10 text-[#1A3D2E]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <circle cx="12" cy="11" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-[#111111]">{STORE.mall}</p>
                    <p className="text-sm text-[#86868B]">{STORE.street}, {STORE.zip} {STORE.city}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E]/10 text-[#1A3D2E]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-[#111111]">Åbningstider</p>
                    <p className="text-sm text-[#86868B]">Hverdage: {STORE.hours.weekdays}</p>
                    <p className="text-sm text-[#86868B]">Lørdag: {STORE.hours.saturday}</p>
                    <p className="text-sm text-[#86868B]">Søndag: {STORE.hours.sunday}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E]/10 text-[#1A3D2E]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-[#111111]">Kontakt</p>
                    <p className="text-sm text-[#86868B]">{STORE.phone}</p>
                    <p className="text-sm text-[#86868B]">{STORE.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Store photos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 overflow-hidden rounded-2xl">
                <img
                  src="/images/store/vestsjællandscentret.jpg"
                  alt="VestsjællandsCentret i Slagelse — her finder du PhoneSpot"
                  className="h-48 w-full object-cover sm:h-56"
                  loading="lazy"
                />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <img
                  src="/images/store/butik-indvendig.jpg"
                  alt="PhoneSpot butik indvendig — stort udvalg af covers og tilbehør"
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <img
                  src="/images/store/butik-produkter.jpg"
                  alt="Refurbished telefoner i PhoneSpot butikken"
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  WHY PHONESPOT — Image + text split                                */}
      {/* ================================================================= */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — store photos */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                <img
                  src="/images/repair/tekniker-reparerer.jpg"
                  alt="PhoneSpot tekniker reparerer en iPad professionelt"
                  className="h-52 w-full rounded-2xl object-cover"
                  loading="lazy"
                />
                <img
                  src="/images/store/kunde-afhenter.jpg"
                  alt="Kunde afhenter sin reparerede telefon hos PhoneSpot"
                  className="h-52 w-full rounded-2xl object-cover"
                  loading="lazy"
                />
                <img
                  src="/images/store/kunde-afleverer.jpg"
                  alt="Medarbejder modtager en enhed til reparation"
                  className="col-span-2 h-44 w-full rounded-2xl object-cover"
                  loading="lazy"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute bottom-4 left-4 rounded-xl bg-white p-3 shadow-lg sm:bottom-8 sm:left-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3D2E] text-white">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-[#111111]">1.000+</p>
                    <p className="text-xs text-[#86868B]">Glade kunder</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — text content */}
            <div>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
                Derfor PhoneSpot
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
                Din enhed er i sikre hænder
              </h2>

              <div className="mt-8 space-y-6">
                {[
                  {
                    title: "Livstidsgaranti",
                    description:
                      "Alle reparationer leveres med livstidsgaranti på arbejde og reservedele. Ingen tidsbegrænsning, ingen undtagelser.",
                  },
                  {
                    title: "Walk-in service",
                    description:
                      `Kom forbi ${STORE.mall} uden tidsbestilling. Vi vurderer din enhed på stedet — eller book tid online.`,
                  },
                  {
                    title: "90% klar på 30 min",
                    description:
                      "De fleste reparationer udføres mens du venter. Vent i butikken og få din enhed tilbage inden for en halv time.",
                  },
                  {
                    title: "Faste priser",
                    description:
                      "Vi oplyser altid den endelige pris inden vi starter. Alle priser er inkl. moms og reservedele.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E]/10 text-[#1A3D2E]">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-[#111111]">{item.title}</h3>
                      <p className="mt-1 text-sm text-[#86868B]">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <GuaranteeBadge size="md" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  PROCESS — How it works                                            */}
      {/* ================================================================= */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-12 text-center">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Processen
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
              Så enkelt er det
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl gap-0 sm:grid-cols-4">
            {[
              { step: "01", title: "Vælg reparation", desc: "Find dit mærke, model og den reparation du har brug for." },
              { step: "02", title: "Book eller walk-in", desc: "Book tid online eller kom forbi vores butik i Slagelse." },
              { step: "03", title: "Vi reparerer", desc: "90% af reparationer tager kun 30 min — vent i butikken." },
              { step: "04", title: "Hent din enhed", desc: "Test, kvalitetskontrol og afhentning — klar til brug." },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                {/* Connector line */}
                {i < 3 && (
                  <div className="absolute left-1/2 top-6 hidden h-px w-full bg-[#1A3D2E]/20 sm:block" />
                )}
                <div className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A3D2E] text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="font-display text-sm font-bold text-[#111111]">
                  {item.title}
                </h3>
                <p className="mt-1 px-2 text-xs leading-relaxed text-[#86868B]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  FAQ                                                               */}
      {/* ================================================================= */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              FAQ
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
              Ofte stillede spørgsmål
            </h2>
          </div>

          <div className="divide-y divide-[#E5E5EA]">
            {REPAIR_FAQ.map((item) => (
              <details key={item.question} className="group py-5">
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
      {/*  TRUSTPILOT REVIEWS — Real reviews                                 */}
      {/* ================================================================= */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Kundeanmeldelser
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
              Det siger vores kunder
            </h2>
          </div>
          <Suspense fallback={<div className="py-8 text-center text-[#86868B]">Indlæser anmeldelser...</div>}>
            <TrustpilotReviews />
          </Suspense>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  BOOK CTA                                                          */}
      {/* ================================================================= */}
      <section id="book-reparation" className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
            Book reparation
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
            Find din enhed og se priser
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-[#86868B]">
            Vælg dit mærke og model ovenfor for at se faste priser på alle reparationer.
            Tilføj de reparationer du har brug for og book direkte.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="#vaelg-maerke" className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-4 font-display text-sm font-bold tracking-wide text-white transition-all hover:bg-[#1A3D2E]/90 hover:shadow-lg hover:shadow-[#1A3D2E]/20">
              Find din enhed
            </a>
            <Link href="/kontakt" className="inline-flex items-center gap-2 rounded-full border-2 border-[#E5E5EA] px-8 py-4 font-display text-sm font-bold tracking-wide text-[#111111] transition-all hover:border-[#111111]/30 hover:bg-white">
              Kontakt os
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  BOTTOM CTA — Clean light version                                 */}
      {/* ================================================================= */}
      <section className="border-t border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
            Klar til at få din enhed fikset?
          </h2>
          <p className="mt-4 text-[#86868B]">
            Walk-in eller book online — vi er klar til at hjælpe dig i VestsjællandsCentret, Slagelse.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="#vaelg-maerke"
              className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-4 font-display text-sm font-bold tracking-wide text-white transition-all hover:bg-[#1A3D2E]/90 hover:shadow-lg hover:shadow-[#1A3D2E]/20"
            >
              Find din enhed
            </Link>
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#E5E5EA] px-8 py-4 font-display text-sm font-bold tracking-wide text-[#111111] transition-all hover:border-[#111111]/30 hover:bg-[#F7F7F8]"
            >
              Kontakt os
            </Link>
          </div>
          <div className="mt-6 flex justify-center">
            <Suspense fallback={null}>
              <TrustpilotStars />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
