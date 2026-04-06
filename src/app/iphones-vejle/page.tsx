import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "Refurbished iPhones i Vejle — Fra 999 kr | PhoneSpot Vejle",
  description:
    "Køb kvalitetstestede refurbished iPhones i Vejle. Fra 999 kr med 36 mdr garanti. Afhent i butikken eller få leveret. PhoneSpot Vejle, Løversysselvej 3A.",
  alternates: { canonical: "https://phonespot.dk/iphones-vejle" },
  openGraph: {
    title: "Refurbished iPhones i Vejle — Fra 999 kr | PhoneSpot Vejle",
    description:
      "Kvalitetstestede refurbished iPhones fra 999 kr med 36 mdr garanti. Afhent i PhoneSpot Vejle på Løversysselvej 3A.",
    url: "https://phonespot.dk/iphones-vejle",
    type: "website",
  },
};

const store = STORES.vejle;

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: store.name,
  image: "https://phonespot.dk/brand/logo.png",
  url: "https://phonespot.dk/iphones-vejle",
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
    name: "Refurbished iPhones",
    itemListElement: [
      {
        "@type": "OfferCatalog",
        name: "iPhone 13",
        description: "Refurbished iPhone 13 med 36 mdr garanti fra 999 kr",
      },
      {
        "@type": "OfferCatalog",
        name: "iPhone 14",
        description: "Refurbished iPhone 14 med 36 mdr garanti",
      },
      {
        "@type": "OfferCatalog",
        name: "iPhone 15",
        description: "Refurbished iPhone 15 med 36 mdr garanti",
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
      name: "Hvad er en refurbished iPhone?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "En refurbished iPhone er en brugt iPhone der er grundigt testet, renset og i nogle tilfælde repareret, så den fungerer som ny. Alle vores iPhones gennemgår 30+ kvalitetstests inden salg.",
      },
    },
    {
      "@type": "Question",
      name: "Kan jeg hente min refurbished iPhone i Vejle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja! Med vores Click & Collect service kan du bestille online og hente din iPhone i vores butik på Løversysselvej 3A i Vejle. Gratis afhentning — klar samme dag ved bestilling før kl. 14.",
      },
    },
    {
      "@type": "Question",
      name: "Hvilken garanti får jeg på en refurbished iPhone?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alle refurbished iPhones sælges med 36 måneders garanti. Det er tre gange så lang garanti som de fleste andre forhandlere tilbyder.",
      },
    },
    {
      "@type": "Question",
      name: "Hvad koster en refurbished iPhone i Vejle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Priser starter fra 999 kr afhængig af model, lagerkapacitet og stand. Se aktuelle priser og lagerstatus i vores iPhone-katalog.",
      },
    },
  ],
};

const IPHONE_MODELS = [
  {
    model: "iPhone 13",
    description: "5G, A15 Bionic, dobbelt kamera — vores bedst sælgende model.",
    from: "999",
  },
  {
    model: "iPhone 13 Pro",
    description: "ProMotion display, tredobbelt kamera, 120Hz refresh rate.",
    from: "1.299",
  },
  {
    model: "iPhone 14",
    description: "Crashdetektering, forbedret front-kamera, A15 chip.",
    from: "1.499",
  },
  {
    model: "iPhone 14 Pro",
    description: "Dynamic Island, 48MP kamera, Always-On Display.",
    from: "1.999",
  },
  {
    model: "iPhone 15",
    description: "USB-C, A16 Bionic, 48MP kamera og Dynamic Island.",
    from: "2.299",
  },
  {
    model: "iPhone 15 Pro",
    description: "Titanium design, A17 Pro chip, USB 3-hastighed.",
    from: "2.999",
  },
];

const USP_ITEMS = [
  {
    title: "36 mdr. garanti",
    description:
      "Alle vores refurbished iPhones leveres med 36 måneders garanti — tre gange mere end standard.",
  },
  {
    title: "30+ kvalitetstests",
    description:
      "Hver enhed gennemgår minimum 30 kvalitetstests: batteri, skærm, kamera, højtaler, Face ID og mere.",
  },
  {
    title: "Afhent i Vejle",
    description:
      "Bestil online og hent gratis i vores butik på Løversysselvej 3A. Klar samme dag ved bestilling før kl. 14.",
  },
  {
    title: "Prismatch-garanti",
    description:
      "Vi matcher konkurrerende priser på identiske modeller og stand. Find det billigere — vi matcher det.",
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

export default function IphonesVejlePage() {
  return (
    <>
      <JsonLd data={localBusinessJsonLd} />
      <JsonLd data={faqJsonLd} />

      {/* Hero */}
      <section className="bg-[#1A3D2E] py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/60">
            Kvalitetstestet refurbished elektronik
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Refurbished iPhones i Vejle
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Køb en kvalitetstestet refurbished iPhone fra 999 kr med 36
            måneders garanti. Afhent i vores butik i Vejle eller få leveret
            direkte til døren.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/iphones"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Se alle iPhones
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

      {/* iPhone models */}
      <section className="bg-[#F7F7F8] py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Vores udvalg
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111]">
              Populære iPhone-modeller
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-[#6E6E73]">
              Alle modeller er grundigt testet og leveres med 36 mdr. garanti.
              Se det fulde udvalg med aktuelle priser i vores katalog.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {IPHONE_MODELS.map((item) => (
              <div
                key={item.model}
                className="rounded-2xl border border-[#E5E5EA] bg-white p-6"
              >
                <p className="font-display text-base font-bold text-[#111111]">
                  {item.model}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#6E6E73]">
                  {item.description}
                </p>
                <p className="mt-3 text-sm font-semibold text-[#1A3D2E]">
                  Fra {item.from} kr
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/iphones"
              className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg"
            >
              Se alle iPhones med priser
            </Link>
          </div>
        </div>
      </section>

      {/* USP grid */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Hvorfor købe refurbished hos PhoneSpot?
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {USP_ITEMS.map((item) => (
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

      {/* SEO content */}
      <section className="bg-[#F7F7F8] py-16">
        <div className="mx-auto max-w-3xl space-y-10 px-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Køb refurbished iPhone i Vejle
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Hos PhoneSpot Vejle fører vi et bredt udvalg af refurbished
              iPhones i grade A og B — alle grundigt testet, renset og klar til
              brug. Når du køber hos os, medfølger 36 måneders garanti og fuld
              returret. Du kan se og teste enhederne fysisk i vores butik på
              Løversysselvej 3A, inden du beslutter dig.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Click & Collect — bestil online, hent i Vejle
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Med vores Click & Collect service kan du bestille online og hente
              din iPhone gratis i butikken på Løversysselvej 3A. Bestiller du
              inden kl. 14, er ordren klar samme dag. Du har mulighed for at
              teste enheden inden du tager den med.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Hvad betyder refurbished?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Refurbished betyder, at enheden er brugt men professionelt
              restaureret. Alle vores iPhones gennemgår minimum 30
              kvalitetstests, og eventuelle defekter rettes inden salg. Du får
              en enhed der fungerer som ny — til en markant lavere pris end ny.
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
            {[
              {
                question: "Hvad er en refurbished iPhone?",
                answer:
                  "En refurbished iPhone er en brugt iPhone der er grundigt testet, renset og i nogle tilfælde repareret, så den fungerer som ny. Alle vores iPhones gennemgår 30+ kvalitetstests inden salg.",
              },
              {
                question: "Kan jeg hente min refurbished iPhone i Vejle?",
                answer:
                  "Ja! Med vores Click & Collect service kan du bestille online og hente din iPhone i vores butik på Løversysselvej 3A i Vejle. Gratis afhentning — klar samme dag ved bestilling inden kl. 14.",
              },
              {
                question: "Hvilken garanti får jeg?",
                answer:
                  "Alle refurbished iPhones sælges med 36 måneders garanti. Det er tre gange så lang garanti som de fleste andre forhandlere tilbyder.",
              },
              {
                question: "Hvad koster en refurbished iPhone?",
                answer:
                  "Priser starter fra 999 kr afhængig af model, lagerkapacitet og stand. Se aktuelle priser og lagerstatus i vores iPhone-katalog.",
              },
              {
                question: "Kan jeg returnere en refurbished iPhone?",
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
            Find din næste iPhone i Vejle
          </h2>
          <p className="mt-4 text-base text-white/75">
            Se hele udvalget af refurbished iPhones med aktuelle priser og
            lagerstatus. Afhent gratis i butikken på Løversysselvej 3A, Vejle.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/iphones"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Se alle iPhones
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
