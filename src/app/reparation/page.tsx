import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { getActiveBrands, getAllModelsWithBrand } from "@/lib/supabase/repairs";
import type { RepairBrand } from "@/lib/supabase/types";
import { BrandPicker } from "./brand-picker";
import { RepairForm } from "./repair-form";

export const revalidate = 3600;

export const metadata: Metadata = {
  title:
    "Reparation af iPhone, iPad, Samsung & Mere | PhoneSpot Slagelse",
  description:
    "Professionel reparation af iPhones, iPads, MacBooks, Samsung og mere i Slagelse. Skærmskift, batteriskift, vandskade og mere. Faste priser, hurtig service og garanti på alle reparationer.",
  keywords:
    "iphone reparation, ipad reparation, samsung reparation, skærmskift, batteriskift, reparation slagelse, macbook reparation, telefon reparation slagelse",
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
// Constants
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Services data
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    title: "Skærmskift",
    description: "Smadret eller ridset skærm? Vi udskifter med kvalitetsdele der matcher originalen.",
    badge: "Ca. 30 min",
    image: "/images/repair/cracked-screen.png",
  },
  {
    title: "Batteriskift",
    description: "Holder batteriet ikke? Nyt højkapacitets batteri så din enhed kører som ny.",
    badge: "100% kapacitet",
    image: "/images/repair/battery-swap.png",
  },
  {
    title: "Vandskade",
    description: "Fået vand? Jo hurtigere du handler, jo større chance for at redde den.",
    badge: "Akut service",
    image: "/images/repair/water-damage.png",
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
// Brand Picker
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Trustpilot Badge
// ---------------------------------------------------------------------------

function TrustpilotBadge({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const textColor = variant === "dark" ? "text-white" : "text-charcoal";
  const subColor = variant === "dark" ? "text-white/60" : "text-gray";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg key={i} viewBox="0 0 24 24" className="h-5 w-5 fill-[#00b67a]">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-bold leading-tight ${textColor}`}>4.8 / 5</span>
        <span className={`text-[10px] leading-tight ${subColor}`}>Trustpilot</span>
      </div>
    </div>
  );
}

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
      <div className="absolute inset-0 animate-[spin_20s_linear_infinite] rounded-full border-2 border-dashed border-green-eco/40" />
      <div className="flex flex-col items-center justify-center rounded-full bg-green-eco p-1 text-white"
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
      {/*  HERO — Full-width atmospheric header                              */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden bg-charcoal">
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />
        {/* Accent glows */}
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-eco/[0.06] blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
          <div className="mb-6 inline-flex">
            <TrustpilotBadge variant="dark" />
          </div>

          <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl">
            Vi fikser din{" "}
            <span className="text-green-eco">enhed</span>
            <br />
            hurtigt og professionelt
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
            Smadret skærm? Dårligt batteri? Vandskade? PhoneSpot reparerer alle
            mærker med livstidsgaranti og faste priser. Ingen overraskelser.
          </p>

          {/* USP cards */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: "shield", title: "Livstidsgaranti", desc: "På arbejde & dele" },
              { icon: "clock", title: "30 minutter", desc: "90% klar samme dag" },
              { icon: "tag", title: "Faste priser", desc: "Inkl. moms & dele" },
              { icon: "walk", title: "Walk-in", desc: "Ingen tidsbestilling" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-5 backdrop-blur-sm">
                <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-eco/15 text-green-eco">
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
                <p className="font-display text-sm font-bold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-white/50">{desc}</p>
              </div>
            ))}
          </div>

          {/* Dual CTA */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="#book-reparation"
              className="inline-flex items-center gap-2 rounded-full bg-green-eco px-8 py-4 font-display text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25"
            >
              Book reparation
            </Link>
            <Link
              href="#vaelg-maerke"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 px-8 py-4 font-display text-sm font-bold uppercase tracking-wide text-white transition-all hover:border-white/50 hover:bg-white/5"
            >
              Se priser
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  STATS BAR — Social proof strip                                    */}
      {/* ================================================================= */}
      <section className="border-b border-soft-grey bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-5 sm:justify-between sm:gap-8">
          {[
            { value: "5.000+", label: "Reparationer udført" },
            { value: "4.8★", label: "Trustpilot score" },
            { value: "30 min", label: "90% af reparationer" },
            { value: "Livstid", label: "Garanti på alt" },
          ].map(({ value, label }) => (
            <div key={label} className="flex items-center gap-3 text-center sm:text-left">
              <span className="font-display text-xl font-bold text-charcoal">{value}</span>
              <span className="text-xs text-gray">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/*  BRAND PICKER — Dense grid                                         */}
      {/* ================================================================= */}
      <section id="vaelg-maerke" className="bg-warm-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 max-w-xl">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-[3px] text-green-eco">
              Vælg mærke
            </p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal">
              Hvad skal repareres?
            </h2>
            <p className="mt-3 text-gray">
              Find dit mærke og model for at se faste priser på alle reparationer.
              Alle priser inkluderer moms, reservedele og livstidsgaranti.
            </p>
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
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-[3px] text-green-eco">
                Reparationer
              </p>
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal">
                Hvad kan vi fikse?
              </h2>
            </div>
            <Link
              href="#book-reparation"
              className="hidden items-center gap-1 text-sm font-semibold text-green-eco hover:underline sm:flex"
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
                className="group relative overflow-hidden rounded-2xl border border-soft-grey bg-white transition-all hover:border-green-eco/40 hover:shadow-md"
              >
                {/* Service image */}
                {service.image && (
                  <div className="relative h-40 overflow-hidden bg-charcoal/5">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-green-eco px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                      {service.badge}
                    </span>
                  </div>
                )}

                <div className="p-5">
                  {!service.image && (
                    <span className="mb-3 inline-block rounded-full bg-green-eco/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-green-eco">
                      {service.badge}
                    </span>
                  )}
                  <h3 className="font-display text-lg font-bold text-charcoal">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  WHY PHONESPOT — Image + text split                                */}
      {/* ================================================================= */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — happy customer image */}
            <div className="relative">
              {/* IMAGE: happy-customer.png — smiling person holding repaired phone, no background */}
              <img
                src="/images/repair/happy-customer.png"
                alt="Glad kunde med repareret telefon"
                className="mx-auto h-auto max-h-[450px] w-auto object-contain"
              />
              {/* Floating badge */}
              <div className="absolute bottom-4 left-4 rounded-xl bg-white p-3 shadow-lg sm:bottom-8 sm:left-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-eco text-white">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-charcoal">5.000+</p>
                    <p className="text-xs text-gray">Glade kunder</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — text content */}
            <div>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-[3px] text-green-eco">
                Derfor PhoneSpot
              </p>
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal">
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-charcoal">{item.title}</h3>
                      <p className="mt-1 text-sm text-gray">{item.description}</p>
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
      <section className="bg-warm-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-12 text-center">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-[3px] text-green-eco">
              Processen
            </p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal">
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
                  <div className="absolute left-1/2 top-6 hidden h-px w-full bg-green-eco/20 sm:block" />
                )}
                <div className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="font-display text-sm font-bold text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-1 px-2 text-xs leading-relaxed text-gray">
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
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-[3px] text-green-eco">
              FAQ
            </p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal">
              Ofte stillede spørgsmål
            </h2>
          </div>

          <div className="divide-y divide-soft-grey">
            {REPAIR_FAQ.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between font-display text-base font-bold text-charcoal">
                  {item.question}
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 shrink-0 text-gray transition-transform duration-200 group-open:rotate-180"
                  >
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  BOOKING FORM                                                      */}
      {/* ================================================================= */}
      <section id="book-reparation" className="bg-warm-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
            {/* Left — form */}
            <div>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-[3px] text-green-eco">
                Book reparation
              </p>
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal">
                Send en reparationsanmodning
              </h2>
              <p className="mt-3 mb-8 text-gray">
                Udfyld formularen, og vi vender tilbage med et tilbud inden for
                få timer. Gratis diagnostik og ingen forpligtelse.
              </p>
              <RepairForm />
            </div>

            {/* Right — info sidebar */}
            <div className="hidden space-y-6 lg:block">
              {/* Walk-in card */}
              <div className="rounded-2xl border border-soft-grey bg-white p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <circle cx="12" cy="11" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-charcoal">Walk-in service</p>
                    <p className="text-xs text-gray">Ingen tidsbestilling nødvendig</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-charcoal">
                  <p className="font-medium">{STORE.mall}</p>
                  <p className="text-gray">{STORE.street}, {STORE.zip} {STORE.city}</p>
                  <div className="mt-3 space-y-1 border-t border-soft-grey pt-3 text-xs text-gray">
                    <p>Hverdage: {STORE.hours.weekdays}</p>
                    <p>Lørdag: {STORE.hours.saturday}</p>
                    <p>Søndag: {STORE.hours.sunday}</p>
                  </div>
                </div>
              </div>

              {/* Guarantee card */}
              <div className="rounded-2xl border border-soft-grey bg-white p-6">
                <div className="flex items-center gap-4">
                  <GuaranteeBadge size="sm" />
                  <div>
                    <p className="font-display text-sm font-bold text-charcoal">
                      Livstidsgaranti
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray">
                      Alle reparationer fra PhoneSpot dækkes af livstidsgaranti
                      på arbejde og reservedele.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trustpilot card */}
              <div className="rounded-2xl border border-soft-grey bg-white p-6">
                <TrustpilotBadge variant="light" />
                <p className="mt-3 text-xs italic text-gray">
                  &ldquo;Super hurtig service og fair priser. Min iPhone blev
                  fikset på under en time. Kan varmt anbefales!&rdquo;
                </p>
                <p className="mt-2 text-xs font-medium text-charcoal">
                  — Marie K., Slagelse
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  BOTTOM CTA                                                        */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden bg-charcoal text-white">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
            Klar til at få din enhed fikset?
          </h2>
          <p className="mt-4 text-white/60">
            Walk-in eller book online — vi er klar til at hjælpe dig i {STORE.mall}, {STORE.city}.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="#book-reparation"
              className="inline-flex items-center gap-2 rounded-full bg-green-eco px-8 py-4 font-display text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25"
            >
              Book reparation
            </Link>
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 px-8 py-4 font-display text-sm font-bold uppercase tracking-wide text-white transition-all hover:border-white/50 hover:bg-white/5"
            >
              Kontakt os
            </Link>
          </div>
          <div className="mt-6">
            <TrustpilotBadge variant="dark" />
          </div>
        </div>
      </section>
    </>
  );
}
