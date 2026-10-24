import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import {
  STORES,
  openingHoursJsonLd,
  type StoreLocationConfig,
} from "@/lib/store-config";

type BesoegSlug = "vejle" | "slagelse";

const PARKING: Record<BesoegSlug, string> = {
  vejle: "Gratis parkering lige ved døren, ca. 1 km fra centrum.",
  slagelse:
    "Gratis parkering ved VestsjællandsCentret, adgang fra Løvegade og Parkvej.",
};

const STOCK_LINKS = [
  { href: "/iphones", title: "iPhones", note: "Med batteritilstand og stand oplyst." },
  { href: "/ipads", title: "iPads", note: "Til skole, arbejde og sofaen." },
  { href: "/baerbare", title: "Bærbare", note: "MacBook og Windows-computere til hverdag og studie." },
];

const TRUST_ITEMS = [
  { title: "36 måneders garanti", text: "På alle enheder." },
  { title: "2 års reklamationsret", text: "På tilbehør." },
  { title: "14 dages fortrydelsesret", text: "Ved køb online." },
  { title: "Delbetaling med Klarna", text: "Ved køb online." },
  { title: "Afhentning i butikken", text: "Bestil online og hent hos os." },
];

function getFaqs(store: StoreLocationConfig, slug: BesoegSlug) {
  const city = store.city;
  return [
    {
      question: `Er der parkering ved ${store.name}?`,
      answer: PARKING[slug],
    },
    {
      question: `Hvad er åbningstiderne i ${city}?`,
      answer: `Vi har åbent mandag til fredag ${store.hours.weekdays}, lørdag ${store.hours.saturday} og søndag ${store.hours.sunday}. Åbningstiderne kan afvige på helligdage.`,
    },
    {
      question: "Kan jeg prøve en enhed, før jeg køber?",
      answer:
        "Ja. Kom forbi og hold enhederne i hånden. Vi hjælper med model, stand og batteri, og du er velkommen uden tidsbestilling.",
    },
    {
      question: "Kan jeg hente min ordre i butikken?",
      answer: `Ja. Vælg afhentning i ${city}, når du bestiller online, og vent på besked om, at ordren er klar.`,
    },
    {
      question: "Kan jeg sælge min gamle telefon i butikken?",
      answer:
        "Ja. Tag enheden med, så vurderer vi den gratis og uforpligtende. Du kan også sende oplysninger om den online på siden Sælg din enhed.",
    },
  ];
}

export function BesoegPage({ slug }: { slug: BesoegSlug }) {
  const store = STORES[slug];
  const url = `https://phonespot.dk/besoeg-${slug}`;
  const faqs = getFaqs(store, slug);
  const tel = store.phone.replace(/\s/g, "");

  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    name: store.name,
    image: "https://phonespot.dk/brand/logo.png",
    url,
    telephone: store.phone,
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
    openingHoursSpecification: openingHoursJsonLd(store.hours),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-[#fafaf8] font-body text-[#242726]">
      <JsonLd data={storeJsonLd} />
      <JsonLd data={faqJsonLd} />

      {/* Hero + besøgsboks */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-10 md:px-8 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="mb-4 text-sm font-semibold text-[#1a3d2e]">
            {store.mall ? `I ${store.mall}` : store.street}, {store.city}
          </p>
          <h1 className="text-[40px] font-bold leading-[1.04] tracking-[-0.045em] md:text-6xl">
            {store.name}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#626a65]">
            Brugte iPhones, iPads og bærbare med 36 måneders garanti. Se dem,
            prøv dem og tag dem med hjem.
          </p>
        </div>

        <aside
          aria-label="Besøg butikken"
          className="rounded-2xl border border-[#dce1db] bg-white p-6 md:p-7"
        >
          <address className="not-italic leading-relaxed">
            <span className="block font-semibold">{store.street}</span>
            {store.zip} {store.city}
          </address>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={store.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1a3d2e] px-5 text-sm font-semibold text-white hover:bg-[#254f3c]"
            >
              Find vej
            </a>
            <a
              href={`tel:${tel}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#dce1db] px-5 text-sm font-semibold hover:border-[#1a3d2e]"
            >
              {store.phone}
            </a>
          </div>
          <dl className="mt-6 text-sm">
            {[
              ["Mandag–fredag", store.hours.weekdays],
              ["Lørdag", store.hours.saturday],
              ["Søndag", store.hours.sunday],
            ].map(([day, time]) => (
              <div
                key={day}
                className="flex justify-between gap-4 border-b border-[#edf0eb] py-2"
              >
                <dt className="text-[#626a65]">{day}</dt>
                <dd className="whitespace-nowrap">{time}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-[#626a65]">
            {PARKING[slug]}
          </p>
        </aside>
      </section>

      {/* Kort + foto */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <iframe
          src={store.googleMapsEmbed}
          title={`Google Maps – ${store.name}`}
          className="h-72 w-full rounded-2xl border border-[#dce1db] lg:h-full lg:min-h-80"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
        {slug === "slagelse" && (
          <Image
            src="/images/store/butik-indvendig.jpg"
            alt="Enheder og tilbehør i PhoneSpots butik"
            width={1000}
            height={650}
            sizes="(max-width: 1024px) 100vw, 400px"
            className="h-72 w-full rounded-2xl object-cover lg:h-full"
          />
        )}
      </section>

      {/* På lager */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 className="text-3xl font-bold tracking-[-0.035em]">
          På lager i butikken
        </h2>
        <p className="mt-3 max-w-xl text-[#626a65]">
          Se udvalget online, og kom forbi for at prøve enhederne.
        </p>
        <ul className="mt-8 divide-y divide-[#dce1db] border-y border-[#dce1db]">
          {STOCK_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex min-h-16 items-baseline justify-between gap-4 py-5"
              >
                <span className="text-xl font-semibold">{item.title}</span>
                <span className="hidden flex-1 text-sm text-[#626a65] sm:block">
                  {item.note}
                </span>
                <span className="text-sm font-semibold text-[#1a3d2e] group-hover:underline">
                  Se udvalget →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Sælg */}
      <section className="bg-[#1a3d2e] py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:px-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2 className="text-3xl font-bold tracking-[-0.035em] md:text-4xl">
            Sælg din gamle enhed
          </h2>
          <div>
            <p className="leading-relaxed text-white/80">
              Tag din gamle telefon, iPad eller computer med i butikken. Vi
              vurderer den gratis og uforpligtende.
            </p>
            <Link
              href="/saelg-din-enhed"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-[#1a3d2e] hover:bg-white/90"
            >
              Få en vurdering
            </Link>
          </div>
        </div>
      </section>

      {/* Tryghed */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 className="text-3xl font-bold tracking-[-0.035em]">Tryghed</h2>
        <dl className="mt-8 grid gap-x-12 md:grid-cols-2">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="border-b border-[#dce1db] py-4">
              <dt className="font-semibold">{item.title}</dt>
              <dd className="text-sm text-[#626a65]">{item.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Tilbehør */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <div className="flex flex-col gap-4 rounded-2xl bg-[#edf2ed] p-7 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.03em]">Tilbehør</h2>
            <p className="mt-1 text-[#626a65]">
              Covers, beskyttelsesglas og opladere til din nye enhed.
            </p>
          </div>
          <Link
            href="/tilbehoer"
            className="inline-flex min-h-11 items-center self-start rounded-lg border border-[#1a3d2e] px-5 text-sm font-semibold text-[#1a3d2e] hover:bg-white md:self-auto"
          >
            Se tilbehør
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 md:px-8">
        <h2 className="mb-6 text-3xl font-bold tracking-[-0.035em]">
          Spørgsmål om butikken
        </h2>
        <FaqAccordion items={faqs} />
      </section>
    </div>
  );
}
