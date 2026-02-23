import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getComparison, getAllComparisonSlugs } from "@/lib/comparisons";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/ui/faq-accordion";

/* ------------------------------------------------------------------ */
/*  Static params                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllComparisonSlugs();
}

/* ------------------------------------------------------------------ */
/*  Dynamic metadata                                                   */
/* ------------------------------------------------------------------ */

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getComparison(slug);
  if (!comparison) return {};

  return {
    title: comparison.metaTitle,
    description: comparison.metaDescription,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Check if PhoneSpot's value is clearly better than the competitor's. */
function isPhonespotAdvantage(phonespot: string, competitor: string): boolean {
  const p = phonespot.toLowerCase().trim();
  const c = competitor.toLowerCase().trim();

  if (p === c) return false;
  if (p === "ja" && (c === "nej" || c.startsWith("nej") || c.startsWith("varierer")))
    return true;
  if (p.includes("36") && (c.includes("24") || c.includes("12"))) return true;
  if (p.includes("30+") && c.includes("25+")) return true;
  if (p.includes("1\u20132") && c.includes("2\u20135")) return true;
  if (
    (p.includes("iphones") || p.includes("b\u00e6rbare")) &&
    c.startsWith("kun")
  )
    return true;
  if (p.includes("konkurrencedygtige") && c.includes("h\u00f8jere")) return true;
  if (p === "dansk" && c !== "dansk") return true;
  if (p.includes("specialbutik") && c.includes("markedsplads")) return true;
  if (p.includes("egen testproces") && c.includes("varierer")) return true;

  return false;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params;
  const comparison = getComparison(slug);
  if (!comparison) notFound();

  const { title, competitor, intro, image, rows, verdict, faq } = comparison;

  return (
    <>
      {/* BreadcrumbList JSON-LD */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Forside",
              item: "https://phonespot.dk",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Sammenligninger",
              item: "https://phonespot.dk/sammenlign",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: title,
              item: `https://phonespot.dk/sammenlign/${slug}`,
            },
          ],
        }}
      />

      {/* FAQPage JSON-LD */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />

      {/* Hero with image */}
      <section className="relative overflow-hidden bg-charcoal">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          {/* Text side */}
          <div className="flex flex-col justify-center px-4 py-16 md:py-20 md:pr-12 lg:py-24 lg:pr-16">
            {/* Breadcrumb nav */}
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/50">
              <Link href="/" className="transition-colors hover:text-white">
                Forside
              </Link>
              <span>/</span>
              <Link
                href="/sammenlign"
                className="transition-colors hover:text-white"
              >
                Sammenligninger
              </Link>
              <span>/</span>
              <span className="text-white/70">{title}</span>
            </nav>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[4px] text-green-eco">
              Sammenligning
            </p>

            <h1 className="font-display text-3xl font-extrabold italic leading-tight text-white md:text-4xl lg:text-5xl">
              {title}
            </h1>

            <p className="mt-4 max-w-lg font-body text-base leading-relaxed text-white/60">
              {rows.length} kategorier sammenlignet
            </p>
          </div>

          {/* Image side */}
          <div className="relative hidden aspect-square md:block">
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-charcoal to-transparent" />
            <Image
              src={image}
              alt={title}
              fill
              priority
              className="object-contain object-center p-12"
              sizes="50vw"
            />
          </div>
        </div>
      </section>

      {/* Intro + Comparison table */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          {/* Intro paragraph */}
          <p className="mb-12 rounded-2xl border-l-4 border-green-eco bg-white p-6 font-body text-lg leading-relaxed text-charcoal/80 shadow-sm md:p-8">
            {intro}
          </p>

          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-2xl border border-sand text-left">
              <thead>
                <tr>
                  <th className="bg-cream px-5 py-4 font-display text-sm font-bold uppercase tracking-wider text-charcoal">
                    Funktion
                  </th>
                  <th className="bg-green-eco px-5 py-4 font-display text-sm font-bold uppercase tracking-wider text-white">
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      PhoneSpot
                    </span>
                  </th>
                  <th className="bg-charcoal px-5 py-4 font-display text-sm font-bold uppercase tracking-wider text-white/70">
                    {competitor}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const advantage = isPhonespotAdvantage(
                    row.phonespot,
                    row.competitor,
                  );
                  const rowBg =
                    index % 2 === 0 ? "bg-white" : "bg-warm-white";

                  return (
                    <tr key={row.feature} className={rowBg}>
                      <td className="border-t border-sand px-5 py-4 font-display text-sm font-semibold text-charcoal">
                        {row.feature}
                      </td>
                      <td
                        className={`border-t border-sand px-5 py-4 text-sm ${
                          advantage
                            ? "font-semibold text-green-eco"
                            : "text-charcoal/80"
                        }`}
                      >
                        {advantage && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="mr-1.5 inline-block h-4 w-4"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {row.phonespot}
                      </td>
                      <td className="border-t border-sand px-5 py-4 text-sm text-charcoal/80">
                        {row.competitor}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Verdict */}
          <div className="mt-12 rounded-2xl border border-green-eco/20 bg-green-eco/5 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-eco/15">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-green-eco"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <Heading as="h2" size="sm" className="mb-3">
                  Vores vurdering
                </Heading>
                <p className="font-body leading-relaxed text-charcoal/80">
                  {verdict}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* FAQ */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl">
          <Heading as="h2" size="md" className="mb-10 text-center">
            Ofte stillede sp&oslash;rgsm&aring;l
          </Heading>
          <FaqAccordion items={faq} />
        </div>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper background="green" className="!py-16">
        <div className="text-center">
          <Heading as="h2" size="md" className="!text-white">
            Klar til at handle hos PhoneSpot?
          </Heading>
          <p className="mx-auto mt-3 max-w-xl font-body text-white/70">
            Udforsk vores udvalg af kvalitetstestede refurbished produkter med
            36 m&aring;neders garanti og prismatch.
          </p>
          <Link
            href="/iphones"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-charcoal transition-opacity hover:opacity-90"
          >
            Se iPhones
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </SectionWrapper>
    </>
  );
}
