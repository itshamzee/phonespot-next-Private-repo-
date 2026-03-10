import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  SPARE_PART_CATEGORIES,
  SPARE_PART_TYPES,
  POPULAR_SPARE_PART_MODELS,
  SPARE_PARTS_FAQ,
} from "@/lib/spare-parts";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { DeviceSearch } from "@/components/spare-parts/device-search";

export const metadata: Metadata = {
  title: "Reservedele til iPhone, iPad, MacBook & Samsung | PhoneSpot",
  description:
    "Køb reservedele til iPhone, Samsung, iPad og MacBook hos PhoneSpot. Skærme, batterier, kameraer og mere med 36 måneders garanti og same-day afsendelse.",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryIcon({ path }: { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-10 w-10"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-sand pb-4">
      <summary className="flex cursor-pointer items-center justify-between py-4 text-left font-semibold text-charcoal transition-colors hover:text-green-eco">
        {question}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </summary>
      <p className="pb-2 text-sm leading-relaxed text-gray">{answer}</p>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReservedelePage() {
  return (
    <>
      {/* ───────────────────────── 1. Hero + Search ───────────────────────── */}
      <section className="relative overflow-hidden bg-charcoal py-20 text-white md:py-28 lg:py-36">
        <Image
          src="/spare-parts/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          {/* Left — text */}
          <div>
            <Heading as="h1" size="xl" className="text-white">
              Reservedele til alle enheder
            </Heading>
            <p className="mt-4 max-w-xl text-lg text-white/80">
              Professionelle reservedele til iPhone, iPad, MacBook og Samsung.
              Alt testet, kvalitetssikret og med 36 måneders garanti.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/60">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-light">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                36 mdr. garanti
              </span>
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-light">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Same-day afsendelse
              </span>
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-light">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                e-mærket webshop
              </span>
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-light">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Trustpilot 4.4
              </span>
            </div>
          </div>

          {/* Right — search */}
          <div className="flex flex-col items-center lg:items-start">
            <h2 className="mb-4 font-display text-lg font-semibold text-white">
              Find reservedele til din enhed
            </h2>
            <DeviceSearch />
          </div>
        </div>
      </section>

      {/* ───────────────────────── 3. Deltype-grid ───────────────────────── */}
      <SectionWrapper>
        <Heading as="h2" size="lg" className="mb-4 text-center">
          Hvad leder du efter?
        </Heading>
        <p className="mx-auto mb-12 max-w-2xl text-center text-base text-gray">
          Vi fører alle typer reservedele — fra skærme og batterier til kameramoduler og ladestik.
        </p>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-3">
          {SPARE_PART_TYPES.map((type) => (
            <div
              key={type.slug}
              className="group flex flex-col items-center rounded-2xl border border-sand bg-white p-8 text-center transition-all hover:border-green-eco hover:shadow-lg"
            >
              <div className="relative mb-6 h-44 w-44 overflow-hidden rounded-2xl bg-cream">
                <Image
                  src={type.image}
                  alt={type.label}
                  fill
                  sizes="(max-width: 640px) 40vw, 176px"
                  className="object-contain p-3"
                />
              </div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-[2px] text-charcoal">
                {type.label}
              </h3>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────────────────── 4. Enhedskategorier ───────────────────────── */}
      <SectionWrapper background="sand">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Vælg enhedstype
        </Heading>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SPARE_PART_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={
                cat.models.length === 1
                  ? `/reservedele/${cat.slug}/${cat.models[0].slug}`
                  : `/reservedele/${cat.slug}`
              }
              className="group flex flex-col items-center rounded-2xl border border-sand bg-white p-8 text-center transition-all hover:border-green-eco hover:shadow-lg"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cream text-charcoal transition-colors group-hover:bg-green-eco group-hover:text-white">
                <CategoryIcon path={cat.iconPath} />
              </div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-[2px] text-charcoal">
                {cat.label}
              </h3>
              <p className="mt-2 text-sm text-gray">{cat.description}</p>
              <span className="mt-4 text-xs font-semibold uppercase tracking-[2px] text-green-eco">
                {cat.models.length === 1
                  ? "Se reservedele"
                  : `${cat.models.length} modeller`}
                <span className="ml-1" aria-hidden="true">
                  &rarr;
                </span>
              </span>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────────────────── 5. Populære modeller ───────────────────────── */}
      <SectionWrapper background="cream">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Populære modeller
        </Heading>

        <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2">
          {POPULAR_SPARE_PART_MODELS.map((model) => (
            <Link
              key={model.href}
              href={model.href}
              className="shrink-0 rounded-full border border-sand bg-white px-5 py-2.5 text-sm font-medium text-charcoal transition-all hover:border-green-eco hover:text-green-eco"
            >
              {model.label}
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────────────────── 6. Hvorfor PhoneSpot ───────────────────────── */}
      <SectionWrapper>
        <Heading as="h2" size="md" className="mb-4 text-center">
          Hvorfor købe reservedele hos PhoneSpot?
        </Heading>
        <p className="mx-auto mb-12 max-w-xl text-center text-sm text-gray">
          Vi er ikke bare endnu en grossist-webshop. PhoneSpot er specialister i reparation og reservedele.
        </p>

        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-sand">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand bg-cream">
                <th className="px-6 py-4 font-display text-xs font-semibold uppercase tracking-[2px] text-charcoal" />
                <th className="px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[2px] text-green-eco">
                  PhoneSpot
                </th>
                <th className="px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[2px] text-gray">
                  Andre shops
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand bg-white">
              {[
                ["36 mdr. garanti", true, false],
                ["Testet & kvalitetssikret", true, false],
                ["Same-day afsendelse", true, false],
                ["e-mærket webshop", true, false],
                ["Reparation i eget værksted", true, false],
                ["Dansk kundeservice", true, true],
              ].map(([feature, ps, other]) => (
                <tr key={feature as string}>
                  <td className="px-6 py-3.5 font-medium text-charcoal">{feature as string}</td>
                  <td className="px-6 py-3.5 text-center">
                    {ps ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-gray/40">&mdash;</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {other ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cream text-gray">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-gray/40">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionWrapper>

      {/* ───────────────────────── 7. Stats ───────────────────────── */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "500+", label: "Reservedele" },
            { value: "31+", label: "Modeller" },
            { value: "36", label: "Mdr. garanti" },
            { value: "Same-day", label: "Afsendelse" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-4xl font-bold text-green-light md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm uppercase tracking-[2px] text-white/60">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────────────────── 8. FAQ ───────────────────────── */}
      <SectionWrapper>
        <Heading as="h2" size="md" className="mb-8 text-center">
          Ofte stillede spørgsmål
        </Heading>
        <div className="mx-auto max-w-2xl">
          {SPARE_PARTS_FAQ.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────────────────── 9. Trust + CTA ───────────────────────── */}
      <SectionWrapper background="sand" className="text-center">
        <Heading as="h2" size="md" className="mb-4">
          Klar til at finde din reservedel?
        </Heading>
        <p className="mx-auto mb-8 max-w-lg text-sm text-gray">
          Gennemse vores sortiment af kvalitetstestede reservedele med 36 måneders garanti
          og same-day afsendelse.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/reservedele/iphone"
            className="inline-flex items-center gap-2 rounded-full bg-green-eco px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-eco/90"
          >
            Se iPhone reservedele
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link
            href="/kontakt"
            className="inline-flex items-center gap-2 rounded-full border border-charcoal px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
          >
            Kontakt os
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray">
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            e-mærket
          </span>
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            36 mdr. garanti
          </span>
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            14 dages returret
          </span>
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Hurtig levering
          </span>
        </div>
      </SectionWrapper>
    </>
  );
}
