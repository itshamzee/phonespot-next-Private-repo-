import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { STORES, type StoreLocationConfig } from "@/lib/store-config";
import { VejleEmailSignup } from "./vejle-email-signup";

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

  if (slug === "vejle" || store.street === "TBD") {
    return {
      title: "PhoneSpot Vejle — Åbner april 2026",
      description:
        "PhoneSpot åbner snart en ny butik i Vejle. Tilmeld dig og få besked, når vi åbner.",
      alternates: {
        canonical: "https://phonespot.dk/butik/vejle",
      },
      openGraph: {
        title: "PhoneSpot Vejle — Åbner april 2026",
        description:
          "PhoneSpot åbner snart en ny butik i Vejle. Tilmeld dig og få besked, når vi åbner.",
        url: "https://phonespot.dk/butik/vejle",
        type: "website",
      },
    };
  }

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

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function CashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ data per store                                                 */
/* ------------------------------------------------------------------ */

function getSlagelseFAQs(): Array<{ question: string; answer: string }> {
  return [
    {
      question: "Hvad er åbningstiderne i Slagelse?",
      answer:
        "Vi har åbent mandag til fredag 10:00–19:00 og lørdag til søndag 10:00–17:00. Vi holder åbent i VestsjællandsCentret og følger shoppingcenterets eventuelle afvigelser på helligdage.",
    },
    {
      question: "Er der parkering ved butikken?",
      answer:
        "Ja, VestsjællandsCentret har gratis parkering til alle kunder. Der er adgang fra Løvegade og Parkvej med plads til over 1.000 biler.",
    },
    {
      question: "Kan jeg komme ind med min telefon til reparation uden tidsbestilling?",
      answer:
        "Ja, vi tager imod walk-in reparationer. 90% af alle skærmskift og batteriskift er klar inden for 30 minutter. For mere komplekse reparationer anbefaler vi at booke online, så vi kan have reservedelene klar.",
    },
    {
      question: "Hvad kan jeg forvente at få for min brugte iPhone?",
      answer:
        "Prisen afhænger af model, stand og lagerkapacitet. Brug vores online prisberegner for et øjeblikkeligt tilbud, eller kom forbi butikken for en gratis vurdering — vi betaler kontant med det samme.",
    },
    {
      question: "Hvad sker der med min data, når jeg sælger min telefon?",
      answer:
        "Inden vi overtager enheden, sørger vi for at guide dig igennem en fuld fabriksgennemstilling, så alle dine personlige data er slettet. Du kan også gøre det selv hjemmefra via iCloud eller Google-konto.",
    },
  ];
}

function getGenericFAQs(store: StoreLocationConfig): Array<{ question: string; answer: string }> {
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
        closes: "19:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday"],
        opens: "10:00",
        closes: "17:00",
      },
    ],
    priceRange: "$$",
  };
}

/* ------------------------------------------------------------------ */
/*  Vejle "coming soon" page                                           */
/* ------------------------------------------------------------------ */

function VejleComingSoonPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#1A3D2E] py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <FadeIn>
            <p className="mb-4 text-sm font-semibold tracking-wide text-white/60">
              Åbner snart
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
              PhoneSpot Vejle — åbner april 2026
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Vi glæder os til at byde dig velkommen i vores nye butik i Vejle.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="mt-10">
              <p className="mb-4 text-sm font-semibold text-white/80">
                Tilmeld dig og få besked når vi åbner
              </p>
              <VejleEmailSignup />
            </div>
          </FadeIn>

          <FadeIn delay={0.25}>
            <p className="mt-10 text-sm font-medium tracking-wide text-white/50">
              36 mdr. garanti · Professionel reparation · Opkøb af brugt elektronik
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Link back to Slagelse */}
      <SectionWrapper>
        <div className="mx-auto max-w-xl text-center">
          <FadeIn>
            <p className="mb-4 text-[#6E6E73]">
              Mens du venter kan du besøge os i Slagelse.
            </p>
            <Link
              href="/butik/slagelse"
              className="inline-flex items-center gap-2 text-base font-semibold text-[#1A3D2E] hover:underline"
            >
              Besøg os i Slagelse imens
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </SectionWrapper>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Slagelse store cards data                                          */
/* ------------------------------------------------------------------ */

const SLAGELSE_ACTIVITIES = [
  {
    icon: ShoppingBagIcon,
    title: "K\u00f8b refurbished",
    description: "Se og test enheder f\u00f8r du k\u00f8ber. iPhones, iPads, b\u00e6rbare og mere.",
    href: "/iphones",
    cta: "Se udvalg",
  },
  {
    icon: WrenchIcon,
    title: "Reparation",
    description: "iPhone, iPad, Samsung, MacBook. Walk-in, 90% klar p\u00e5 30 min. Livstidsgaranti.",
    href: "/reparation/booking",
    cta: "Book tid nu",
  },
  {
    icon: CashIcon,
    title: "S\u00e6lg din enhed",
    description: "F\u00e5 straksoverf\u00f8rsel for din brugte elektronik. Alle m\u00e6rker, uanset stand.",
    href: "/saelg-din-enhed",
    cta: "F\u00e5 et tilbud",
  },
  {
    icon: PackageIcon,
    title: "Click & Collect",
    description: "Bestil online, hent gratis i butikken. Klar samme dag ved bestilling f\u00f8r kl. 16.",
    href: "/iphones",
    cta: "Bestil nu",
    badge: "GRATIS",
  },
];

/* ------------------------------------------------------------------ */
/*  Slagelse full redesign page                                        */
/* ------------------------------------------------------------------ */

function SlagelsePage({ store }: { store: StoreLocationConfig }) {
  const faqs = getSlagelseFAQs();

  return (
    <>
      <JsonLd data={buildJsonLd(store)} />

      {/* Hero with workshop background */}
      <section className="relative overflow-hidden rounded-none">
        <div className="relative h-[480px] md:h-[540px]">
          <Image
            src="/images/lifestyle/workshop.jpg"
            alt="PhoneSpot Slagelse værksted"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Green overlay */}
          <div className="absolute inset-0 bg-[#1A3D2E]/75" />

          <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
            <FadeIn>
              <p className="mb-3 text-sm font-semibold tracking-wide text-white/60">
                Fysisk butik · VestsjællandsCentret
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
                PhoneSpot Slagelse
              </h1>
              <p className="mt-3 text-base text-white/80 md:text-lg">
                VestsjællandsCentret 10, 4200 Slagelse
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={store.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
                >
                  <MapPinIcon className="h-4 w-4" />
                  Se rute
                </a>
                <a
                  href={`tel:${store.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <PhoneCallIcon className="h-4 w-4" />
                  Ring til os
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Store info: Google Maps + Hours + Contact */}
      <SectionWrapper>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Google Maps embed */}
            <FadeIn className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-[#E5E5EA]">
                <iframe
                  src={store.googleMapsEmbed}
                  width="100%"
                  height="320"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Google Maps — ${store.name}`}
                  className="w-full"
                />
              </div>
            </FadeIn>

            {/* Address + Hours + Contact */}
            <div className="flex flex-col gap-4">
              {/* Address */}
              <FadeIn delay={0.05}>
                <div className="flex gap-4 rounded-2xl border border-[#E5E5EA] bg-white p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                    <MapPinIcon className="h-5 w-5 text-[#1A3D2E]" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-[#111111]">Adresse</p>
                    <p className="mt-1 text-sm text-[#6E6E73]">{store.street}</p>
                    <p className="text-sm text-[#6E6E73]">{store.zip} {store.city}</p>
                    <a
                      href={store.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1A3D2E] hover:underline"
                    >
                      Se på Google Maps
                      <ChevronRightIcon className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </FadeIn>

              {/* Hours */}
              <FadeIn delay={0.1}>
                <div className="flex gap-4 rounded-2xl border border-[#E5E5EA] bg-white p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                    <ClockIcon className="h-5 w-5 text-[#1A3D2E]" />
                  </div>
                  <div className="w-full">
                    <p className="font-display text-sm font-bold text-[#111111]">Åbningstider</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#6E6E73]">Man–Fre</span>
                        <span className="font-medium text-[#111111]">10–19</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#6E6E73]">Lør–Søn</span>
                        <span className="font-medium text-[#111111]">10–17</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>

              {/* Contact */}
              <FadeIn delay={0.15}>
                <div className="flex gap-4 rounded-2xl border border-[#E5E5EA] bg-white p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                    <PhoneCallIcon className="h-5 w-5 text-[#1A3D2E]" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-[#111111]">Kontakt</p>
                    <a
                      href={`tel:${store.phone.replace(/\s/g, "")}`}
                      className="mt-1 block text-sm text-[#1A3D2E] hover:underline"
                    >
                      {store.phone}
                    </a>
                    <a
                      href={`mailto:${store.email}`}
                      className="block text-sm text-[#1A3D2E] hover:underline"
                    >
                      {store.email}
                    </a>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* "Hvad kan du i butikken?" */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="mb-10 text-center">
              <Heading as="h2" size="md">
                Hvad kan du i butikken?
              </Heading>
              <p className="mx-auto mt-3 max-w-xl text-base text-[#6E6E73]">
                Fra salg og reparation til opkøb og afhentning — alt samlet ét sted.
              </p>
            </div>
          </FadeIn>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SLAGELSE_ACTIVITIES.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.07}>
                <Link href={item.href} className="group flex flex-col items-start rounded-2xl border border-[#E5E5EA] bg-white p-6 transition-all hover:border-[#1A3D2E]/30 hover:shadow-md">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                      <item.icon className="h-5 w-5 text-[#1A3D2E]" />
                    </div>
                    {"badge" in item && item.badge && (
                      <span className="rounded-full bg-[#1A3D2E] px-2.5 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 font-display text-base font-bold text-[#111111]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#6E6E73]">
                    {item.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#1A3D2E] transition-transform group-hover:translate-x-0.5">
                    {item.cta} &rarr;
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* Click & Collect banner */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border-2 border-[#1A3D2E]/20 bg-[#EFF5F1]">
          <div className="p-8 md:p-10">
            <div className="mb-6 text-center">
              <Heading as="h2" size="md">
                Click &amp; Collect — bestil online, hent i butikken
              </Heading>
              <p className="mt-2 text-base text-[#6E6E73]">
                Gratis afhentning i Slagelse. Klar samme dag ved bestilling f&oslash;r kl. 16.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { step: "1", title: "Bestil online", desc: "V\u00e6lg din enhed og l\u00e6g i kurven" },
                { step: "2", title: "Modtag bekr\u00e6ftelse", desc: "Vi pakker din ordre klar" },
                { step: "3", title: "Hent i butikken", desc: "Test enheden f\u00f8r du tager den med" },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3D2E] text-sm font-bold text-white">{s.step}</span>
                  <p className="mt-3 font-display text-sm font-bold text-[#111111]">{s.title}</p>
                  <p className="mt-1 text-xs text-[#6E6E73]">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/iphones" className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg">
                Bestil nu og hent i butikken &rarr;
              </Link>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Reparation i butikken */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <Heading as="h2" size="md">
              Reparation i butikken
            </Heading>
            <p className="mt-2 text-base text-[#6E6E73]">
              Walk-in service — ingen tidsbestilling n&oslash;dvendig
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { brand: "iPhone", models: "7, 8, X, XR, XS, 11, 12, 13, 14, 15, SE", popular: "Sk\u00e6rmskift, batteriskift" },
              { brand: "Samsung", models: "Galaxy S21-S25, A-serie, Fold, Flip", popular: "Sk\u00e6rmskift, batteriskift" },
              { brand: "iPad", models: "Air, Pro, Mini, 6-10. gen", popular: "Sk\u00e6rmskift, batteriskift" },
              { brand: "MacBook", models: "Air, Pro (alle \u00e5rgange)", popular: "Batteri, tastatur, sk\u00e6rm" },
              { brand: "Huawei", models: "P-serie, Mate-serie", popular: "Sk\u00e6rmskift" },
              { brand: "Andre m\u00e6rker", models: "OnePlus, Xiaomi, Google Pixel", popular: "Kontakt os for pris" },
            ].map((item) => (
              <div key={item.brand} className="rounded-xl border border-[#E5E5EA] bg-white p-5">
                <p className="font-display text-base font-bold text-[#111111]">{item.brand}</p>
                <p className="mt-1 text-xs text-[#6E6E73]">{item.models}</p>
                <p className="mt-2 text-xs font-semibold text-[#1A3D2E]">{item.popular}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/reparation/booking" className="rounded-full bg-[#1A3D2E] px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45]">
              Book tid nu &rarr;
            </Link>
            <Link href="/reparation" className="rounded-full border-2 border-[#111111] px-7 py-3.5 text-sm font-bold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white">
              Se alle priser
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* SEO content */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl space-y-10">
          <FadeIn>
            <div>
              <Heading as="h2" size="sm" className="mb-3">
                iPhone reparation i Slagelse
              </Heading>
              <p className="text-base leading-relaxed text-[#6E6E73]">
                Hos PhoneSpot Slagelse tilbyder vi professionel iPhone reparation uden forudgående tidsbestilling. Vi skifter skærme, batterier, opladesporte og meget mere — og 90% af reparationerne er klar inden for 30 minutter, mens du handler i VestsjællandsCentret. Alle reparationer udføres med kvalitetsdele og er dækket af vores livstidsgaranti.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div>
              <Heading as="h2" size="sm" className="mb-3">
                Køb brugte iPhones i Slagelse
              </Heading>
              <p className="text-base leading-relaxed text-[#6E6E73]">
                Vi fører et bredt udvalg af refurbished iPhones i grade A og B — alle grundigt testet, renset og klar til brug. Når du køber hos PhoneSpot Slagelse, medfølger 36 måneders garanti og fuld returret. Du kan se og teste enhederne fysisk i butikken, inden du beslutter dig.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div>
              <Heading as="h2" size="sm" className="mb-3">
                Sælg din brugte telefon i Slagelse
              </Heading>
              <p className="text-base leading-relaxed text-[#6E6E73]">
                Har du en gammel iPhone, Samsung eller iPad liggende? Kig forbi vores butik i VestsjællandsCentret for en gratis og uforpligtende vurdering. Vi køber brugte enheder op og betaler kontant med det samme — ingen ventetid, ingen besvær. Brug vores online prisberegner for et øjeblikkeligt estimat inden dit besøg.
              </p>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* FAQ */}
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
              <FadeIn key={i} delay={i * 0.07}>
                <div className="rounded-2xl border border-[#E5E5EA] bg-white p-6">
                  <h3 className="font-display text-base font-bold text-[#111111]">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]">
                    {faq.answer}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* Trustpilot reviews */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="mb-8 text-center">
              <Heading as="h2" size="md">
                Hvad siger vores kunder?
              </Heading>
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <TrustpilotReviews />
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* Trust bar */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Generic store page (fallback for future stores)                   */
/* ------------------------------------------------------------------ */

function GenericStorePage({ store }: { store: StoreLocationConfig }) {
  const faqs = getGenericFAQs(store);

  return (
    <>
      <JsonLd data={buildJsonLd(store)} />

      {/* Hero */}
      <section className="bg-[#F7F7F8] py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeIn>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Fysisk butik
            </p>
            <Heading size="xl" className="!text-[#111111]">
              {store.name}
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6E6E73]">
              {store.mall
                ? `Besøg os i ${store.mall}, ${store.city}. Vi tilbyder reparation, refurbished elektronik, opkøb og personlig rådgivning.`
                : `Besøg os i ${store.city}. Vi tilbyder reparation, refurbished elektronik, opkøb og personlig rådgivning.`}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Google Maps embed */}
      <section className="bg-white">
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

      {/* Info grid */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2">
            <FadeIn>
              <div className="flex h-full gap-5 rounded-2xl border border-[#E5E5EA] bg-white p-6 md:p-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                  <MapPinIcon className="h-6 w-6 text-[#1A3D2E]" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#111111]">Adresse</h2>
                  <p className="mt-2 text-sm text-[#6E6E73]">{store.company}</p>
                  <p className="text-sm text-[#6E6E73]">{store.street}</p>
                  <p className="text-sm text-[#6E6E73]">{store.zip} {store.city}</p>
                  <p className="mt-2 text-sm text-[#6E6E73]">
                    Tlf:{" "}
                    <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="text-[#1A3D2E] hover:underline">
                      {store.phone}
                    </a>
                  </p>
                  <p className="text-sm text-[#6E6E73]">
                    Email:{" "}
                    <a href={`mailto:${store.email}`} className="text-[#1A3D2E] hover:underline">
                      {store.email}
                    </a>
                  </p>
                  {store.googleMapsUrl && (
                    <a
                      href={store.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3D2E] hover:underline"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      Se på Google Maps &rarr;
                    </a>
                  )}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="flex h-full gap-5 rounded-2xl border border-[#E5E5EA] bg-white p-6 md:p-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                  <ClockIcon className="h-6 w-6 text-[#1A3D2E]" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#111111]">Åbningstider</h2>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#6E6E73]">Mandag – Fredag</span>
                      <span className="font-medium text-[#111111]">{store.hours.weekdays}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#6E6E73]">Lørdag</span>
                      <span className="font-medium text-[#111111]">{store.hours.saturday}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#6E6E73]">Søndag</span>
                      <span className="font-medium text-[#111111]">{store.hours.sunday}</span>
                    </div>
                  </div>
                  {store.mall && (
                    <p className="mt-4 text-xs text-[#6E6E73]">
                      Følger {store.mall}s åbningstider. Kan variere på helligdage.
                    </p>
                  )}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </SectionWrapper>

      {/* FAQ */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="mb-8 text-center">
              <Heading as="h2" size="md">Ofte stillede spørgsmål</Heading>
            </div>
          </FadeIn>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="rounded-2xl border border-[#E5E5EA] bg-white p-6">
                  <h3 className="font-display text-base font-bold text-[#111111]">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]">{faq.answer}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* Trust bar */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
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

  // Vejle: coming soon page
  if (slug === "vejle" || store.street === "TBD") {
    return <VejleComingSoonPage />;
  }

  // Slagelse: full redesigned page
  if (slug === "slagelse") {
    return <SlagelsePage store={store} />;
  }

  // Fallback for any future stores
  return <GenericStorePage store={store} />;
}
