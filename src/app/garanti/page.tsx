import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "36 Måneders Garanti på Refurbished Elektronik | PhoneSpot",
  description:
    "PhoneSpot tilbyder 36 måneders fuld garanti på alle refurbished enheder. Læs om hvad der er dækket, og hvordan du bruger din garanti.",
  keywords:
    "refurbished garanti, garanti refurbished iphone, 36 måneders garanti, refurbished elektronik garanti, phonespot garanti, reklamation refurbished",
  alternates: {
    canonical: "https://phonespot.dk/garanti",
  },
  openGraph: {
    title: "36 Måneders Garanti på Refurbished Elektronik | PhoneSpot",
    description:
      "PhoneSpot tilbyder 36 måneders fuld garanti på alle refurbished enheder. Læs om hvad der er dækket, og hvordan du bruger din garanti.",
    url: "https://phonespot.dk/garanti",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STATS = [
  { value: "36", label: "Måneders garanti", sub: "På alle enheder" },
  { value: "14", label: "Dages returret", sub: "Ingen spørgsmål" },
  { value: "1-2", label: "Dages behandling", sub: "Ved garantisag" },
];

const COVERED_ITEMS = [
  "Skærm og touch",
  "Batteri (min. kapacitet per grade)",
  "Kamera og Face ID / Touch ID",
  "Højttalere og mikrofon",
  "Wi-Fi, Bluetooth og GPS",
  "Opladningsport og knapper",
  "Sensorer og vibration",
  "Software og operativsystem",
];

const COMPETITORS = [
  { name: "PhoneSpot", warranty: "36 mdr.", highlighted: true },
  { name: "GreenMind", warranty: "36 mdr.", highlighted: false },
  { name: "Swappie", warranty: "24 mdr.", highlighted: false },
  { name: "Føniks Computer", warranty: "24 mdr.", highlighted: false },
  { name: "Back Market", warranty: "Varierer (12-24 mdr.)", highlighted: false },
  { name: "Refurbed", warranty: "12 mdr.", highlighted: false },
];

const WARRANTY_FAQ = [
  {
    question: "Hvad dækker garantien?",
    answer:
      "Garantien dækker alle fabrikationsfejl og funktionelle problemer. Hvis din enhed får en fejl der ikke skyldes forkert brug eller fysisk skade, reparerer eller erstatter vi den gratis inden for garantiperioden på 36 måneder.",
  },
  {
    question: "Dækker garantien kosmetiske skader?",
    answer:
      "Nej, garantien dækker kun funktionelle fejl. Den kosmetiske stand på din enhed svarer til den grade du har valgt ved køb (A, B eller C). Ridser, buler og andre kosmetiske spor der var til stede ved levering er ikke dækket, da de er en del af enhedens graderede stand.",
  },
  {
    question: "Hvad hvis min enhed går i stykker?",
    answer:
      "Kontakt os via vores reklamationsformular eller send en email. Vi svarer inden for 1-2 hverdage med en løsning. Du får et returetiket, sender enheden til os, og vi reparerer eller erstatter den hurtigst muligt.",
  },
  {
    question: "Dækker garantien batteri?",
    answer:
      "Ja. Hvis batterikapaciteten falder under minimumskravet for den grade du har købt, er det dækket af garantien. Minimumskravene er: Grade A: 85%, Grade B: 80%, Grade C: 75% af original kapacitet.",
  },
  {
    question: "Kan jeg få pengene tilbage i stedet?",
    answer:
      "Du har 14 dages fuld fortrydelsesret fra leveringsdagen — ingen spørgsmål stillet. Efter de 14 dage håndterer vi garantisager med reparation eller ombytning til en tilsvarende enhed.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: WARRANTY_FAQ.map((item) => ({
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

export default function GarantiPage() {
  return (
    <>
      <JsonLd data={faqJsonLd} />

      {/* ── All content inside single centered SectionWrapper ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          {/* ── Hero ── */}
          <FadeIn>
            <div className="text-center">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Din tryghed
              </p>
              <Heading size="lg">36 måneders garanti</Heading>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray">
                Alle refurbished enheder fra PhoneSpot leveres med 36 måneders
                fuld garanti. Det er længere end de fleste konkurrenter og
                matcher de bedste i branchen. Vi stoler på kvaliteten af det vi
                sælger &mdash; og det skal du også kunne.
              </p>
            </div>
          </FadeIn>

          {/* ── Stat cards ── */}
          <FadeIn delay={0.1}>
            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-5 text-center"
                >
                  <p className="font-display text-3xl font-bold text-green-eco">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-charcoal">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray">{stat.sub}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* ── Coverage section ── */}
          <FadeIn delay={0.15}>
            <div className="mt-16">
              <Heading as="h2" size="md">
                Hvad dækker garantien?
              </Heading>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {COVERED_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl bg-cream px-4 py-3"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5 shrink-0 text-green-eco"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium text-charcoal">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* ── Competitor comparison table ── */}
          <FadeIn delay={0.2}>
            <div className="mt-16">
              <Heading as="h2" size="md">
                Sammenligning med konkurrenterne
              </Heading>
              <div className="mt-8 overflow-hidden rounded-2xl border border-sand">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sand">
                      <th className="px-5 py-3 text-left font-display text-xs font-semibold uppercase tracking-[2px] text-charcoal">
                        Forhandler
                      </th>
                      <th className="px-5 py-3 text-left font-display text-xs font-semibold uppercase tracking-[2px] text-charcoal">
                        Garanti
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPETITORS.map((row, i) => (
                      <tr
                        key={row.name}
                        className={`${
                          i < COMPETITORS.length - 1
                            ? "border-b border-sand/50"
                            : ""
                        } ${row.highlighted ? "bg-green-eco/5" : ""}`}
                      >
                        <td
                          className={`px-5 py-3 ${
                            row.highlighted
                              ? "font-bold text-green-eco"
                              : "text-charcoal"
                          }`}
                        >
                          {row.name}
                        </td>
                        <td
                          className={`px-5 py-3 ${
                            row.highlighted
                              ? "font-bold text-green-eco"
                              : "text-gray"
                          }`}
                        >
                          {row.warranty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>

          {/* ── FAQ section ── */}
          <FadeIn delay={0.25}>
            <div className="mt-16">
              <Heading as="h2" size="md">
                Ofte stillede spørgsmål om garanti
              </Heading>
              <div className="mt-8 divide-y divide-sand">
                {WARRANTY_FAQ.map((item) => (
                  <details key={item.question} className="group py-5">
                    <summary className="flex cursor-pointer items-center justify-between font-display text-base font-semibold text-charcoal">
                      {item.question}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-5 w-5 shrink-0 text-gray transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-gray">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* ── CTA section ── */}
          <FadeIn delay={0.3}>
            <div className="mt-16 rounded-2xl bg-charcoal p-8 text-center md:p-10">
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
                Har du en garantisag?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/70">
                Vi gør det nemt at bruge din garanti. Indmeld din reklamation
                online, eller kontakt os direkte &mdash; vi svarer inden for 1-2
                hverdage.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/reklamation"
                  className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Indmeld reklamation
                </Link>
                <Link
                  href="/kontakt"
                  className="inline-block rounded-full border-2 border-white px-8 py-3 font-semibold text-white transition-colors hover:bg-white hover:text-charcoal"
                >
                  Kontakt os
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── Trust bar ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
