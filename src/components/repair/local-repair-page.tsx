import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES, openingHoursJsonLd } from "@/lib/store-config";
import {
  LOCAL_REPAIR_TOWNS,
  SATELLITE_TOWN_KEYS,
  SITE_URL,
  type LocalRepairTown,
} from "@/lib/local-repair-towns";
import type { RepairPriceSummary } from "@/lib/supabase/repairs";

export const LOCAL_PRICE_MODELS = [
  { brand: "iphone", model: "iphone-16" },
  { brand: "iphone", model: "iphone-15" },
  { brand: "iphone", model: "iphone-14" },
  { brand: "iphone", model: "iphone-13" },
  { brand: "iphone", model: "iphone-12" },
  { brand: "iphone", model: "iphone-11" },
  { brand: "samsung", model: "galaxy-s24" },
  { brand: "samsung", model: "galaxy-s23" },
  { brand: "samsung", model: "galaxy-a55" },
];

const WARRANTY_TERMS = [
  {
    title: "Det dækker",
    text: "Fejl på den del, vi har skiftet, og på vores arbejde. Opstår den samme fejl igen, reparerer vi den uden beregning, så længe du ejer enheden.",
  },
  {
    title: "Det dækker ikke",
    text: "Nye skader som fald, slag, tryk og væske, eller hvis enheden efterfølgende er åbnet af andre. Et batteris naturlige kapacitetsfald over tid er ikke en fejl.",
  },
  {
    title: "Særlige reparationer",
    text: "Behandling af vandskade har 3 måneders garanti. For laptops, konsoller og diagnose gælder vilkårene ved den enkelte reparation.",
  },
  {
    title: "Ved indsendelse",
    text: "Garantien er den samme, uanset om du afleverer enheden i butikken eller sender den ind med en gratis fragtlabel.",
  },
];

const formatKr = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("da-DK")} kr.`;

const phoneHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

type Props = {
  town: LocalRepairTown;
  prices: RepairPriceSummary[];
};

export function LocalRepairPage({ town, prices }: Props) {
  const store = STORES[town.storeSlug];
  const isVejle = town.storeSlug === "vejle";
  const isHomeTown = store.city === town.name;
  const pageUrl = `${SITE_URL}${town.path}`;
  const bookingHref = `/reparation/booking?store=${store.slug}`;
  const bookLabel = `Book og kom forbi i ${store.city}`;
  const mailInLabel = "Send din telefon ind";

  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "ElectronicsRepair",
    name: store.name,
    image: `${SITE_URL}/brand/logo.png`,
    url: pageUrl,
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
    openingHoursSpecification: openingHoursJsonLd(store.hours),
    areaServed: { "@type": "City", name: town.name },
    priceRange: "$$",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: town.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Reparation", item: `${SITE_URL}/reparation` },
      { "@type": "ListItem", position: 3, name: `Reparation ${town.name}`, item: pageUrl },
    ],
  };

  const heroTiles = [
    { title: "Livstidsgaranti", desc: "På arbejde og dele" },
    { title: "30 minutter", desc: "90% klar mens du venter" },
    { title: "Gratis diagnose", desc: "I butikken, uden tidsbestilling" },
    isVejle
      ? { title: "Gratis parkering", desc: "Ved butikken i Vejle" }
      : { title: "Gratis fragtlabel", desc: "Hvis du sender ind" },
  ];

  const satellites = SATELLITE_TOWN_KEYS.map((key) => LOCAL_REPAIR_TOWNS[key]).filter(
    (t) => t.path !== town.path,
  );

  return (
    <>
      <JsonLd data={businessJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      {/* Breadcrumb */}
      <nav aria-label="Brødkrumme" className="border-b border-[#E5E5EA] bg-white">
        <ol className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3 text-xs text-[#6E6E73]">
          <li>
            <Link href="/" className="hover:text-[#1A3D2E] hover:underline">
              Forside
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/reparation" className="hover:text-[#1A3D2E] hover:underline">
              Reparation
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-[#111111]">
            {town.name}
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-[#1A3D2E] py-20 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/60">
            Telefon- og tabletreparation
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            {town.h1}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            {town.heroLead}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href={bookingHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              {bookLabel}
            </Link>
            <Link
              href="/reparation/indsend"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              {mailInLabel}
            </Link>
          </div>

          <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-6 sm:grid-cols-4">
            {heroTiles.map(({ title, desc }) => (
              <div key={title}>
                <dt className="text-sm font-bold text-white">{title}</dt>
                <dd className="mt-0.5 text-xs text-white/60">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Town-specific intro */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-3xl space-y-5 px-4">
          {town.intro.map((paragraph) => (
            <p key={paragraph} className="text-base leading-relaxed text-[#444449]">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* How to get here */}
      <section
        className="border-y border-[#E5E5EA] bg-[#F7F7F8] py-16"
        aria-labelledby="vej-til-os"
      >
        <div className="mx-auto grid max-w-4xl gap-10 px-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Sådan kommer du til os
            </p>
            <p className="font-display text-5xl font-bold leading-none tracking-tight text-[#1A3D2E]">
              {town.travel.headline}
            </p>
            <p className="mt-3 text-sm text-[#6E6E73]">{town.travel.caption}</p>
          </div>
          <div>
            <h2
              id="vej-til-os"
              className="font-display text-2xl font-bold tracking-tight text-[#111111]"
            >
              {isHomeTown ? `Find ${store.name}` : `Fra ${town.name} til ${store.name}`}
            </h2>
            {town.travel.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-base leading-relaxed text-[#6E6E73]">
                {paragraph}
              </p>
            ))}

            <div className="mt-6 grid gap-6 border-t border-[#E5E5EA] pt-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-bold text-[#111111]">Adresse</p>
                <p className="mt-1 text-sm text-[#6E6E73]">{store.street}</p>
                <p className="text-sm text-[#6E6E73]">
                  {store.zip} {store.city}
                </p>
                <a
                  href={store.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-[#1A3D2E] hover:underline"
                >
                  Se på Google Maps
                </a>
              </div>
              <div>
                <p className="text-sm font-bold text-[#111111]">Åbningstider</p>
                <div className="mt-1 space-y-1 text-sm text-[#6E6E73]">
                  <p className="flex justify-between gap-3">
                    <span>Man–Fre</span>
                    <span className="font-medium text-[#111111]">{store.hours.weekdays}</span>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span>Lørdag</span>
                    <span className="font-medium text-[#111111]">{store.hours.saturday}</span>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span>Søndag</span>
                    <span className="font-medium text-[#111111]">{store.hours.sunday}</span>
                  </p>
                </div>
                <a
                  href={phoneHref(store.phone)}
                  className="mt-3 inline-block text-sm font-semibold text-[#1A3D2E] hover:underline"
                >
                  Ring {store.phone}
                </a>
              </div>
            </div>

            {town.nearbyLine && (
              <p className="mt-6 text-sm leading-relaxed text-[#6E6E73]">{town.nearbyLine}</p>
            )}
          </div>
        </div>
      </section>

      {/* Mail-in */}
      <section className="bg-white py-16" aria-labelledby="send-ind">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl border border-[#1A3D2E]/20 bg-[#1A3D2E]/[0.04] p-8 md:p-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Send ind
            </p>
            <h2
              id="send-ind"
              className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl"
            >
              {town.mailIn.heading}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6E6E73]">
              {town.mailIn.text}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/reparation/indsend"
                className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg"
              >
                {mailInLabel}
              </Link>
              <Link
                href="/reparation/indsend"
                className="text-sm font-semibold text-[#1A3D2E] hover:underline"
              >
                Se hvordan det virker
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Prices */}
      {prices.length > 0 && (
        <section className="bg-[#F7F7F8] py-16" aria-labelledby="priser">
          <div className="mx-auto max-w-4xl px-4">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
                Faste priser
              </p>
              <h2
                id="priser"
                className="font-display text-3xl font-bold tracking-tight text-[#111111]"
              >
                Hvad koster det?
              </h2>
              <p className="mt-3 max-w-xl text-base text-[#6E6E73]">
                Du vælger selv skærmkvaliteten, fra vores billigste skærm til en
                original. Prisen er fast og inkluderer moms, reservedel og garanti.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA] bg-white">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-[#F7F7F8] text-xs font-semibold text-[#6E6E73]">
                  <tr>
                    <th scope="col" className="px-5 py-3">Model</th>
                    <th scope="col" className="px-5 py-3">Skærm fra</th>
                    <th scope="col" className="px-5 py-3">Original skærm</th>
                    <th scope="col" className="px-5 py-3">Batteri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {prices.map((row) => (
                    <tr key={row.modelSlug}>
                      <th scope="row" className="px-5 py-3 font-semibold text-[#111111]">
                        <Link
                          href={`/reparation/${row.brandSlug}/${row.modelSlug}`}
                          className="hover:text-[#1A3D2E] hover:underline"
                        >
                          {row.modelName}
                        </Link>
                      </th>
                      <td className="px-5 py-3 text-[#111111]">{formatKr(row.screenFrom)}</td>
                      <td className="px-5 py-3 text-[#6E6E73]">{formatKr(row.screenOriginal)}</td>
                      <td className="px-5 py-3 text-[#111111]">{formatKr(row.battery)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-[#6E6E73]">
              Din model er ikke på listen?{" "}
              <Link href="/reparation" className="font-semibold text-[#1A3D2E] hover:underline">
                Se priser på alle modeller
              </Link>
              . Du kan også få en gratis hurtig diagnose ved disken i butikken. En
              fuld diagnose, fx ved fejl på printet, koster 249 kr.
            </p>
          </div>
        </section>
      )}

      {/* Warranty */}
      <section id="garanti" className="bg-white py-16" aria-labelledby="garanti-titel">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Garanti
            </p>
            <h2
              id="garanti-titel"
              className="font-display text-3xl font-bold tracking-tight text-[#111111]"
            >
              Livstidsgaranti på arbejde og dele
            </h2>
            <p className="mt-3 max-w-xl text-base text-[#6E6E73]">
              Gælder telefon- og tabletreparationer. Her er vilkårene i klart sprog.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {WARRANTY_TERMS.map((term) => (
              <div key={term.title} className="rounded-2xl border border-[#E5E5EA] bg-white p-6">
                <p className="font-display text-base font-bold text-[#111111]">{term.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]">{term.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F7F7F8] py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Ofte stillede spørgsmål fra {town.name}
            </h2>
          </div>

          <div className="divide-y divide-[#E5E5EA] rounded-2xl border border-[#E5E5EA] bg-white">
            {town.faqs.map((faq) => (
              <details key={faq.question} className="group px-6 py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-base font-bold text-[#111111]">
                  {faq.question}
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 shrink-0 text-[#86868B] transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#6E6E73]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related links */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-3xl px-4 text-sm text-[#6E6E73]">
          {isVejle && (
            <p>
              Læs mere om butikken, åbningstider og vores reparationer på{" "}
              <Link href="/reparation-vejle" className="font-semibold text-[#1A3D2E] hover:underline">
                Reparation i Vejle
              </Link>
              .
            </p>
          )}
          {isVejle && satellites.length > 0 && (
            <p className="mt-3">
              Kommer du fra en anden by?{" "}
              {satellites.map((t, i) => (
                <span key={t.path}>
                  {i > 0 && (i === satellites.length - 1 ? " og " : ", ")}
                  <Link href={t.path} className="font-semibold text-[#1A3D2E] hover:underline">
                    Reparation {t.name}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
          {!isVejle && (
            <p>
              Se alle{" "}
              <Link href="/reparation" className="font-semibold text-[#1A3D2E] hover:underline">
                reparationer og priser
              </Link>
              , eller læs om{" "}
              <Link href="/butik/slagelse" className="font-semibold text-[#1A3D2E] hover:underline">
                butikken i Slagelse
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A3D2E] py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Klar til at få repareret din enhed?
          </h2>
          <p className="mt-4 text-base text-white/75">
            Kom forbi {store.street},{store.zip} {store.city}, eller send
            enheden ind med en gratis fragtlabel.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={bookingHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              {bookLabel}
            </Link>
            <Link
              href="/reparation/indsend"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              {mailInLabel}
            </Link>
          </div>
          <p className="mt-8 text-sm text-white/50">
            {store.name} · {store.street} · {store.zip} {store.city} ·{" "}
            <a href={phoneHref(store.phone)} className="hover:text-white/80">
              {store.phone}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
