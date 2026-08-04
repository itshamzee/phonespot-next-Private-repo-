import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { ShopTabs } from "@/components/home/shop-tabs";
import { Bestsellers } from "@/components/home/bestsellers";
import { IntroStrip } from "@/components/home/intro-strip";

// ---------------------------------------------------------------------------
// Data — Apple-ecosystem hero tiles + support tiles
// ---------------------------------------------------------------------------

const HERO_CATEGORIES = [
  {
    name: "iPhones",
    subtitle: "Fra iPhone SE til 16 Pro Max",
    href: "/iphones",
    tagline: "Fra 1.499 kr",
    image: "/images/products/iphone-lineup.jpg",
    badge: "Bestseller",
  },
  {
    name: "iPads",
    subtitle: "iPad Air, iPad Pro og mere",
    href: "/ipads",
    tagline: "Fra 1.499 kr",
    image: "/images/products/ipad-air-new.png",
    badge: null,
  },
  {
    name: "MacBooks & bærbare",
    subtitle: "MacBook, ThinkPad, EliteBook",
    href: "/baerbare",
    tagline: "Fra 1.999 kr",
    image: "/images/products/thinkpad-clean.webp",
    badge: null,
  },
  {
    name: "Apple Watch",
    subtitle: "Series 6 til Series 9",
    href: "/smartwatches",
    tagline: "Fra 999 kr",
    image: "/images/products/apple-watch.png",
    badge: null,
  },
] as const;

type SupportIconKind = "tilbehoer" | "glas" | "reservedele" | "reparation";

const SUPPORT_CATEGORIES: ReadonlyArray<{
  name: string;
  description: string;
  href: string;
  iconKind: SupportIconKind;
  badge?: string | null;
}> = [
  { name: "Tilbehør", description: "Covers, kabler & ladere", href: "/tilbehoer", iconKind: "tilbehoer" },
  { name: "Beskyttelsesglas", description: "9H hærdet · gratis montering", href: "/beskyttelsesglas", iconKind: "glas", badge: "Nyt" },
  { name: "Reservedele", description: "Skærme, batterier, dele", href: "/reservedele", iconKind: "reservedele" },
  { name: "Reparation", description: "Slagelse & Vejle", href: "/reparation", iconKind: "reparation" },
];

function SupportIcon({ kind }: { kind: SupportIconKind }) {
  const cls = "h-7 w-7";
  if (kind === "tilbehoer") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 12V6a3 3 0 1 1 6 0v6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 12h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "glas") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "reservedele") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M14.7 6.3a4 4 0 0 1 5.66 5.66l-1.42 1.42-5.66-5.66z" strokeLinejoin="round" />
      <path d="M13.28 7.72L4 17v3h3l9.28-9.28" strokeLinejoin="round" />
    </svg>
  );
}

const HOME_FAQ = [
  {
    question: "Hvad betyder refurbished?",
    answer:
      "Refurbished betyder, at enheden er professionelt inspiceret, testet og istandsat. Hos PhoneSpot gennemgår alle enheder 30+ individuelle tests og leveres med 36 måneders garanti. Det er ikke det samme som „brugt“ — det er kvalitetssikret teknologi.",
  },
  {
    question: "Hvad er forskellen på Grade A, B og C?",
    answer:
      "Alle grader er 100% funktionelle — forskellen er udelukkende kosmetisk. Grade A ser ud som ny, Grade B kan have lette brugsridser, og Grade C har synlige brugsspor men er det mest budgetvenlige valg.",
  },
  {
    question: "Kan jeg returnere min enhed?",
    answer:
      "Ja, du har 14 dages fuld returret. Er du ikke tilfreds, sender du enheden retur og får dine penge tilbage — ingen spørgsmål stillet.",
  },
  {
    question: "Hvor hurtigt leverer I?",
    answer:
      "Bestil før kl. 16 på hverdage, og vi sender samme dag. De fleste ordrer leveres inden for 1-2 hverdage med GLS eller PostNord.",
  },
  {
    question: "Er jeres iPhones ulåste?",
    answer:
      "Ja, alle vores iPhones er factory unlocked og virker med alle danske operatører — TDC, Telenor, Telia, 3, Lebara og andre.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      {/* ── 1. Compact intro strip — brand voice + Trustpilot + USPs ── */}
      <IntroStrip />

      {/* ── 2. Apple-ecosystem hero grid — 4 big tiles ── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
            {HERO_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#1A3D2E]/8 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#1A3D2E]/15 hover:shadow-[0_12px_32px_-12px_rgba(26,61,46,0.18)]"
              >
                <div className="relative flex h-44 items-center justify-center bg-white p-5 sm:h-52 lg:h-56">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    width={300}
                    height={220}
                    className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                    unoptimized
                    priority
                  />
                  {cat.badge && (
                    <span className="absolute right-3 top-3 rounded-full bg-green-eco px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      {cat.badge}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between border-t border-[#1A3D2E]/8 px-5 py-4">
                  <div>
                    <h3 className="font-display text-lg font-bold tracking-tight text-charcoal">{cat.name}</h3>
                    <p className="mt-0.5 text-[13px] text-gray">{cat.subtitle}</p>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="font-display text-xl font-extrabold text-green-eco sm:text-2xl">
                      {cat.tagline}
                    </span>
                    <span className="text-xs font-semibold tracking-tight text-green-eco transition-transform duration-150 group-hover:translate-x-0.5">
                      Se udvalg &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* ── 3. Support tiles — 4 small tiles ── */}
          <div className="mt-3 grid grid-cols-2 gap-3 md:mt-4 md:gap-4 lg:grid-cols-4">
            {SUPPORT_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#1A3D2E]/8 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1A3D2E]/15 hover:shadow-[0_8px_24px_-12px_rgba(26,61,46,0.18)] sm:p-5"
              >
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-green-pale text-green-eco sm:h-14 sm:w-14">
                  <SupportIcon kind={cat.iconKind} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-[15px] font-bold tracking-tight text-charcoal sm:text-base">
                      {cat.name}
                    </h3>
                    {cat.badge && (
                      <span className="rounded-full bg-green-eco px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        {cat.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-gray sm:text-[13px]">{cat.description}</p>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="hidden h-4 w-4 flex-shrink-0 text-gray transition-all group-hover:translate-x-0.5 group-hover:text-green-eco sm:block"
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
                href="/saelg-din-enhed"
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
