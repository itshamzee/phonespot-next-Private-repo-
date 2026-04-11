import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { ShopTabs } from "@/components/home/shop-tabs";
import { Bestsellers } from "@/components/home/bestsellers";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

// Featured categories — big cards (top row)
const FEATURED_CATEGORIES = [
  {
    name: "Bærbare",
    subtitle: "MacBook, ThinkPad, EliteBook",
    href: "/baerbare",
    tagline: "Fra 1.999 kr",
    image: "/images/products/thinkpad-clean.webp",
    badge: "Populær",
  },
  {
    name: "Tilbehør & Lyd",
    subtitle: "Covers, kabler, høretelefoner",
    href: "/tilbehoer",
    tagline: "Fra 49 kr",
    image: "/images/products/tilbehoer-case.webp",
    badge: null,
  },
  {
    name: "Smartwatches",
    subtitle: "Apple Watch & Galaxy Watch",
    href: "/smartwatches",
    tagline: "Fra 999 kr",
    image: "/images/products/apple-watch.png",
    badge: null,
  },
] as const;

// Secondary categories — smaller cards (bottom row)
const SECONDARY_CATEGORIES = [
  {
    name: "iPhones",
    href: "/iphones",
    tagline: "Fra 1.499 kr",
    image: "/images/products/iphone-lineup.jpg",
    taglineClass: "text-green-eco",
  },
  {
    name: "iPads",
    href: "/ipads",
    tagline: "Fra 1.499 kr",
    image: "/images/products/ipad-air-new.png",
    taglineClass: "text-green-eco",
  },
  {
    name: "Reparation",
    href: "/reparation",
    tagline: "Book tid",
    image: "/images/products/iphone-repair.png",
    taglineClass: "text-green-eco",
  },
  {
    name: "Restsalg",
    href: "/restsalg",
    tagline: "Ekstra tilbud",
    image: "/images/products/iphone-hero.jpg",
    taglineClass: "text-red-500",
  },
] as const;

const USP_BAR = [
  {
    label: "Spar op til 40%",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: "30+ kvalitetstests",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    label: "36 mdr. garanti",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "80% mindre CO\u2082",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M2 22c1.25-1.25 2.5-2 4-2 3 0 3 3 6 3s3-3 6-3c1.5 0 2.75.75 4 2" />
        <path d="M12 2v10" />
        <path d="m17 7-5-5-5 5" />
      </svg>
    ),
  },
];

const HOME_FAQ = [
  {
    question: "Hvad betyder refurbished?",
    answer:
      "Refurbished betyder, at enheden er professionelt inspiceret, testet og istandsat. Hos PhoneSpot gennemgår alle enheder 30+ individuelle tests og leveres med 36 måneders garanti. Det er ikke det samme som \u201ebrugt\u201c \u2014 det er kvalitetssikret teknologi.",
  },
  {
    question: "Hvad er forskellen på Grade A, B og C?",
    answer:
      "Alle grader er 100% funktionelle \u2014 forskellen er udelukkende kosmetisk. Grade A ser ud som ny, Grade B kan have lette brugsridser, og Grade C har synlige brugsspor men er det mest budgetvenlige valg.",
  },
  {
    question: "Kan jeg returnere min enhed?",
    answer:
      "Ja, du har 14 dages fuld returret. Er du ikke tilfreds, sender du enheden retur og får dine penge tilbage \u2014 ingen spørgsmål stillet.",
  },
  {
    question: "Hvor hurtigt leverer I?",
    answer:
      "Bestil før kl. 16 på hverdage, og vi sender samme dag. De fleste ordrer leveres inden for 1-2 hverdage med GLS eller PostNord.",
  },
  {
    question: "Er jeres iPhones ulåste?",
    answer:
      "Ja, alle vores iPhones er factory unlocked og virker med alle danske operatører \u2014 TDC, Telenor, Telia, 3, Lebara og andre.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      {/* ── 1. Hero — compact lifestyle ── */}
      <section className="px-4 pt-4 pb-0 md:px-6 md:pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl md:rounded-3xl">
          {/* Background image — lifestyle/workshop */}
          <Image
            src="/images/lifestyle/workshop.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
            aria-hidden="true"
          />
          {/* Gradient overlay — strong on left, lets workshop image show on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A3D2E]/95 via-[#1A3D2E]/70 to-[#1A3D2E]/15" />

          <div className="relative z-10 px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12 lg:max-w-[60%] lg:px-16 lg:py-14">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-white/90 backdrop-blur-sm">
              TESTET · RENSET · KLAR TIL BRUG
            </span>

            <h1 className="font-display text-3xl sm:text-4xl font-extrabold leading-[1.1] text-white md:text-5xl lg:text-[3.25rem]">
              Refurbished tech<br />
              du kan stole på
            </h1>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              Bærbare, tilbehør, telefoner og mere — med op til 40% rabat og 36 måneders garanti.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/baerbare"
                className="rounded-full bg-white px-7 py-3 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
              >
                Se udvalget
              </Link>
              <Link
                href="/saelg-din-enhed"
                className="rounded-full border-2 border-white/30 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Sælg din enhed
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Categories — 3 big + 4 small ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Heading as="h2" size="lg">
            Udforsk vores udvalg
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Alt er kvalitetstestet, rengjort og klar med 36 måneders garanti.
          </p>
        </div>

        {/* Top row: 3 featured (big) cards */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURED_CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#1A3D2E]/8 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#1A3D2E]/15 hover:shadow-[0_12px_32px_-12px_rgba(26,61,46,0.18)]"
            >
              {/* Image area — clean white */}
              <div className="relative flex h-52 items-center justify-center bg-white p-6 sm:h-56">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={320}
                  height={240}
                  className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                  unoptimized
                />
                {cat.badge && (
                  <span className="absolute top-3 right-3 rounded-full bg-[#1A3D2E] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {cat.badge}
                  </span>
                )}
              </div>
              {/* Body */}
              <div className="flex flex-1 flex-col justify-between border-t border-[#1A3D2E]/8 px-5 py-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#1A3D2E]">
                    {cat.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray">{cat.subtitle}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1A3D2E]">
                    {cat.tagline}
                  </span>
                  <span className="text-xs font-semibold text-green-eco transition-transform duration-150 group-hover:translate-x-0.5">
                    Se udvalg &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom row: 4 secondary (smaller) cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SECONDARY_CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#1A3D2E]/8 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#1A3D2E]/15 hover:shadow-[0_12px_32px_-12px_rgba(26,61,46,0.18)]"
            >
              {/* Image area — clean white, image dominates */}
              <div className="relative flex h-36 items-center justify-center bg-white p-3 sm:h-40">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={220}
                  height={180}
                  className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                  unoptimized
                />
              </div>
              {/* Body */}
              <div className="border-t border-[#1A3D2E]/8 px-4 py-3">
                <h3 className="font-display text-sm font-bold text-[#1A3D2E] sm:text-base">
                  {cat.name}
                </h3>
                <p className={`mt-0.5 text-xs font-semibold ${cat.taglineClass}`}>
                  {cat.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* ── 3. USP bar ── */}
      <div className="bg-[#1A3D2E]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-4 md:gap-x-16">
            {USP_BAR.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 text-white">
                <span className="text-white/70">{item.icon}</span>
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Shop tabs ── */}
      <ShopTabs />

      {/* ── 5. Bestsellers ── */}
      <Bestsellers />

      {/* ── 6. Sell your device CTA ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white shadow-sm">
          <div className="grid items-center gap-8 p-4 sm:p-8 md:grid-cols-2 md:p-12 lg:p-16">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-eco">
                Byttehandel
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight text-charcoal md:text-4xl">
                Sælg din<br />brugte enhed
              </h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-gray">
                Få et hurtigt og fair tilbud på din gamle iPhone, iPad eller Android.
                Vi håndterer afhentning &mdash; du får penge inden for 24 timer.
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "Gratis afhentning med Shipmondo",
                  "Betaling inden for 24 timer",
                  "Sikkert og gennemsigtigt",
                ].map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm text-charcoal">
                    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 text-green-eco" aria-hidden="true">
                      <path d="M13 4L6.5 11 3 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/salg"
                className="mt-8 inline-block rounded-full bg-green-eco px-8 py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Få et tilbud &rarr;
              </Link>
            </div>
            <div className="flex items-center justify-center">
              <Image src="/images/products/iphone-hero.jpg" alt="Sælg din enhed" width={400} height={300} className="rounded-2xl object-cover" />
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── 7. Customer reviews ── */}
      <SectionWrapper background="default">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-eco">
            Kundeanmeldelser
          </p>
          <Heading as="h2" size="lg">
            Det siger vores kunder
          </Heading>
        </div>
        <Suspense fallback={<div className="py-8 text-center text-gray">Indlæser anmeldelser...</div>}>
          <TrustpilotReviews />
        </Suspense>
      </SectionWrapper>

      {/* ── 8. FAQ + final CTA ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <Heading as="h2" size="md">
              Ofte stillede spørgsmål
            </Heading>
            <p className="mt-3 text-gray">
              Alt du skal vide om refurbished tech fra PhoneSpot.
            </p>
          </div>

          <div className="divide-y divide-sand rounded-2xl bg-white shadow-sm">
            {HOME_FAQ.map((item) => (
              <details key={item.question} className="group px-6 py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-base font-semibold text-charcoal">
                  <span>{item.question}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-gray transition-transform group-open:rotate-180" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-3 text-base leading-relaxed text-gray">{item.answer}</p>
              </details>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link href="/faq" className="text-sm font-semibold text-green-eco hover:underline">
              Se alle spørgsmål &rarr;
            </Link>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mx-auto mt-20 max-w-2xl text-center">
          <Heading as="h2" size="md">
            Klar til at finde din næste enhed?
          </Heading>
          <p className="mt-4 text-gray">
            Udforsk vores udvalg af kvalitetstestede enheder med 36 måneders
            garanti og 14 dages fortrydelsesret.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/iphones"
              className="inline-block rounded-full bg-green-eco px-8 py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se iPhones &rarr;
            </Link>
            <Link
              href="/tilbehoer"
              className="inline-block rounded-full border border-charcoal/20 px-8 py-3.5 font-semibold text-charcoal transition-colors hover:border-charcoal/50 hover:bg-charcoal/[0.04]"
            >
              Se tilbehør &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
