import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

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
// Component
// ---------------------------------------------------------------------------

export function HomepageFAQ() {
  return (
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
  );
}
