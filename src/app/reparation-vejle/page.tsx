import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "iPhone & Samsung Reparation i Vejle — Fra 299 kr | PhoneSpot",
  description:
    "Professionel telefon- og tablet-reparation i Vejle. Skærmskift, batteriskift og mere fra 299 kr. Livstidsgaranti på alle reparationer. PhoneSpot Vejle, Løversysselvej 3B.",
  alternates: { canonical: "https://phonespot.dk/reparation-vejle" },
  openGraph: {
    title: "iPhone & Samsung Reparation i Vejle — Fra 299 kr | PhoneSpot",
    description:
      "Professionel telefon- og tablet-reparation i Vejle fra 299 kr. Livstidsgaranti på alle reparationer. Løversysselvej 3B, 7100 Vejle.",
    url: "https://phonespot.dk/reparation-vejle",
    type: "website",
  },
};

const store = STORES.vejle;

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "ElectronicsRepair",
  name: store.name,
  image: "https://phonespot.dk/brand/logo.png",
  url: "https://phonespot.dk/reparation-vejle",
  telephone: store.phone,
  email: store.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: store.street,
    addressLocality: store.city,
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
      opens: "10:00",
      closes: "17:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "10:00",
      closes: "15:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "10:00",
      closes: "15:00",
    },
  ],
  priceRange: "$$",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Reparationsservices i Vejle",
    itemListElement: [
      {
        "@type": "OfferCatalog",
        name: "Skærmskift",
        description: "Udskiftning af knust eller defekt skærm på iPhone og Samsung",
      },
      {
        "@type": "OfferCatalog",
        name: "Batteriskift",
        description: "Udskiftning af batteri med nedsat kapacitet",
      },
      {
        "@type": "OfferCatalog",
        name: "Opladerstik reparation",
        description: "Reparation af defekte lightning- og USB-C porte",
      },
      {
        "@type": "OfferCatalog",
        name: "Vandskade behandling",
        description: "Professionel rensning og reparation af vandskadede enheder",
      },
    ],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Hvor ligger PhoneSpot Vejle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PhoneSpot Vejle ligger på Løversysselvej 3B, 7100 Vejle. Der er gratis parkering direkte foran butikken.",
      },
    },
    {
      "@type": "Question",
      name: "Kan jeg komme forbi uden tidsbestilling?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja, vi tager imod walk-in reparationer. 90% af alle skærmskift og batteriskift er klar inden for 30 minutter. Du er altid velkommen til at kigge forbi uden forudgående aftale.",
      },
    },
    {
      "@type": "Question",
      name: "Er der parkering ved butikken?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja, der er gratis parkering direkte foran butikken på Løversysselvej 3B. Du kan parkere lige ved siden af indgangen.",
      },
    },
    {
      "@type": "Question",
      name: "Hvad koster iPhone skærmskift i Vejle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Prisen afhænger af iPhone-model. Se aktuelle priser på vores reparationsside — alle priser er faste og inkluderer moms, reservedele og livstidsgaranti.",
      },
    },
    {
      "@type": "Question",
      name: "Hvad er jeres garanti på reparationer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alle reparationer er dækket af livstidsgaranti. Hvis den samme fejl opstår igen, reparerer vi uden beregning.",
      },
    },
  ],
};

const SERVICES = [
  {
    title: "Skærmskift",
    description:
      "Knust eller sort skærm? Vi skifter skærmen på iPhone, Samsung, iPad og andre enheder. 90% klar på 30 minutter.",
  },
  {
    title: "Batteriskift",
    description:
      "Batteri der ikke holder? Vi udskifter batteriet med høj-kapacitets reservedele — enheden føles som ny igen.",
  },
  {
    title: "Opladerstik",
    description:
      "Defekt lightning-port eller USB-C stik? Vi reparerer opladesporte på de fleste smartphone-modeller.",
  },
  {
    title: "Vandskade",
    description:
      "Telefon tabt i vand? Bring den til os hurtigst muligt for professionel rensning og behandling.",
  },
  {
    title: "Kamera",
    description:
      "Slørede billeder eller defekt kamera? Vi reparerer både for- og bagkamera på iPhone og Samsung.",
  },
  {
    title: "Højtaler og mikrofon",
    description:
      "Problemer med lyd? Vi reparerer højtaler, mikrofon og ørestykke på alle større modeller.",
  },
];

const FAQS = [
  {
    question: "Hvor ligger PhoneSpot Vejle?",
    answer:
      "PhoneSpot Vejle ligger på Løversysselvej 3B, 7100 Vejle. Der er gratis parkering direkte foran butikken, og vi er nemt tilgængelige fra hele Vejle-området.",
  },
  {
    question: "Kan jeg komme forbi uden tidsbestilling?",
    answer:
      "Ja, vi tager imod walk-in reparationer. 90% af alle skærmskift og batteriskift er klar inden for 30 minutter. Du er altid velkommen til at kigge forbi uden forudgående aftale.",
  },
  {
    question: "Er der parkering ved butikken?",
    answer:
      "Ja, der er gratis parkering direkte foran butikken på Løversysselvej 3B. Du kan parkere lige ved siden af indgangen — ingen P-afgift.",
  },
  {
    question: "Hvad koster reparation i Vejle?",
    answer:
      "Prisen afhænger af model og type reparation. Se vores fulde prisliste på /reparation. Alle priser er faste og inkluderer moms, reservedele og livstidsgaranti.",
  },
  {
    question: "Hvad er jeres garanti på reparationer?",
    answer:
      "Alle reparationer er dækket af livstidsgaranti. Hvis den samme fejl opstår igen, reparerer vi uden beregning. Det gælder alle reparationer i vores Vejle-butik.",
  },
  {
    question: "Hvilke mærker reparerer I i Vejle?",
    answer:
      "Vi reparerer alle større mærker: Apple (iPhone, iPad, MacBook), Samsung, Huawei, OnePlus, Google Pixel og flere. Se alle mærker og priser på vores reparationsside.",
  },
];

export default function ReparationVejlePage() {
  return (
    <>
      <JsonLd data={localBusinessJsonLd} />
      <JsonLd data={faqJsonLd} />

      {/* Hero */}
      <section className="bg-[#1A3D2E] py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/60">
            Telefon- og tablet-reparation
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Reparation i Vejle
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Professionel iPhone, Samsung og iPad-reparation i Vejle. Fra 299 kr,
            klar på 30 minutter, med livstidsgaranti på alle reparationer.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/reparation"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Se alle priser
            </Link>
            <Link
              href="/reparation/booking"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Book reparation
            </Link>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { title: "Livstidsgaranti", desc: "På arbejde og dele" },
              { title: "30 minutter", desc: "90% klar samme dag" },
              { title: "Fra 299 kr", desc: "Faste priser, inkl. moms" },
              { title: "Walk-in", desc: "Ingen tidsbestilling" },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm"
              >
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-white/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Store info */}
      <section className="border-b border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex gap-4 rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5 text-[#1A3D2E]"
                  aria-hidden="true"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#111111]">Adresse</p>
                <p className="mt-1 text-sm text-[#6E6E73]">{store.street}</p>
                <p className="text-sm text-[#6E6E73]">
                  {store.zip} {store.city}
                </p>
                <a
                  href={store.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-[#1A3D2E] hover:underline"
                >
                  Se på Google Maps
                </a>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5 text-[#1A3D2E]"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#111111]">Åbningstider</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#6E6E73]">Man–Fre</span>
                    <span className="font-medium text-[#111111]">
                      {store.hours.weekdays}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#6E6E73]">Lørdag</span>
                    <span className="font-medium text-[#111111]">
                      {store.hours.saturday}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#6E6E73]">Søndag</span>
                    <span className="font-medium text-[#111111]">
                      {store.hours.sunday}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-5 w-5 text-[#1A3D2E]"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#111111]">Kontakt</p>
                <a
                  href={`tel:${store.phone.replace(/\s/g, "")}`}
                  className="mt-1 block text-sm text-[#1A3D2E] hover:underline"
                >
                  {store.phone}
                </a>
                <a
                  href={`mailto:${store.email}`}
                  className="block text-sm text-[#1A3D2E] hover:underline"
                >
                  {store.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="bg-[#F7F7F8] py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Vores services
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
              Hvad kan vi reparere?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-[#6E6E73]">
              Vi reparerer alle større mærker og modeller. Walk-in service —
              ingen tidsbestilling nødvendig.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <div
                key={service.title}
                className="rounded-2xl border border-[#E5E5EA] bg-white p-6"
              >
                <p className="font-display text-base font-bold text-[#111111]">
                  {service.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]">
                  {service.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/reparation"
              className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg"
            >
              Se alle priser og modeller
            </Link>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Hvorfor vælge PhoneSpot Vejle?
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Livstidsgaranti",
                description:
                  "Alle reparationer er dækket af livstidsgaranti. Opstår den samme fejl igen, reparerer vi uden beregning.",
              },
              {
                title: "Hurtig service",
                description:
                  "90% af alle reparationer er klar på 30 minutter. Du kan vente i butikken og tage enheden med samme dag.",
              },
              {
                title: "Professionelle teknikere",
                description:
                  "Vores teknikere er certificerede og erfarne. Vi bruger høj-kvalitets reservedele der matcher de originale specifikationer.",
              },
              {
                title: "Faste priser",
                description:
                  "Ingen skjulte gebyrer. Prisen er fast og inkluderer moms, reservedele og garanti. Vi oplyser prisen inden reparationen påbegyndes.",
              },
              {
                title: "Walk-in service",
                description:
                  "Ingen tidsbestilling nødvendig. Kig forbi på Løversysselvej 3B i åbningstiden — vi er klar til at hjælpe.",
              },
              {
                title: "Gratis parkering",
                description:
                  "Der er gratis parkering direkte foran butikken. Nemt tilgængeligt fra hele Vejle-området.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#E5E5EA] p-6"
              >
                <p className="font-display text-base font-bold text-[#111111]">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO text */}
      <section className="bg-[#F7F7F8] py-16">
        <div className="mx-auto max-w-3xl space-y-10 px-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              iPhone reparation i Vejle
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Hos PhoneSpot Vejle tilbyder vi professionel iPhone-reparation
              uden forudgående tidsbestilling. Vi skifter skærme, batterier,
              opladesporte og meget mere — og 90% af reparationerne er klar
              inden for 30 minutter. Alle reparationer udføres med
              høj-kvalitets reservedele og er dækket af livstidsgaranti.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Samsung reparation i Vejle
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Vi reparerer alle Samsung Galaxy-modeller inkl. S-serie, A-serie,
              Fold og Flip. Skærmskift og batteriskift udføres mens du venter —
              typisk på under 30 minutter. Se aktuelle priser på vores
              reparationsside.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Sådan finder du os i Vejle
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              PhoneSpot Vejle ligger på Løversysselvej 3B, 7100 Vejle. Vi er
              nemt tilgængelige fra centrum og de omkringliggende bydele, og
              der er gratis parkering direkte foran butikken. Se åbningstider og
              kontaktinformation øverst på siden.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-8 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Ofte stillede spørgsmål
            </h2>
          </div>

          <div className="divide-y divide-[#E5E5EA] rounded-2xl border border-[#E5E5EA] bg-white">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group px-6 py-5">
                <summary className="flex cursor-pointer items-center justify-between font-display text-base font-bold text-[#111111]">
                  {faq.question}
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 shrink-0 text-[#86868B] transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#6E6E73]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A3D2E] py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Klar til at få repareret din enhed?
          </h2>
          <p className="mt-4 text-base text-white/75">
            Book en tid online eller kig forbi som walk-in på Løversysselvej 3B,
            7100 Vejle. Vi er klar til at hjælpe — hurtigt og professionelt.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/reparation/booking"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Book reparation
            </Link>
            <Link
              href="/reparation"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Se alle priser
            </Link>
          </div>
          <p className="mt-8 text-sm text-white/50">
            PhoneSpot Vejle · Løversysselvej 3B · 7100 Vejle ·{" "}
            <a
              href={`tel:${store.phone.replace(/\s/g, "")}`}
              className="hover:text-white/80"
            >
              {store.phone}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
