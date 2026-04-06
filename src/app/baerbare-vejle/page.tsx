import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "Refurbished Bærbare i Vejle — Fra 1.999 kr | PhoneSpot Vejle",
  description:
    "Køb kvalitetstestede refurbished bærbare computere i Vejle. Fra 1.999 kr med 36 mdr garanti. Afhent i butikken eller få leveret. PhoneSpot Vejle, Løversysselvej 3A.",
  alternates: { canonical: "https://phonespot.dk/baerbare-vejle" },
  openGraph: {
    title: "Refurbished Bærbare i Vejle — Fra 1.999 kr | PhoneSpot Vejle",
    description:
      "Kvalitetstestede refurbished laptops fra 1.999 kr med 36 mdr garanti. Afhent i PhoneSpot Vejle på Løversysselvej 3A.",
    url: "https://phonespot.dk/baerbare-vejle",
    type: "website",
  },
};

const store = STORES.vejle;

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: store.name,
  image: "https://phonespot.dk/brand/logo.png",
  url: "https://phonespot.dk/baerbare-vejle",
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
    name: "Refurbished bærbare computere",
    itemListElement: [
      {
        "@type": "OfferCatalog",
        name: "MacBook Air",
        description: "Refurbished MacBook Air med 36 mdr garanti",
      },
      {
        "@type": "OfferCatalog",
        name: "MacBook Pro",
        description: "Refurbished MacBook Pro med 36 mdr garanti",
      },
      {
        "@type": "OfferCatalog",
        name: "Lenovo ThinkPad",
        description: "Refurbished Lenovo ThinkPad og IdeaPad med 36 mdr garanti",
      },
      {
        "@type": "OfferCatalog",
        name: "HP EliteBook",
        description: "Refurbished HP bærbare med 36 mdr garanti",
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
      name: "Kan jeg hente en refurbished laptop i Vejle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja! Med vores Click & Collect service kan du bestille online og hente din laptop gratis i vores butik på Løversysselvej 3A i Vejle. Klar samme dag ved bestilling inden kl. 14.",
      },
    },
    {
      "@type": "Question",
      name: "Hvilken garanti får jeg på en refurbished laptop?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alle refurbished bærbare sælges med 36 måneders garanti. Det er tre gange så lang garanti som de fleste andre forhandlere tilbyder.",
      },
    },
    {
      "@type": "Question",
      name: "Hvad koster en refurbished laptop i Vejle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Priser starter fra 1.999 kr afhængig af mærke, model og specifikationer. Se aktuelle priser og lagerstatus i vores laptop-katalog.",
      },
    },
    {
      "@type": "Question",
      name: "Hvilke mærker fører I?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Vi fører et bredt udvalg af refurbished laptops fra Apple (MacBook), Lenovo, HP og Dell. Alle modeller er grundigt testet inden salg.",
      },
    },
  ],
};

const LAPTOP_MODELS = [
  {
    brand: "MacBook Air",
    description:
      "Tynd, let og stilfuld. Ideel til studerende og professionelle der prioriterer portabilitet.",
    from: "2.999",
    href: "/baerbare/apple",
  },
  {
    brand: "MacBook Pro",
    description:
      "Kraftfuld performance til krævende opgaver. M1, M2 og M3 chip-varianter på lager.",
    from: "4.999",
    href: "/baerbare/apple",
  },
  {
    brand: "Lenovo ThinkPad",
    description:
      "Robuste business-laptops med fantastisk tastatur og lang batterilevetid.",
    from: "1.999",
    href: "/baerbare/lenovo",
  },
  {
    brand: "HP EliteBook",
    description:
      "Driftssikre HP-laptops designet til professionelt brug. Let at arbejde med hele dagen.",
    from: "2.299",
    href: "/baerbare/hp",
  },
  {
    brand: "Dell Latitude",
    description:
      "Pålidelige Dell business-laptops med god performance og solid bygge-kvalitet.",
    from: "2.199",
    href: "/baerbare",
  },
  {
    brand: "Studiecomputer",
    description:
      "Prisniveauvenlige laptops der klarer alt hvad en studerende har brug for.",
    from: "1.999",
    href: "/baerbare/studiecomputer",
  },
];

const USP_ITEMS = [
  {
    title: "36 mdr. garanti",
    description:
      "Alle vores refurbished laptops leveres med 36 måneders garanti — tre gange mere end standard.",
  },
  {
    title: "Grundigt testet",
    description:
      "Hver enhed gennemgår minimum 30 kvalitetstests: batteri, skærm, tastatur, porte, køling og mere.",
  },
  {
    title: "Afhent i Vejle",
    description:
      "Bestil online og hent gratis i vores butik på Løversysselvej 3A. Klar samme dag ved bestilling inden kl. 14.",
  },
  {
    title: "Op til 70% billigere",
    description:
      "En refurbished laptop koster typisk 40–70% less end en tilsvarende ny model — med samme ydeevne.",
  },
  {
    title: "Klarna delbetaling",
    description:
      "Del betalingen op i 3 måneder rentefrit med Klarna. Ingen skjulte gebyrer.",
  },
  {
    title: "30 dages returret",
    description:
      "Fortryder du dit køb, returnerer du blot enheden inden for 30 dage mod fuld refundering.",
  },
];

export default function BaerbareVejlePage() {
  return (
    <>
      <JsonLd data={localBusinessJsonLd} />
      <JsonLd data={faqJsonLd} />

      {/* Hero */}
      <section className="bg-[#1A3D2E] py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/60">
            Kvalitetstestede refurbished computere
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Refurbished Bærbare i Vejle
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Køb en kvalitetstestet refurbished laptop fra 1.999 kr med 36
            måneders garanti. Afhent i vores butik i Vejle eller få leveret
            direkte til døren.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/baerbare"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Se alle bærbare
            </Link>
            <Link
              href="/butik/vejle"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Om butikken i Vejle
            </Link>
          </div>
        </div>
      </section>

      {/* Store info strip */}
      <section className="border-b border-[#E5E5EA] bg-white py-6">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#6E6E73]">
            <span className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-[#1A3D2E]"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>
                <strong className="text-[#111111]">Butik:</strong> {store.street}, {store.zip} {store.city}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-[#1A3D2E]"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                <strong className="text-[#111111]">Man–Fre:</strong>{" "}
                {store.hours.weekdays}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-[#1A3D2E]"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                <strong className="text-[#111111]">Lør–Søn:</strong>{" "}
                {store.hours.saturday}
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Laptop brands */}
      <section className="bg-[#F7F7F8] py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Vores udvalg
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
              Populære laptop-mærker og modeller
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-[#6E6E73]">
              Alle modeller er grundigt testet og leveres med 36 mdr. garanti.
              Se det fulde udvalg med aktuelle priser i vores katalog.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LAPTOP_MODELS.map((item) => (
              <Link
                key={item.brand}
                href={item.href}
                className="group rounded-2xl border border-[#E5E5EA] bg-white p-6 transition-all hover:border-[#1A3D2E]/30 hover:shadow-md"
              >
                <p className="font-display text-base font-bold text-[#111111]">
                  {item.brand}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#6E6E73]">
                  {item.description}
                </p>
                <p className="mt-3 text-sm font-semibold text-[#1A3D2E]">
                  Fra {item.from} kr
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1A3D2E] transition-transform group-hover:translate-x-0.5">
                  Se udvalg &rarr;
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/baerbare"
              className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg"
            >
              Se alle bærbare med priser
            </Link>
          </div>
        </div>
      </section>

      {/* Click & Collect */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="overflow-hidden rounded-2xl border-2 border-[#1A3D2E]/20 bg-[#EFF5F1] p-8 md:p-10">
            <div className="mb-8 text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
                Click &amp; Collect — hent i Vejle
              </h2>
              <p className="mt-2 text-base text-[#6E6E73]">
                Bestil online, hent gratis i butikken. Klar samme dag ved
                bestilling inden kl. 14.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Bestil online",
                  desc: "Find din laptop og bestil til Click & Collect",
                },
                {
                  step: "2",
                  title: "Modtag bekræftelse",
                  desc: "Vi klargør din ordre og sender besked",
                },
                {
                  step: "3",
                  title: "Hent i Vejle",
                  desc: "Afhent på Løversysselvej 3A — test inden du tager den med",
                },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3D2E] text-sm font-bold text-white">
                    {s.step}
                  </span>
                  <p className="mt-3 font-display text-sm font-bold text-[#111111]">
                    {s.title}
                  </p>
                  <p className="mt-1 text-xs text-[#6E6E73]">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/baerbare"
                className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg"
              >
                Se laptops og bestil &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* USP grid */}
      <section className="bg-[#F7F7F8] py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Hvorfor købe refurbished laptop hos PhoneSpot?
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {USP_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#E5E5EA] bg-white p-6"
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

      {/* SEO content */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl space-y-10 px-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Køb refurbished laptop i Vejle
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Hos PhoneSpot Vejle fører vi et bredt udvalg af refurbished
              bærbare computere fra Apple, Lenovo, HP og Dell. Alle enheder er
              grundigt testet, renset og klar til brug. Når du køber hos os,
              medfølger 36 måneders garanti og fuld returret. Du kan se og teste
              computerne fysisk i vores butik på Løversysselvej 3A, inden du
              beslutter dig.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Refurbished MacBook i Vejle
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Vi fører et bredt udvalg af refurbished MacBooks — MacBook Air og
              MacBook Pro i forskellige generationer. En refurbished MacBook fra
              PhoneSpot er typisk 40–60% billigere end ny, og du får den med 36
              måneders garanti. Se hele udvalget og aktuelle priser i vores
              katalog.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Studiecomputer i Vejle
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Er du studerende og leder efter en pålidelig computer til en
              rimelig pris? Vores udvalg af studiecomputere starter fra 1.999
              kr og inkluderer modeller fra Lenovo, HP og Dell der er ideelle
              til studielivet. Alle leveres med 36 mdr. garanti.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F7F7F8] py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-8 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Ofte stillede spørgsmål
            </h2>
          </div>

          <div className="divide-y divide-[#E5E5EA] rounded-2xl border border-[#E5E5EA] bg-white">
            {[
              {
                question: "Kan jeg hente en refurbished laptop i Vejle?",
                answer:
                  "Ja! Med vores Click & Collect service kan du bestille online og hente din laptop gratis i vores butik på Løversysselvej 3A i Vejle. Klar samme dag ved bestilling inden kl. 14.",
              },
              {
                question: "Hvilken garanti får jeg på en refurbished laptop?",
                answer:
                  "Alle refurbished bærbare sælges med 36 måneders garanti. Det er tre gange så lang garanti som de fleste andre forhandlere tilbyder.",
              },
              {
                question: "Hvad koster en refurbished laptop i Vejle?",
                answer:
                  "Priser starter fra 1.999 kr afhængig af mærke, model og specifikationer. Se aktuelle priser og lagerstatus i vores laptop-katalog.",
              },
              {
                question: "Hvilke mærker fører I?",
                answer:
                  "Vi fører et bredt udvalg af refurbished laptops fra Apple (MacBook), Lenovo, HP og Dell. Alle modeller er grundigt testet inden salg.",
              },
              {
                question: "Kan jeg returnere en refurbished laptop?",
                answer:
                  "Ja, du har 30 dages fuld returret. Er du ikke tilfreds af en hvilken som helst årsag, returnerer du enheden og får pengene tilbage.",
              },
            ].map((faq) => (
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
            Find din næste laptop i Vejle
          </h2>
          <p className="mt-4 text-base text-white/75">
            Se hele udvalget af refurbished bærbare computere med aktuelle
            priser og lagerstatus. Afhent gratis i butikken på Løversysselvej
            3A, Vejle.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/baerbare"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Se alle bærbare
            </Link>
            <Link
              href="/butik/vejle"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Om butikken
            </Link>
          </div>
          <p className="mt-8 text-sm text-white/50">
            PhoneSpot Vejle · Løversysselvej 3A · 7100 Vejle ·{" "}
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
