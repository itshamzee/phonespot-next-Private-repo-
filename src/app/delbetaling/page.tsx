import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";
import { KlarnaIcon } from "@/components/ui/payment-icons";

export const metadata: Metadata = {
  title:
    "Delbetaling med Klarna - Køb Refurbished Tech på Afbetaling | PhoneSpot",
  description:
    "Del betalingen op i 3 rentefrie rater med Klarna hos PhoneSpot. Køb refurbished iPhones, iPads og MacBooks på afbetaling uden renter. Læs hvordan det virker.",
  keywords:
    "delbetaling refurbished, klarna delbetaling, køb iphone på afbetaling, refurbished afbetaling, delbetaling iphone, klarna refurbished, betal i rater, rentefri delbetaling, phonespot klarna",
  alternates: {
    canonical: "https://phonespot.dk/delbetaling",
  },
  openGraph: {
    title:
      "Delbetaling med Klarna - Køb Refurbished Tech på Afbetaling | PhoneSpot",
    description:
      "Del betalingen op i 3 rentefrie rater med Klarna hos PhoneSpot. Køb refurbished iPhones, iPads og MacBooks på afbetaling uden renter.",
    url: "https://phonespot.dk/delbetaling",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STEPS = [
  {
    number: "1",
    title: "Vælg dit produkt",
    description:
      "Find den refurbished iPhone, iPad eller MacBook du ønsker. Alle produkter er kvalitetstestede med 36 måneders garanti.",
  },
  {
    number: "2",
    title: "Vælg Klarna ved checkout",
    description:
      'Når du er klar til at betale, vælger du "Betal i 3 rater" med Klarna som betalingsmetode.',
  },
  {
    number: "3",
    title: "Betal i 3 rater",
    description:
      "Beløbet deles automatisk i 3 lige store rater. Første rate betales ved køb, de næste to trækkes automatisk efter 30 og 60 dage.",
  },
];

const EXAMPLES = [
  {
    product: "iPhone 14 Pro",
    grade: "Grade A",
    total: "5.499",
    monthly: "1.833",
  },
  {
    product: "iPhone 13",
    grade: "Grade B",
    total: "3.299",
    monthly: "1.100",
  },
  {
    product: "iPad Air M1",
    grade: "Grade A",
    total: "3.999",
    monthly: "1.333",
  },
  {
    product: "MacBook Air M2",
    grade: "Grade A",
    total: "7.999",
    monthly: "2.667",
  },
];

const BENEFITS = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
        />
      </svg>
    ),
    title: "0% i renter",
    description:
      "Ingen skjulte gebyrer eller renter. Du betaler præcis den samme pris, bare fordelt over 3 måneder.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
        />
      </svg>
    ),
    title: "Tryg Klarna-garanti",
    description:
      "Klarna er en af Europas mest betroede betalingsudbydere med købergaranti og fuld databeskyttelse.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
    title: "Hurtig godkendelse",
    description:
      "Klarna godkender din delbetaling på få sekunder direkte ved checkout. Ingen langvarig kreditvurdering.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
        />
      </svg>
    ),
    title: "Styr det i Klarna-appen",
    description:
      "Hold styr på alle dine rater og betalinger direkte i Klarna-appen. Fuld overblik til enhver tid.",
  },
];

const FAQ = [
  {
    question: "Hvad koster det at bruge Klarna delbetaling?",
    answer:
      "Det er helt gratis. Der er ingen renter, gebyrer eller skjulte omkostninger. Du betaler præcis den samme pris som ved almindelig betaling — bare fordelt over 3 måneder.",
  },
  {
    question: "Hvordan fungerer de 3 rater?",
    answer:
      "Når du vælger Klarna ved checkout, deles totalprisen i 3 lige store rater. Den første rate betales med det samme. De næste to rater trækkes automatisk efter 30 og 60 dage fra dit betalingskort eller bankkonto.",
  },
  {
    question: "Kræver det en kreditvurdering?",
    answer:
      "Klarna laver en hurtig, blød kreditvurdering som ikke påvirker din kreditværdighed. Godkendelsen sker på få sekunder direkte ved checkout.",
  },
  {
    question: "Kan jeg stadig returnere mit produkt?",
    answer:
      "Ja, du har stadig 14 dages fuld fortrydelsesret. Hvis du returnerer produktet, refunderer Klarna automatisk de betalte rater, og eventuelle resterende rater annulleres.",
  },
  {
    question: "Hvad sker der hvis jeg ikke betaler en rate?",
    answer:
      "Klarna sender dig en påmindelse inden hver rate trækkes. Hvis en betaling mislykkes, kontakter Klarna dig for at finde en løsning. Vi anbefaler altid at sikre der er dækning på kontoen.",
  },
  {
    question: "Gælder garantien stadig ved delbetaling?",
    answer:
      "Ja, du får præcis samme 36 måneders garanti uanset betalingsmetode. Din garanti er knyttet til produktet, ikke betalingsformen.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DelbetalingPage() {
  return (
    <>
      <JsonLd data={faqJsonLd} />

      {/* ── Hero ── */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <div className="mb-6 flex items-center justify-center gap-3">
              <KlarnaIcon className="h-10 w-auto rounded-lg" />
            </div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Fleksibel betaling
            </p>
            <Heading size="lg" className="text-white">
              Del betalingen op med Klarna
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Køb kvalitetstestet refurbished tech og betal i{" "}
              <span className="font-semibold text-white">
                3 rentefrie rater
              </span>
              . Ingen skjulte gebyrer — samme pris, mere fleksibilitet.
            </p>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── Sådan virker det ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                3 nemme trin
              </p>
              <Heading as="h2" size="md">
                Sådan virker delbetaling
              </Heading>
            </div>
          </FadeIn>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <FadeIn key={step.number} delay={i * 0.15}>
                <div className="relative rounded-2xl border border-soft-grey bg-white p-8 text-center">
                  {/* Step number */}
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-eco font-display text-lg font-bold text-white">
                    {step.number}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold uppercase tracking-tight text-charcoal">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray">
                    {step.description}
                  </p>
                  {/* Connector arrow (between cards on desktop) */}
                  {i < STEPS.length - 1 && (
                    <div className="absolute -right-5 top-1/2 hidden -translate-y-1/2 text-soft-grey md:block">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Priseksempler ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Priseksempler
              </p>
              <Heading as="h2" size="md">
                Se hvad det koster pr. måned
              </Heading>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray">
                Her er eksempler på populære produkter og hvad de koster med
                Klarna delbetaling i 3 rater.
              </p>
            </div>
          </FadeIn>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMPLES.map((item, i) => (
              <FadeIn key={item.product} delay={i * 0.1}>
                <div className="rounded-2xl border border-soft-grey bg-white p-6 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray">
                    {item.grade}
                  </p>
                  <h3 className="mt-1 font-display text-base font-bold uppercase tracking-tight text-charcoal">
                    {item.product}
                  </h3>
                  <div className="mt-4 border-t border-soft-grey pt-4">
                    <p className="text-xs text-gray">Totalpris</p>
                    <p className="text-lg font-bold text-charcoal">
                      {item.total} kr.
                    </p>
                  </div>
                  <div className="mt-3 rounded-xl bg-[#FFB3C7]/10 px-4 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-charcoal/50">
                      3 rater med Klarna
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-charcoal">
                      {item.monthly} kr.
                      <span className="text-sm font-normal text-gray">
                        /md.
                      </span>
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Fordele ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Fordele
              </p>
              <Heading as="h2" size="md">
                Hvorfor vælge delbetaling?
              </Heading>
            </div>
          </FadeIn>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {BENEFITS.map((benefit, i) => (
              <FadeIn key={benefit.title} delay={i * 0.1}>
                <div className="flex gap-5 rounded-2xl border border-soft-grey bg-white p-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-pale text-green-eco">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold uppercase tracking-tight text-charcoal">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Refurbished + delbetaling = smart valg ── */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Bæredygtigt & fleksibelt
            </p>
            <Heading as="h2" size="md" className="text-white">
              Refurbished + delbetaling = det smarte valg
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70">
              Når du køber refurbished, sparer du allerede op til{" "}
              <span className="font-semibold text-white">40%</span>{" "}
              sammenlignet med nypris. Med Klarna delbetaling kan du fordele
              besparelsen over 3 måneder — og stadig få{" "}
              <span className="font-semibold text-white">
                36 måneders garanti
              </span>
              , grundig kvalitetstest og 14 dages returret.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                { value: "Op til 40%", label: "Billigere end nypris" },
                { value: "0 kr.", label: "I renter & gebyrer" },
                { value: "36 mdr.", label: "Fuld garanti" },
              ].map((stat, i) => (
                <FadeIn key={stat.label} delay={i * 0.15}>
                  <div className="rounded-xl bg-white/[0.06] px-6 py-5">
                    <p className="font-display text-2xl font-bold text-green-eco">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-white/50">{stat.label}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── FAQ ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Ofte stillede spørgsmål
              </p>
              <Heading as="h2" size="md">
                Spørgsmål om delbetaling
              </Heading>
            </div>
          </FadeIn>

          <div className="mt-12 space-y-4">
            {FAQ.map((item, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <details className="group rounded-2xl border border-soft-grey bg-white">
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-display text-sm font-bold uppercase tracking-tight text-charcoal [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-5 w-5 shrink-0 text-gray transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </summary>
                  <div className="border-t border-soft-grey px-6 pb-5 pt-4">
                    <p className="text-sm leading-relaxed text-gray">
                      {item.answer}
                    </p>
                  </div>
                </details>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <Heading as="h2" size="md">
              Klar til at handle?
            </Heading>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray">
              Udforsk vores udvalg af kvalitetstestede refurbished produkter og
              vælg Klarna ved checkout for rentefri delbetaling.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/iphones"
                className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Se iPhones
              </Link>
              <Link
                href="/ipads"
                className="rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
              >
                Se iPads
              </Link>
              <Link
                href="/baerbare"
                className="rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
              >
                Se MacBooks
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2">
              <KlarnaIcon className="h-7 w-auto rounded" />
              <span className="text-xs text-gray">
                Sikker betaling med Klarna
              </span>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>
    </>
  );
}
