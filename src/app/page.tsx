import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { FeaturedProducts } from "@/components/home/featured-products";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { FadeIn } from "@/components/ui/fade-in";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    name: "iPhones",
    href: "/iphones",
    tagline: "Fra 999 kr",
    image: "/images/products/iphone-lineup.jpg",
  },
  {
    name: "Smartphones",
    href: "/smartphones",
    tagline: "Fra 999 kr",
    image: "/images/products/samsung-galaxy.webp",
  },
  {
    name: "iPads",
    href: "/ipads",
    tagline: "Fra 899 kr",
    image: "/images/products/ipad-air-new.png",
  },
  {
    name: "B\u00e6rbare",
    href: "/baerbare",
    tagline: "Fra 1.999 kr",
    image: "/images/products/thinkpad-clean.webp",
  },
  {
    name: "Reparation",
    href: "/reparation",
    tagline: "Fra 299 kr",
    image: "/images/products/iphone-repair.png",
  },
  {
    name: "Tilbeh\u00f8r",
    href: "/tilbehoer",
    tagline: "Fra 99 kr",
    image: "/images/products/tilbehoer-case.webp",
  },
  {
    name: "Smartwatches",
    href: "/smartwatches",
    tagline: "Fra 1.099 kr",
    image: "/images/products/apple-watch.png",
  },
];

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
      "Refurbished betyder, at enheden er professionelt inspiceret, testet og istandsat. Hos PhoneSpot gennemg\u00e5r alle enheder 30+ individuelle tests og leveres med 36 m\u00e5neders garanti. Det er ikke det samme som \u201ebrugt\u201c \u2014 det er kvalitetssikret teknologi.",
  },
  {
    question: "Hvad er forskellen p\u00e5 Grade A, B og C?",
    answer:
      "Alle grader er 100% funktionelle \u2014 forskellen er udelukkende kosmetisk. Grade A ser ud som ny, Grade B kan have lette brugsridser, og Grade C har synlige brugsspor men er det mest budgetvenlige valg.",
  },
  {
    question: "Kan jeg returnere min enhed?",
    answer:
      "Ja, du har 14 dages fuld returret. Er du ikke tilfreds, sender du enheden retur og f\u00e5r dine penge tilbage \u2014 ingen sp\u00f8rgsm\u00e5l stillet.",
  },
  {
    question: "Hvor hurtigt leverer I?",
    answer:
      "Bestil f\u00f8r kl. 16 p\u00e5 hverdage, og vi sender samme dag. De fleste ordrer leveres inden for 1-2 hverdage med GLS eller PostNord.",
  },
  {
    question: "Er jeres iPhones ul\u00e5ste?",
    answer:
      "Ja, alle vores iPhones er factory unlocked og virker med alle danske operat\u00f8rer \u2014 TDC, Telenor, Telia, 3, Lebara og andre.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      {/* ── 1. Hero ── */}
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

          <div className="relative z-10 px-8 py-14 md:px-12 md:py-16 lg:max-w-[55%] lg:px-16 lg:py-20">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm">
              36 MDR. GARANTI P&Aring; ALT
            </span>

            <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-white md:text-5xl lg:text-6xl">
              Refurbished tech<br />
              du kan stole p&aring;
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 md:text-lg">
              Testet, renset og klar til brug — med 36 m&aring;neders garanti og hurtig levering.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/iphones"
                className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
              >
                Se vores udvalg
              </Link>
              <Link
                href="/saelg-din-enhed"
                className="rounded-full border-2 border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                S&aelig;lg din elektronik
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Categories ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Heading as="h2" size="lg">
            Udforsk vores udvalg
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Alt er kvalitetstestet, rengjort og klar med 36 m&aring;neders garanti.
          </p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4 xl:grid-cols-7">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative flex shrink-0 w-[140px] flex-col overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:shadow-lg sm:w-auto"
            >
              {/* Image area */}
              <div className="relative flex h-44 items-center justify-center bg-white p-4">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    width={200}
                    height={200}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1A3D2E]/[0.07]">
                    {cat.name === "Smartphones" && (
                      /* Phone icon */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-[#1A3D2E]" aria-hidden="true">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    )}
                    {cat.name === "Bærbare" && (
                      /* Laptop icon */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-[#1A3D2E]" aria-hidden="true">
                        <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
                      </svg>
                    )}
                    {cat.name === "Reparation" && (
                      /* Wrench icon */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-[#1A3D2E]" aria-hidden="true">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    )}
                    {cat.name === "Tilbehør" && (
                      /* Headphones icon */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-[#1A3D2E]" aria-hidden="true">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                      </svg>
                    )}
                    {cat.name === "Smartwatches" && (
                      /* Watch icon */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-[#1A3D2E]" aria-hidden="true">
                        <circle cx="12" cy="12" r="7" />
                        <polyline points="12 9 12 12 13.5 13.5" />
                        <path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
              {/* Label */}
              <div className="border-t border-sand px-4 py-3">
                <p className="text-xs font-bold text-[#1A3D2E]">
                  {cat.tagline}
                </p>
                <h3 className="mt-0.5 font-display text-base font-bold text-charcoal">
                  {cat.name}
                </h3>
                <span className="mt-1 inline-block text-xs font-semibold text-green-eco transition-transform duration-150 group-hover:translate-x-0.5">
                  Se udvalg &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* ── 3. USP bar ── */}
      <div className="bg-[#1A3D2E]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-16">
            {USP_BAR.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 text-white">
                <span className="text-white/70">{item.icon}</span>
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Featured products ── */}
      <Suspense
        fallback={
          <div className="px-4 py-16 text-center text-gray">
            Indl&aelig;ser produkter...
          </div>
        }
      >
        <FeaturedProducts />
      </Suspense>

      {/* ── 5. Sell your device CTA ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white shadow-sm">
          <div className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-12 lg:p-16">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-eco">
                Byttehandel
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight text-charcoal md:text-4xl">
                S&aelig;lg din<br />brugte enhed
              </h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-gray">
                F&aring; et hurtigt og fair tilbud p&aring; din gamle iPhone, iPad eller Android.
                Vi h&aring;ndterer afhentning &mdash; du f&aring;r penge inden for 24 timer.
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
                F&aring; et tilbud &rarr;
              </Link>
            </div>
            <div className="flex items-center justify-center">
              <Image src="/images/products/iphone-hero.jpg" alt="Sælg din enhed" width={400} height={300} className="rounded-2xl object-cover" />
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── 6. Customer reviews ── */}
      <SectionWrapper background="default">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-eco">
            Kundeanmeldelser
          </p>
          <Heading as="h2" size="lg">
            Det siger vores kunder
          </Heading>
        </div>
        <Suspense fallback={<div className="py-8 text-center text-gray">Indl&aelig;ser anmeldelser...</div>}>
          <TrustpilotReviews />
        </Suspense>
      </SectionWrapper>

      {/* ── 7. FAQ + final CTA ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <Heading as="h2" size="md">
              Ofte stillede sp&oslash;rgsm&aring;l
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
              Se alle sp&oslash;rgsm&aring;l &rarr;
            </Link>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mx-auto mt-20 max-w-2xl text-center">
          <Heading as="h2" size="md">
            Klar til at finde din n&aelig;ste enhed?
          </Heading>
          <p className="mt-4 text-gray">
            Udforsk vores udvalg af kvalitetstestede enheder med 36 m&aring;neders
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
              Se tilbeh&oslash;r &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
