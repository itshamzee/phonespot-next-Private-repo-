import type { Metadata } from "next";
import Image from "next/image";
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
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: "30+", label: "Reservedels-kategorier" },
  { value: "168+", label: "Enhedsmodeller" },
  { value: "6", label: "Kvalitetsniveauer" },
  { value: "24t", label: "Levering i DK" },
];

const CATEGORIES = [
  { name: "Skærme", desc: "OLED, LCD, In-Cell — alle kvaliteter", slug: "skaerme", icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" },
  { name: "Batterier", desc: "OEM og original — alle mærker", slug: "batterier", icon: "M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z" },
  { name: "Bagcovers", desc: "Frames og bagsider i alle farver", slug: "bagcovers", icon: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12" },
  { name: "Opladningsstik", desc: "Charge connectors og flex", slug: "opladningsstik", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  { name: "Kameraer", desc: "Moduler og linser", slug: "kameraer", icon: "M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" },
  { name: "Flex-kabler", desc: "Alle typer til alle modeller", slug: "flex-kabler", icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" },
];

const QUALITY_TIERS = [
  { name: "Service Pack", warranty: "24 mdr", color: "#1A3D2E", desc: "Original fra producenten i certificeret emballage", tag: "Bedst" },
  { name: "Original (Pulled)", warranty: "24 mdr", color: "#2D5A3D", desc: "Autentisk del fra brugt enhed — testet og inspiceret", tag: null },
  { name: "Premium Soft OLED", warranty: "18 mdr", color: "#0071E3", desc: "Levende farver, fleksibelt substrat, præcis touch", tag: "Populær" },
  { name: "Premium Hard OLED", warranty: "18 mdr", color: "#5856D6", desc: "Skarp billedkvalitet, robust glassubstrat", tag: null },
  { name: "Refurbished", warranty: "12 mdr", color: "#4A7C5B", desc: "Original skærm med nyt frontglas", tag: null },
  { name: "Standard In-Cell", warranty: "12 mdr", color: "#86868B", desc: "Budgetvenlig LCD til volumenreparationer", tag: "Budget" },
];

const FAQ_ITEMS = [
  { q: "Hvem kan blive B2B-kunde?", a: "Alle virksomheder med et gyldigt CVR-nummer — reparationsværksteder, telefonforhandlere, IT-virksomheder og andre erhvervskunder." },
  { q: "Hvad er jeres minimumordre?", a: "Ingen minimumordre. Bestil fra ét styk til store volumenordrer." },
  { q: "Hvilke betalingsbetingelser tilbyder I?", a: "Forudbetaling, net15 og net30 for godkendte erhvervskunder med fast handelsforhold." },
  { q: "Hvor hurtigt leverer I?", a: "Same-day afhentning i Vejle på ordrer inden kl. 14. Levering til resten af Danmark på 1-2 hverdage." },
  { q: "Hvad er jeres garanti?", a: "Op til 2 års garanti på skærme, 3 mdr på batterier. Hurtig RMA-process via b2b@phonespot.dk." },
];

/* ------------------------------------------------------------------ */
/*  JSON-LD                                                            */
/* ------------------------------------------------------------------ */

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
        address: { "@type": "PostalAddress", streetAddress: vejle.street, addressLocality: vejle.city, postalCode: vejle.zip, addressCountry: vejle.countryCode },
        geo: { "@type": "GeoCoordinates", latitude: vejle.coordinates.lat, longitude: vejle.coordinates.lng },
      },
      {
        "@type": "Product",
        name: "B2B Reservedele til iPhone og Samsung",
        description: "Engros-reservedele til professionelle reparationsværksteder og forhandlere.",
        brand: { "@type": "Brand", name: "PhoneSpot" },
        offers: { "@type": "AggregateOffer", priceCurrency: "DKK", availability: "https://schema.org/InStock" },
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function B2BLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLd() }} />

      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-[#1A3D2E]">
          {/* Background image */}
          <Image
            src="/images/b2b/spare-parts-hero.jpg"
            alt=""
            fill
            priority
            className="object-cover opacity-40"
            sizes="100vw"
            aria-hidden="true"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A3D2E]/60 via-[#1A3D2E]/70 to-[#1A3D2E]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:px-8">
            <div className="max-w-2xl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                B2B Portal
              </span>

              <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Reservedele til<br />
                <span className="text-white/60">professionelle</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
                Engros-priser på skærme, batterier og reservedele til alle enheder.
                Op til 2 års garanti. Levering i hele Danmark.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/b2b/registrer"
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#1A3D2E] shadow-lg shadow-black/10 transition-all hover:bg-white/95 hover:shadow-xl"
                >
                  Bliv forhandler
                </Link>
                <Link
                  href="/reservedele"
                  className="rounded-full border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Se sortiment
                </Link>
              </div>
            </div>

            {/* Stats bar */}
            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 md:mt-20">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
                  <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">{s.value}</p>
                  <p className="mt-1 text-xs font-medium text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT WE CARRY — visual category grid ── */}
        <section className="bg-white px-4 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#1A3D2E]">Sortiment</p>
              <h2 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
                Alt til reparationen
              </h2>
              <p className="mt-3 text-base text-[#86868B]">
                Over 30 kategorier. Fra premium OLED-skærme til flex-kabler og klæbebånd.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/reservedele/${cat.slug}`}
                  className="group flex items-start gap-4 rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-6 transition-all hover:border-[#1A3D2E]/25 hover:bg-white hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/8 text-[#1A3D2E] transition-colors group-hover:bg-[#1A3D2E] group-hover:text-white">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-[#111111] group-hover:text-[#1A3D2E]">
                      {cat.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-[#86868B]">{cat.desc}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/reservedele" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A3D2E] hover:underline">
                Se alle 30+ kategorier
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── QUALITY TIERS — visual cards ── */}
        <section className="bg-[#F7F7F8] px-4 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#1A3D2E]">Kvalitet</p>
              <h2 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
                Vælg den rette kvalitet
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-base text-[#86868B]">
                6 kvalitetsniveauer fra fabriksoriginal Service Pack til budgetvenlig In-Cell.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUALITY_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="relative overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white p-6 transition-shadow hover:shadow-md"
                >
                  {/* Color accent line */}
                  <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tier.color }} />

                  {tier.tag && (
                    <span
                      className="mb-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: tier.color }}
                    >
                      {tier.tag}
                    </span>
                  )}

                  <h3 className="font-display text-lg font-bold text-[#111111]">{tier.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#86868B]">{tier.desc}</p>

                  <div className="mt-4 flex items-center gap-2">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-[#1A3D2E]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span className="text-xs font-semibold text-[#1A3D2E]">{tier.warranty} garanti</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS — visual steps ── */}
        <section className="bg-white px-4 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#1A3D2E]">Kom i gang</p>
              <h2 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
                3 trin til engros-priser
              </h2>
            </div>

            <div className="relative grid gap-8 sm:grid-cols-3">
              {/* Connecting line */}
              <div className="absolute left-[16.67%] right-[16.67%] top-8 hidden h-px bg-gradient-to-r from-[#1A3D2E]/20 via-[#1A3D2E]/10 to-[#1A3D2E]/20 sm:block" />

              {[
                { n: "1", title: "Registrer", body: "Opret gratis B2B-konto med CVR. Tager under 2 minutter.", icon: "M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" },
                { n: "2", title: "Godkendelse", body: "Vi verificerer din virksomhed inden for 24 timer.", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { n: "3", title: "Bestil", body: "Se engros-priser og bestil direkte. Betal online eller på kredit.", icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" },
              ].map((step) => (
                <div key={step.n} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A3D2E] text-white shadow-lg shadow-[#1A3D2E]/20">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                    </svg>
                  </div>
                  <h3 className="mb-2 font-display text-lg font-bold text-[#111111]">{step.title}</h3>
                  <p className="max-w-xs text-sm leading-relaxed text-[#86868B]">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/b2b/registrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-[#1A3D2E]/15 transition-all hover:shadow-lg"
              >
                Opret gratis B2B-konto
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── VEJLE PICKUP — with image ── */}
        <section className="bg-[#F7F7F8] px-4 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-3xl border border-[#E5E5EA] bg-white shadow-sm">
              <div className="grid lg:grid-cols-2">
                <div className="p-8 md:p-12 lg:p-14">
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#1A3D2E]/8 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#1A3D2E]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1A3D2E]" />
                    Same-day afhentning
                  </span>

                  <h2 className="mt-4 font-display text-3xl font-bold text-[#111111]">
                    Afhent i Vejle
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-[#86868B]">
                    Bestil online inden kl. 14 og hent din ordre samme dag. Ingen ventetid, ingen forsendelsesomkostninger.
                  </p>

                  <dl className="mt-8 space-y-3 text-sm">
                    {[
                      ["Adresse", `${vejle.street}, ${vejle.zip} ${vejle.city}`],
                      ["Hverdage", vejle.hours.weekdays],
                      ["Weekend", `${vejle.hours.saturday} (lør) / ${vejle.hours.sunday} (søn)`],
                      ["Telefon", vejle.phone],
                      ["Email", "b2b@phonespot.dk"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex gap-3">
                        <dt className="w-20 shrink-0 font-semibold text-[#111111]">{label}</dt>
                        <dd className="text-[#86868B]">{val}</dd>
                      </div>
                    ))}
                  </dl>

                  <a
                    href={vejle.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#E5E5EA] px-5 py-2.5 text-sm font-semibold text-[#111111] transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    Google Maps
                  </a>
                </div>

                <div className="min-h-[320px] bg-[#F7F7F8] lg:min-h-0">
                  <iframe
                    src={vejle.googleMapsEmbed}
                    title="PhoneSpot Vejle"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "320px" }}
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

        {/* ── FAQ ── */}
        <section className="bg-white px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold text-[#111111]">Ofte stillede spørgsmål</h2>
            </div>
            <div className="divide-y divide-[#E5E5EA] rounded-2xl border border-[#E5E5EA]">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm font-semibold text-[#111111]">
                    {item.q}
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 shrink-0 text-[#86868B] transition-transform group-open:rotate-180">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed text-[#86868B]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="relative overflow-hidden bg-[#1A3D2E] px-4 py-20 text-center md:py-24">
          {/* Subtle pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-white lg:text-4xl">
              Klar til engros-priser?
            </h2>
            <p className="mt-4 text-lg text-white/60">
              Opret din gratis B2B-konto og få adgang inden for 24 timer.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/b2b/registrer"
                className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#1A3D2E] shadow-lg shadow-black/15 transition-all hover:shadow-xl"
              >
                Registrer dig gratis
              </Link>
              <a
                href="mailto:b2b@phonespot.dk"
                className="rounded-full border border-white/25 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                b2b@phonespot.dk
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
