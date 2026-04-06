import type { Metadata } from "next";
import Link from "next/link";
import { STORES } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "B2B Reservedele — Engros-priser til værksteder og forhandlere | PhoneSpot",
  description:
    "Køb reservedele til iPhone, Samsung og alle enheder til engros-priser. Skærme, batterier, bagcovers og mere med garanti. Hurtig levering i hele Danmark. Afhentning i Vejle.",
  alternates: { canonical: "https://phonespot.dk/b2b" },
};

const vejle = STORES.vejle;

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const USP_CARDS = [
  {
    title: "Spot-priser",
    body: "Konkurrencedygtige engros-priser. Mængderabat for faste kunder.",
    iconPath:
      "M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z",
  },
  {
    title: "Top kvalitet",
    body: "Service Pack, Original, Soft OLED, Hard OLED og In-Cell. Alle kvalitetsniveauer.",
    iconPath:
      "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
  },
  {
    title: "Garanti",
    body: "Op til 2 års garanti på skærme. 3 mdr på batterier. Hurtig RMA-process.",
    iconPath:
      "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
  {
    title: "Hurtig levering",
    body: "Levering i hele Danmark. Afhentning same-day i Vejle.",
    iconPath:
      "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12",
  },
];

const CATEGORIES = [
  { label: "Skærme (alle kvaliteter)", href: "/reservedele?category=skaerme" },
  { label: "Batterier", href: "/reservedele?category=batterier" },
  { label: "Bagcovers & Frames", href: "/reservedele?category=bagcovers" },
  { label: "Opladningsstik", href: "/reservedele?category=opladningsstik" },
  { label: "Kameraer & linser", href: "/reservedele?category=kameraer" },
  { label: "Flex-kabler & IC", href: "/reservedele?category=flex-kabler" },
  { label: "Højttalere & mikrofoner", href: "/reservedele?category=hoejttaler" },
  { label: "Og 20+ flere kategorier", href: "/reservedele" },
];

const QUALITY_TIERS = [
  {
    name: "Service Pack",
    description:
      "Original fra producenten. Leveres i producentens originale emballage med alle komponenter.",
    badge: "Bedst",
  },
  {
    name: "Original (Pulled)",
    description: "Autentisk original-del udtaget fra en brugt enhed. Testet og funktionsdygtig.",
    badge: null,
  },
  {
    name: "Premium Soft OLED",
    description:
      "Levende farver og fleksibelt display. Samme visuelle kvalitet som OEM til en lavere pris.",
    badge: null,
  },
  {
    name: "Premium Hard OLED",
    description:
      "Skarp og robust OLED. Hærdet glasflade, optimal til professionelle reparationer.",
    badge: null,
  },
  {
    name: "Refurbished",
    description:
      "Original skærm med nyt frontglas. God pris uden at gå på kompromis med OLED-kvaliteten.",
    badge: null,
  },
  {
    name: "Standard In-Cell",
    description:
      "Budgetvenlig LCD-skærm til volumenreparationer. Solid ydeevne til lavere pris.",
    badge: "Budgetvenlig",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Registrer dig",
    body: "Opret en gratis B2B-konto med CVR-nummer. Tager under 2 minutter.",
  },
  {
    number: "2",
    title: "Godkendelse",
    body: "Vi verificerer din virksomhed inden for 24 timer og aktiverer din adgang.",
  },
  {
    number: "3",
    title: "Bestil",
    body: "Se engros-priser og bestil direkte fra vores katalog. Betal online eller på net15/net30.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Hvem kan blive B2B-kunde?",
    a: "Alle virksomheder med et gyldigt CVR-nummer. Det gælder reparationsværksteder, telefonforhandlere, IT-virksomheder og andre erhvervskunder.",
  },
  {
    q: "Hvad er jeres minimumordre?",
    a: "Der er ingen minimumordre. Du bestiller præcis det du har brug for — fra ét styk til store volumenordrer.",
  },
  {
    q: "Hvilke betalingsbetingelser tilbyder I?",
    a: "Vi tilbyder forudbetaling ved bestilling, samt net15 og net30 for godkendte erhvervskunder med fast handelsforhold.",
  },
  {
    q: "Hvor hurtigt leverer I?",
    a: "Afhentning same-day i Vejle på ordrer modtaget inden kl. 14:00 på hverdage. Levering til resten af Danmark på 1–2 hverdage.",
  },
  {
    q: "Hvad er jeres returpolitik?",
    a: "Op til 2 års garanti på skærme, 3 måneder på batterier. Vi har en hurtig og smidig RMA-process — kontakt b2b@phonespot.dk.",
  },
];

/* ------------------------------------------------------------------ */
/*  JSON-LD — fully static, no user input, safe to render             */
/* ------------------------------------------------------------------ */

// All values are sourced from the static STORES config object.
// No user-supplied data is interpolated, so XSS is not a concern here.
function buildJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": "https://phonespot.dk/#vejle",
        name: "PhoneSpot Vejle — B2B Reservedele",
        url: "https://phonespot.dk/b2b",
        telephone: vejle.phone,
        email: "b2b@phonespot.dk",
        address: {
          "@type": "PostalAddress",
          streetAddress: vejle.street,
          addressLocality: vejle.city,
          postalCode: vejle.zip,
          addressCountry: vejle.countryCode,
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
            dayOfWeek: ["Saturday", "Sunday"],
            opens: "10:00",
            closes: "15:00",
          },
        ],
        geo: {
          "@type": "GeoCoordinates",
          latitude: vejle.coordinates.lat,
          longitude: vejle.coordinates.lng,
        },
      },
      {
        "@type": "Product",
        name: "B2B Reservedele til iPhone og Samsung",
        description:
          "Engros-reservedele til professionelle reparationsværksteder og forhandlere. Skærme, batterier, bagcovers og mere.",
        brand: { "@type": "Brand", name: "PhoneSpot" },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "DKK",
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "PhoneSpot ApS" },
        },
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function B2BLandingPage() {
  return (
    <>
      {/* JSON-LD structured data — static config values only, no user input */}
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLd() }} />

      <main>
        {/* ---------------------------------------------------------- */}
        {/* Hero                                                        */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-[#F7F7F8] px-4 py-20 text-center lg:py-28">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#1A3D2E]">
              B2B / Forhandler
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-[#111111] lg:text-5xl">
              Reservedele til professionelle
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[#86868B] leading-relaxed">
              Engros-priser på skærme, batterier og reservedele til alle enheder. Garanti, hurtig
              levering og afhentning i Vejle.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/b2b/registrer"
                className="rounded-full bg-[#1A3D2E] px-8 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Bliv forhandler
              </Link>
              <Link
                href="/reservedele"
                className="rounded-full border border-[#D1D1D6] bg-white px-8 py-3.5 text-sm font-bold text-[#111111] transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
              >
                Se sortiment
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* USP cards                                                   */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {USP_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-[#E5E5EA] p-6 transition-shadow hover:shadow-sm"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A3D2E]/10 text-[#1A3D2E]">
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="h-6 w-6"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.iconPath} />
                    </svg>
                  </div>
                  <h3 className="mb-2 font-display text-base font-bold text-[#111111]">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#86868B]">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Kategorier                                                  */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-[#F7F7F8] px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold text-[#111111]">
                Kategorier vi fører
              </h2>
              <p className="mt-3 text-[#86868B]">
                Fra skærme til flex-kabler — vi dækker hele reparationssortimentet.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="group flex items-center justify-between rounded-xl border border-[#E5E5EA] bg-white px-5 py-4 transition-colors hover:border-[#1A3D2E]/30"
                >
                  <span className="text-sm font-semibold text-[#111111] transition-colors group-hover:text-[#1A3D2E]">
                    {cat.label}
                  </span>
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4 text-[#86868B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1A3D2E]"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/reservedele"
                className="text-sm font-semibold text-[#1A3D2E] underline-offset-2 hover:underline"
              >
                Vis hele kataloget
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Kvalitetsniveauer                                           */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold text-[#111111]">Kvalitetsniveauer</h2>
              <p className="mt-3 text-[#86868B]">
                Vi fører alle kvalitetsniveauer så du kan vælge den rette løsning til din kunde.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {QUALITY_TIERS.map((tier) => (
                <div key={tier.name} className="relative rounded-2xl border border-[#E5E5EA] p-6">
                  {tier.badge && (
                    <span className="absolute right-4 top-4 rounded-full bg-[#1A3D2E] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {tier.badge}
                    </span>
                  )}
                  <h3 className="mb-2 font-display text-base font-bold text-[#111111]">
                    {tier.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#86868B]">{tier.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Hvordan det virker                                          */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-[#F7F7F8] px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold text-[#111111]">
                Sådan kommer du i gang
              </h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.number} className="relative flex flex-col items-center text-center">
                  {i < STEPS.length - 1 && (
                    <div className="absolute left-[calc(50%+2.5rem)] top-5 hidden h-px w-[calc(100%-5rem)] bg-[#E5E5EA] sm:block" />
                  )}
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3D2E] text-sm font-bold text-white">
                    {step.number}
                  </div>
                  <h3 className="mb-2 font-display text-base font-bold text-[#111111]">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#86868B]">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Vejle afhentning                                            */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-2xl border border-[#E5E5EA]">
              <div className="grid lg:grid-cols-2">
                {/* Content */}
                <div className="p-8 lg:p-10">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#1A3D2E]">
                    Lager i Vejle
                  </p>
                  <h2 className="mb-4 font-display text-3xl font-bold text-[#111111]">
                    Afhent i Vejle — same day
                  </h2>
                  <p className="mb-6 leading-relaxed text-[#86868B]">
                    Bestil online inden kl. 14:00 på hverdage og hent din ordre samme dag. Ingen
                    ventetid, ingen forsendelse.
                  </p>

                  <dl className="space-y-3 text-sm">
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 font-semibold text-[#111111]">Adresse</dt>
                      <dd className="text-[#86868B]">
                        {vejle.street}, {vejle.zip} {vejle.city}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 font-semibold text-[#111111]">Hverdage</dt>
                      <dd className="text-[#86868B]">{vejle.hours.weekdays}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 font-semibold text-[#111111]">Lørdag</dt>
                      <dd className="text-[#86868B]">{vejle.hours.saturday}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 font-semibold text-[#111111]">Søndag</dt>
                      <dd className="text-[#86868B]">{vejle.hours.sunday}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 font-semibold text-[#111111]">Telefon</dt>
                      <dd>
                        <a
                          href={`tel:${vejle.phone.replace(/\s/g, "")}`}
                          className="text-[#1A3D2E] underline-offset-2 hover:underline"
                        >
                          {vejle.phone}
                        </a>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-8">
                    <a
                      href={vejle.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-[#D1D1D6] px-6 py-2.5 text-sm font-semibold text-[#111111] transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
                    >
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                        />
                      </svg>
                      Se på Google Maps
                    </a>
                  </div>
                </div>

                {/* Map embed */}
                <div className="min-h-[280px] bg-[#F7F7F8] lg:min-h-0">
                  <iframe
                    src={vejle.googleMapsEmbed}
                    title="PhoneSpot Vejle på kort"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "280px" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="block h-full w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* FAQ                                                         */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-[#F7F7F8] px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold text-[#111111]">
                Ofte stillede spørgsmål
              </h2>
            </div>
            <dl className="divide-y divide-[#E5E5EA] overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="px-6 py-5">
                  <dt className="text-sm font-semibold text-[#111111]">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[#86868B]">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Final CTA                                                   */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-[#1A3D2E] px-4 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-white lg:text-4xl">
              Klar til at komme i gang?
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Opret din gratis B2B-konto og få adgang til engros-priser inden for 24 timer.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/b2b/registrer"
                className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#1A3D2E] transition-opacity hover:opacity-90"
              >
                Registrer dig gratis
              </Link>
              <a
                href="mailto:b2b@phonespot.dk"
                className="rounded-full border border-white/30 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Skriv til b2b@phonespot.dk
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
