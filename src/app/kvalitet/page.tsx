import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";

export const metadata: Metadata = {
  title: "Kvalitet & Stand - Hvad betyder Grade A, B og C? | PhoneSpot",
  description:
    "Forstå vores graderingssystem. Alle enheder er kvalitetstestede med minimum 12 måneders garanti.",
};

const testSteps = [
  {
    title: "Funktionstest",
    description:
      "Alle knapper, sensorer og kameraer testes grundigt for fuld funktionalitet.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "Batteritest",
    description:
      "Batterikapaciteten verificeres og skal opfylde minimumsstandarden for den pågældende grade.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
        <line x1="23" y1="13" x2="23" y2="11" />
      </svg>
    ),
  },
  {
    title: "Kosmetisk vurdering",
    description:
      "Enheden graderes baseret på den kosmetiske stand af skærm og kabinet.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
  {
    title: "Rengøring & klargøring",
    description:
      "Enheden rengøres grundigt og nulstilles til fabriksindstillinger.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

export default function KvalitetPage() {
  return (
    <>
      {/* Hero & grading section */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading size="xl">Vores kvalitetsgaranti</Heading>
          <p className="mt-6 text-lg leading-relaxed text-gray">
            Hos PhoneSpot gennemgår alle enheder en grundig kvalitetstest. Vi
            grader vores produkter i tre kategorier, så du altid ved præcis hvad
            du får.
          </p>
        </div>
        <div className="mt-14">
          <ConditionExplainer />
        </div>
      </SectionWrapper>

      {/* Test process section */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Vores testproces
          </Heading>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-radius-lg border border-soft-grey bg-white p-6 text-center"
            >
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                {step.icon}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-eco">
                Trin {index + 1}
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-charcoal">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Trust bar */}
      <SectionWrapper>
        <TrustBar />
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <Link
            href="/iphones"
            className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Se vores udvalg &rarr;
          </Link>
        </div>
      </SectionWrapper>
    </>
  );
}
