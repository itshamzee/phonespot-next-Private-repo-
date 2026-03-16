import type { Metadata } from "next";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { TrustBar } from "@/components/ui/trust-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { AccessoryGrid } from "@/components/tilbehoer/accessory-grid";
import { TILBEHOER_CATEGORIES } from "@/lib/tilbehoer-config";

export const metadata: Metadata = {
  title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
  description:
    "Covers, panserglas, opladere, kabler og tilbehør til din telefon og tablet. Altid hurtig levering og skarpe priser hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/tilbehoer" },
  openGraph: {
    title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
    description:
      "Covers, panserglas, opladere, kabler og tilbehør til din telefon og tablet.",
    url: "https://phonespot.dk/tilbehoer",
  },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  covers: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3"
      />
    </svg>
  ),
  skaermbeskyttelse: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  ),
  opladere: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  ),
  lyd: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
      />
    </svg>
  ),
  outlet: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h.008v.008H6V6z"
      />
    </svg>
  ),
};

export default function TilbehoerPage() {
  const breadcrumbJsonLd = {
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
        name: "Tilbehør",
        item: "https://phonespot.dk/tilbehoer",
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-charcoal">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 30px, currentColor 30px, currentColor 31px)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[4px] text-green-eco">
            Tilbehoer
          </p>
          <h1 className="font-display text-4xl font-extrabold italic text-white md:text-5xl">
            Alt tilbehoer til din enhed
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
            Covers, panserglas, opladere og kabler. Afhendt i butikken eller
            fa det leveret.
          </p>
        </div>
      </section>

      {/* Category cards */}
      <SectionWrapper className="!py-10 md:!py-12">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {TILBEHOER_CATEGORIES.map((cat) => (
            <a
              key={cat.slug}
              href={`#${cat.slug}`}
              className="group relative rounded-2xl border border-sand bg-white p-5 text-center transition-all hover:border-green-eco/30 hover:shadow-md"
            >
              {cat.slug === "outlet" && (
                <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  SALE
                </span>
              )}
              <div className="flex justify-center text-charcoal/40 transition-colors group-hover:text-green-eco">
                {CATEGORY_ICONS[cat.slug]}
              </div>
              <h3 className="mt-3 font-display text-sm font-bold text-charcoal md:text-base">
                {cat.label}
              </h3>
              <p className="mt-1 hidden text-xs text-charcoal/50 md:block">
                {cat.description}
              </p>
            </a>
          ))}
        </div>
      </SectionWrapper>

      {/* Product grid with filters */}
      <SectionWrapper background="sand" className="!pt-0 md:!pt-0">
        <AccessoryGrid />
      </SectionWrapper>

      {/* Why PhoneSpot accessories */}
      <SectionWrapper background="cream">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-charcoal md:text-3xl">
            Hvorfor koebe tilbehoer hos PhoneSpot?
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Altid skarpe priser",
              description:
                "Vi holder priserne lave uden at ga pa kompromis med kvaliteten. Sammenlign selv.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 6h.008v.008H6V6z"
                  />
                </svg>
              ),
            },
            {
              title: "Hurtig levering",
              description:
                "Bestil i dag og modtag i morgen. Eller hent i vores butik i VestsjællandsCentret, Slagelse.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                  />
                </svg>
              ),
            },
            {
              title: "Ekspertradgivning",
              description:
                "Usikker pa hvad der passer til din enhed? Vores team hjaelper dig med at finde det rigtige.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                  />
                </svg>
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-2xl border border-sand/60 bg-white p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-eco/10 text-green-eco">
                {item.icon}
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-charcoal/60">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <TrustBar />
    </>
  );
}
