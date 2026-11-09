import Link from "next/link";
import { BlackNovemberStrip } from "@/components/campaign/black-november";
import { isBlackNovember } from "@/lib/campaign/black-november";
import { JsonLd } from "@/components/seo/json-ld";
import { OpenNowStatus } from "@/components/repair/open-now-status";
import { MobileContactBar } from "@/components/repair/mobile-contact-bar";
import { STORES, openingHoursJsonLd } from "@/lib/store-config";
import { SITE_URL } from "@/lib/local-repair-towns";
import {
  LOCAL_SERVICE_KEYS,
  getLocalServicePage,
  type LocalServicePage as LocalServicePageData,
} from "@/lib/local-service-pages";
import type { ServicePriceRow } from "@/lib/supabase/repairs";

const formatKr = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("da-DK")} kr.`;

const phoneHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

type Props = {
  page: LocalServicePageData;
  rows: ServicePriceRow[];
};

export function LocalServicePage({ page, rows }: Props) {
  const store = STORES[page.store];
  const pageUrl = `${SITE_URL}${page.path}`;
  const bookingHref = `/reparation/booking?store=${store.slug}`;
  const otherStore = page.store === "vejle" ? "slagelse" : "vejle";
  const otherCityPage = getLocalServicePage(otherStore, page.key);
  const siblingPages = LOCAL_SERVICE_KEYS.filter((k) => k !== page.key).map(
    (k) => getLocalServicePage(page.store, k)!,
  );

  // Kun priser, der faktisk findes, bliver til tilbud i schema.
  const offers = rows.flatMap((row) =>
    page.priceColumns.flatMap((col) => {
      const price = row.prices[col.key];
      if (price === null || price === undefined) return [];
      return [
        {
          "@type": "Offer",
          price,
          priceCurrency: "DKK",
          itemOffered: {
            "@type": "Service",
            name: `${col.label.replace(/ fra$/, "")}: ${row.modelName}`,
            url: `${SITE_URL}/reparation/${row.brandSlug}/${row.modelSlug}`,
          },
        },
      ];
    }),
  );

  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "ElectronicsRepair",
    "@id": `${SITE_URL}/butik/${store.slug}#store`,
    name: store.name,
    url: pageUrl,
    telephone: store.phone,
    email: store.email,
    image: `${SITE_URL}/images/store/butik-indvendig.jpg`,
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
    areaServed: { "@type": "City", name: page.city },
    priceRange: "$$",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${page.serviceName} i ${page.city}`,
      itemListElement: offers,
    },
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${page.serviceName} i ${page.city}`,
    serviceType: page.serviceName,
    url: pageUrl,
    areaServed: { "@type": "City", name: page.city },
    provider: { "@id": `${SITE_URL}/butik/${store.slug}#store` },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
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
      { "@type": "ListItem", position: 2, name: `Reparation ${page.city}`, item: `${SITE_URL}${page.hubPath}` },
      { "@type": "ListItem", position: 3, name: page.shortName, item: pageUrl },
    ],
  };

  return (
    <>
      <JsonLd data={businessJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <MobileContactBar phone={store.phone} bookingHref={bookingHref} storeName={store.name} />
      <div className="mx-auto max-w-6xl px-4">
        <BlackNovemberStrip kind="repair" serverActive={isBlackNovember()} />
      </div>

      <nav aria-label="Brødkrumme" className="border-b border-[#E5E5EA] bg-white">
        <ol className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3 text-xs text-[#6E6E73]">
          <li>
            <Link href="/" className="hover:text-[#1A3D2E] hover:underline">
              Forside
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={page.hubPath} className="hover:text-[#1A3D2E] hover:underline">
              Reparation {page.city}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-[#111111]">
            {page.shortName}
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-[#1A3D2E] py-20 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/60">
            {page.eyebrow} · {page.city}
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            {page.h1}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{page.heroLead}</p>

          <OpenNowStatus hours={store.hours} tone="dark" className="mt-6" />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={bookingHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Book og kom forbi i {page.city}
            </Link>
            <Link
              href="/reparation/indsend"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Send den ind
            </Link>
          </div>

          <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-6 sm:grid-cols-4">
            {page.tiles.map(({ title, desc }) => (
              <div key={title}>
                <dt className="text-sm font-bold text-white">{title}</dt>
                <dd className="mt-0.5 text-xs text-white/60">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Svar først */}
      <section className="border-b border-[#E5E5EA] bg-white">
        <p className="mx-auto max-w-3xl px-4 py-8 text-base leading-relaxed text-[#111111]">
          {page.answerFirst}
        </p>
      </section>

      {/* Intro */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-3xl space-y-5 px-4">
          {page.intro.map((paragraph) => (
            <p key={paragraph} className="text-base leading-relaxed text-[#444449]">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Priser */}
      {rows.length > 0 && (
        <section className="bg-[#F7F7F8] py-16" aria-labelledby="priser">
          <div className="mx-auto max-w-4xl px-4">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
                Faste priser
              </p>
              <h2 id="priser" className="font-display text-3xl font-bold tracking-tight text-[#111111]">
                Hvad koster det i {page.city}?
              </h2>
              <p className="mt-3 max-w-xl text-base text-[#6E6E73]">{page.priceIntro}</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA] bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-[#F7F7F8] text-xs font-semibold text-[#6E6E73]">
                  <tr>
                    <th scope="col" className="px-5 py-3">Model</th>
                    {page.priceColumns.map((col) => (
                      <th key={col.key} scope="col" className="px-5 py-3">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {rows.map((row) => (
                    <tr key={row.modelSlug}>
                      <th scope="row" className="px-5 py-3 font-semibold text-[#111111]">
                        <Link
                          href={`/reparation/${row.brandSlug}/${row.modelSlug}`}
                          className="hover:text-[#1A3D2E] hover:underline"
                        >
                          {row.modelName}
                        </Link>
                      </th>
                      {page.priceColumns.map((col, i) => (
                        <td
                          key={col.key}
                          className={`px-5 py-3 ${i === 0 ? "font-semibold text-[#111111]" : "text-[#444449]"}`}
                        >
                          {formatKr(row.prices[col.key] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-[#6E6E73]">
              Din model er ikke på listen?{" "}
              <Link href={page.allModelsHref} className="font-semibold text-[#1A3D2E] hover:underline">
                {page.allModelsLabel}
              </Link>
              . Priserne er de samme i alle vores butikker og ved indsendelse.
            </p>
          </div>
        </section>
      )}

      {/* Typiske fejl */}
      <section className="bg-white py-16" aria-labelledby="fejl">
        <div className="mx-auto max-w-4xl px-4">
          <h2 id="fejl" className="font-display text-3xl font-bold tracking-tight text-[#111111]">
            Fejl, vi løser i {page.city}
          </h2>
          <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {page.problems.map((problem) => (
              <div key={problem.title} className="border-t border-[#E5E5EA] pt-5">
                <h3 className="text-lg font-bold text-[#111111]">{problem.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[#6E6E73]">{problem.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sådan foregår det */}
      <section className="border-y border-[#E5E5EA] bg-[#F7F7F8] py-16" aria-labelledby="forloeb">
        <div className="mx-auto max-w-4xl px-4">
          <h2 id="forloeb" className="font-display text-3xl font-bold tracking-tight text-[#111111]">
            Sådan foregår det
          </h2>
          <ol className="mt-10 space-y-6">
            {page.steps.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[3rem_1fr] items-baseline gap-4">
                <span className="font-display text-3xl font-bold text-[#1A3D2E]/40">{i + 1}</span>
                <div>
                  <p className="font-bold text-[#111111]">{step.title}</p>
                  <p className="mt-1 text-base text-[#6E6E73]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-10 border-t border-[#E5E5EA] pt-6 text-sm leading-relaxed text-[#444449]">
            <span className="font-bold text-[#111111]">Garanti: </span>
            {page.warrantyLine}
          </p>
        </div>
      </section>

      {/* Find os */}
      <section className="bg-white py-16" aria-labelledby="find-os">
        <div className="mx-auto grid max-w-4xl gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 id="find-os" className="font-display text-2xl font-bold tracking-tight text-[#111111]">
              Find {store.name}
            </h2>
            <p className="mt-3 text-base text-[#6E6E73]">
              {store.street}
              <br />
              {store.zip} {store.city}
            </p>
            <a
              href={store.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-[#1A3D2E] hover:underline"
            >
              Se på Google Maps
            </a>
            <p className="mt-4">
              <a href={phoneHref(store.phone)} className="text-sm font-semibold text-[#1A3D2E] hover:underline">
                Ring {store.phone}
              </a>
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-[#111111]">Åbningstider</p>
            <OpenNowStatus hours={store.hours} className="mt-1 !text-xs" />
            <div className="mt-2 space-y-1 text-sm text-[#6E6E73]">
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
          </div>
        </div>
      </section>

      {/* Send ind */}
      <section className="bg-white pb-16" aria-labelledby="send-ind">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl border border-[#1A3D2E]/20 bg-[#1A3D2E]/[0.04] p-8 md:p-10">
            <h2 id="send-ind" className="font-display text-2xl font-bold tracking-tight text-[#111111]">
              Bor du ikke tæt på {page.city}?
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6E6E73]">{page.mailInText}</p>
            <Link
              href="/reparation/indsend"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg"
            >
              Send den ind
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F7F7F8] py-16" aria-labelledby="faq">
        <div className="mx-auto max-w-3xl px-4">
          <h2 id="faq" className="font-display text-3xl font-bold tracking-tight text-[#111111]">
            Ofte stillede spørgsmål
          </h2>
          <div className="mt-8 divide-y divide-[#E5E5EA] border-y border-[#E5E5EA]">
            {page.faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="cursor-pointer list-none font-bold text-[#111111] marker:hidden">
                  {faq.question}
                </summary>
                <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Videre */}
      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-4xl gap-10 px-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-bold text-[#111111]">Guides</p>
            <ul className="mt-3 space-y-2">
              {page.guides.map((g) => (
                <li key={g.href}>
                  <Link href={g.href} className="text-sm text-[#1A3D2E] hover:underline">
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-[#111111]">Mere reparation i {page.city}</p>
            <ul className="mt-3 space-y-2">
              {siblingPages.map((p) => (
                <li key={p.path}>
                  <Link href={p.path} className="text-sm text-[#1A3D2E] hover:underline">
                    {p.h1}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={page.hubPath} className="text-sm text-[#1A3D2E] hover:underline">
                  Telefonreparation i {page.city}
                </Link>
              </li>
            </ul>
          </div>
          {otherCityPage && (
            <div>
              <p className="text-sm font-bold text-[#111111]">Tættere på {otherCityPage.city}?</p>
              <Link href={otherCityPage.path} className="mt-3 inline-block text-sm text-[#1A3D2E] hover:underline">
                {otherCityPage.h1}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
