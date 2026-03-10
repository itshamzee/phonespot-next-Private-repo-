import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES, type StoreLocationConfig } from "@/lib/store-config";

/* ------------------------------------------------------------------ */
/*  Static params                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return Object.values(STORES).map((store) => ({
    slug: store.slug,
  }));
}

/* ------------------------------------------------------------------ */
/*  Dynamic metadata                                                   */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = STORES[slug];
  if (!store) return {};

  const title = `${store.name} — Besøg os${store.mall ? ` i ${store.mall}` : ""}`;
  const description = `Besøg ${store.name}${store.mall ? ` i ${store.mall}` : ""}, ${store.city}. Reparation, personlig rådgivning og refurbished elektronik med 36 mdr. garanti.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://phonespot.dk/butik/${store.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/butik/${store.slug}`,
      type: "website",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PhoneCallIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ data per store                                                 */
/* ------------------------------------------------------------------ */

function getFAQs(store: StoreLocationConfig) {
  return [
    {
      question: `Hvor ligger ${store.name}?`,
      answer: `${store.name} ligger på ${store.street}, ${store.zip} ${store.city}${store.mall ? ` i ${store.mall}` : ""}. Du kan finde os på Google Maps via linket på denne side.`,
    },
    {
      question: `Hvad er åbningstiderne for ${store.name}?`,
      answer: `Vi har åbent mandag til fredag ${store.hours.weekdays}, lørdag ${store.hours.saturday} og søndag ${store.hours.sunday}${store.mall ? `. Vi følger ${store.mall}s åbningstider, som kan variere på helligdage` : ""}.`,
    },
    {
      question: `Kan jeg komme forbi uden tidsbestilling?`,
      answer: `Ja, du er altid velkommen til at kigge forbi ${store.name} uden tidsbestilling. For reparationer anbefaler vi dog at booke online på forhånd, så vi kan have de rette reservedele klar.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Services links                                                     */
/* ------------------------------------------------------------------ */

const STORE_SERVICES = [
  {
    title: "iPhone Reparation",
    description: "Professionel reparation med livstidsgaranti",
    href: "/reparation",
  },
  {
    title: "Sælg din enhed",
    description: "Fair pris og hurtig betaling",
    href: "/saelg-din-enhed",
  },
  {
    title: "Refurbished iPhones",
    description: "Kvalitetstestet med 36 mdr. garanti",
    href: "/iphones",
  },
  {
    title: "Tilbehør",
    description: "Covers, panserglas og opladere",
    href: "/tilbehoer",
  },
];

/* ------------------------------------------------------------------ */
/*  JSON-LD builder                                                    */
/* ------------------------------------------------------------------ */

function buildJsonLd(store: StoreLocationConfig): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ElectronicsRepair",
    name: store.name,
    image: "https://phonespot.dk/brand/logo.svg",
    url: `https://phonespot.dk/butik/${store.slug}`,
    telephone: store.phone,
    email: store.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.street,
      addressLocality: store.city,
      postalCode: store.zip,
      addressCountry: store.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: store.coordinates.lat,
      longitude: store.coordinates.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "16:00",
      },
    ],
    priceRange: "$$",
  };
}

/* ------------------------------------------------------------------ */
/*  OpenNowBadge (client-rendered via suppressHydrationWarning)        */
/* ------------------------------------------------------------------ */

function OpenNowBadge() {
  // This renders statically; for true dynamic behavior we'd need a client component.
  // Keeping it simple with a note that hours are shown below.
  return null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = STORES[slug];

  if (!store) {
    notFound();
  }

  const otherStores = Object.values(STORES).filter((s) => s.slug !== slug);
  const faqs = getFAQs(store);

  return (
    <>
      <JsonLd data={buildJsonLd(store)} />

      {/* -- Hero -- */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Fysisk butik
            </p>
            <Heading size="xl" className="text-white">
              {store.name}
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              {store.mall
                ? `Besøg os i ${store.mall}, ${store.city}. Vi tilbyder reparation, refurbished elektronik, opkøb og personlig rådgivning.`
                : `Besøg os i ${store.city}. Vi tilbyder reparation, refurbished elektronik, opkøb og personlig rådgivning.`}
            </p>
            {store.mall && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5">
                <StorefrontIcon className="h-5 w-5 text-green-eco" />
                <span className="text-sm font-semibold text-white">
                  {store.mall}
                </span>
              </div>
            )}
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* -- Google Maps embed -- */}
      <section className="bg-warm-white">
        <FadeIn>
          <iframe
            src={store.googleMapsEmbed}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Google Maps — ${store.name}`}
            className="w-full"
          />
        </FadeIn>
      </section>

      {/* -- Info grid: Address + Hours -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Address card */}
            <FadeIn>
              <div className="flex h-full gap-5 rounded-2xl border border-soft-grey bg-white p-6 md:p-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-eco/10">
                  <MapPinIcon className="h-6 w-6 text-green-eco" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-charcoal">
                    Adresse
                  </h2>
                  <p className="mt-2 text-sm text-gray">{store.company}</p>
                  <p className="text-sm text-gray">{store.street}</p>
                  <p className="text-sm text-gray">
                    {store.zip} {store.city}
                  </p>
                  <p className="mt-2 text-sm text-gray">
                    Tlf:{" "}
                    <a
                      href={`tel:${store.phone.replace(/\s/g, "")}`}
                      className="text-green-eco hover:underline"
                    >
                      {store.phone}
                    </a>
                  </p>
                  <p className="text-sm text-gray">
                    Email:{" "}
                    <a
                      href={`mailto:${store.email}`}
                      className="text-green-eco hover:underline"
                    >
                      {store.email}
                    </a>
                  </p>
                  {store.googleMapsUrl && (
                    <a
                      href={store.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-eco hover:underline"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      Se på Google Maps &rarr;
                    </a>
                  )}
                </div>
              </div>
            </FadeIn>

            {/* Hours card */}
            <FadeIn delay={0.1}>
              <div className="flex h-full gap-5 rounded-2xl border border-soft-grey bg-white p-6 md:p-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-eco/10">
                  <ClockIcon className="h-6 w-6 text-green-eco" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-charcoal">
                    Åbningstider
                  </h2>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray">Mandag – Fredag</span>
                      <span className="font-medium text-charcoal">
                        {store.hours.weekdays}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray">Lørdag</span>
                      <span className="font-medium text-charcoal">
                        {store.hours.saturday}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray">Søndag</span>
                      <span className="font-medium text-charcoal">
                        {store.hours.sunday}
                      </span>
                    </div>
                  </div>
                  {store.mall && (
                    <p className="mt-4 text-xs text-gray">
                      Følger {store.mall}s åbningstider. Kan variere på helligdage.
                    </p>
                  )}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </SectionWrapper>

      {/* -- Services section -- */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Services
              </p>
              <Heading as="h2" size="md">
                Det kan du hos {store.name}
              </Heading>
            </div>
          </FadeIn>
          <div className="grid gap-4 sm:grid-cols-2">
            {STORE_SERVICES.map((service, i) => (
              <FadeIn key={service.title} delay={i * 0.08}>
                <Link
                  href={service.href}
                  className="flex items-center gap-4 rounded-2xl border border-soft-grey bg-white p-5 transition-all hover:border-green-eco/30 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-eco/10 text-green-eco">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-display font-bold text-charcoal">
                      {service.title}
                    </p>
                    <p className="text-sm text-gray">{service.description}</p>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* -- Other store -- */}
      {otherStores.length > 0 && (
        <SectionWrapper>
          <div className="mx-auto max-w-2xl">
            <FadeIn>
              <div className="rounded-2xl border border-soft-grey bg-white p-6 text-center shadow-sm md:p-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                  Mere PhoneSpot
                </p>
                <h2 className="font-display text-xl font-bold text-charcoal">
                  Du kan også besøge
                </h2>
                {otherStores.map((other) => (
                  <div key={other.slug} className="mt-4">
                    <p className="text-lg font-bold text-charcoal">
                      {other.name}
                    </p>
                    <p className="text-sm text-gray">
                      {other.street}, {other.zip} {other.city}
                      {other.mall ? ` (${other.mall})` : ""}
                    </p>
                    <Link
                      href={`/butik/${other.slug}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-eco px-6 py-3 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25"
                    >
                      Se butik
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </SectionWrapper>
      )}

      {/* -- FAQ section -- */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="mb-8 text-center">
              <Heading as="h2" size="md">
                Ofte stillede spørgsmål
              </Heading>
            </div>
          </FadeIn>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="rounded-2xl border border-soft-grey bg-white p-6">
                  <h3 className="font-display text-base font-bold text-charcoal">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray">
                    {faq.answer}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* -- Trust bar -- */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
