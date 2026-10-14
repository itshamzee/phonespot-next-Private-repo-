import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES, openingHoursJsonLd } from "@/lib/store-config";
import { getRepairPriceSummaries, type RepairPriceSummary } from "@/lib/supabase/repairs";
import { TRUSTPILOT_SCORE_LABEL_DA } from "@/lib/trustpilot/constants";

// Prices come straight from the repair price list in the database; the page
// is regenerated hourly, so "Priser opdateret" is the date they were read.
export const revalidate = 3600;

const SITE = "https://phonespot.dk";
const PAGE_URL = `${SITE}/reparation/priser`;
const TRUSTPILOT_URL = "https://dk.trustpilot.com/review/phonespot.dk";
const SAME_AS = [TRUSTPILOT_URL, "https://www.facebook.com/phonespot.dk/"];

export const metadata: Metadata = {
  title: "Reparationspriser og fakta | PhoneSpot Vejle og Slagelse",
  description:
    "Priser på skærm- og batteriskift, garanti, ventetid, adresser og åbningstider for PhoneSpot i Vejle og Slagelse. Samlet på én side og opdateret løbende.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Reparationspriser og fakta | PhoneSpot",
    description:
      "Skærm- og batteriskift i Vejle og Slagelse: priser, livstidsgaranti på arbejde og dele, 90 % klar på 30 minutter.",
    url: PAGE_URL,
    type: "website",
  },
};

const PRICE_FACT_MODELS = [
  { brand: "iphone", model: "iphone-16-pro" },
  { brand: "iphone", model: "iphone-16" },
  { brand: "iphone", model: "iphone-15-pro" },
  { brand: "iphone", model: "iphone-15" },
  { brand: "iphone", model: "iphone-14" },
  { brand: "iphone", model: "iphone-13" },
  { brand: "iphone", model: "iphone-12" },
  { brand: "iphone", model: "iphone-11" },
  { brand: "samsung", model: "galaxy-s24" },
  { brand: "samsung", model: "galaxy-s23" },
  { brand: "samsung", model: "galaxy-a55" },
];

const WARRANTY_TEXT =
  "Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele. Opstår den samme fejl igen på den del, vi har skiftet, reparerer vi den uden beregning, så længe du ejer enheden. Garantien dækker ikke nye skader som fald, tryk eller væske, og et batteris naturlige kapacitetsfald er ikke en fejl. Behandling af vandskade har 3 måneders garanti.";

const WAIT_TEXT =
  "Du kan komme ind uden tidsbestilling i begge butikker. 90 % af skærm- og batteriskift er klar på 30 minutter. Andre reparationer tager længere tid, og vi giver dig et tidspunkt, når vi har set enheden.";

const CHECK_TEXT =
  "Vi laver et gratis hurtigt tjek ved disken og giver en fast pris, før vi går i gang. En fuld diagnose, fx ved vandskade eller printfejl, koster 249 kr.";

const formatKr = (value: number) => `${value.toLocaleString("da-DK")} kr.`;

function range(values: (number | null)[]) {
  const nums = values.filter((v): v is number => typeof v === "number" && v > 0);
  if (nums.length === 0) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function rangeText(r: { min: number; max: number } | null) {
  if (!r) return null;
  return r.min === r.max ? formatKr(r.min) : `${formatKr(r.min)} til ${formatKr(r.max)}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Copenhagen",
  }).format(date);
}

function buildFaqs(screen: string | null, battery: string | null) {
  const vejle = STORES.vejle;
  const slagelse = STORES.slagelse;
  return [
    {
      question: "Hvad koster et skærmskift på en iPhone hos PhoneSpot?",
      answer: screen
        ? `Skærmskift på de mest solgte iPhone- og Samsung-modeller koster fra ${screen}, afhængigt af model og skærmkvalitet. Prisen er fast, inkluderer moms, reservedel og garanti og oplyses før reparationen.`
        : "Prisen afhænger af model og skærmkvalitet. Den er fast, inkluderer moms, reservedel og garanti og oplyses før reparationen.",
    },
    {
      question: "Hvad koster et batteriskift?",
      answer: battery
        ? `Batteriskift på de mest solgte modeller koster ${battery}. Se den præcise pris for din model på phonespot.dk/reparation.`
        : "Prisen afhænger af modellen. Se den præcise pris for din model på phonespot.dk/reparation.",
    },
    {
      question: "Hvor lang tid tager en reparation?",
      answer: WAIT_TEXT,
    },
    {
      question: "Hvilken garanti får jeg?",
      answer: WARRANTY_TEXT,
    },
    {
      question: "Hvor ligger PhoneSpots butikker?",
      answer: `${vejle.name} ligger på ${vejle.street}, ${vejle.zip} ${vejle.city}, med gratis parkering ved døren. ${slagelse.name} ligger i ${slagelse.street}, ${slagelse.zip} ${slagelse.city}.`,
    },
    {
      question: "Koster det noget at få tjekket fejlen?",
      answer: CHECK_TEXT,
    },
  ];
}

export default async function RepairFactsPage() {
  const prices: RepairPriceSummary[] = await getRepairPriceSummaries(PRICE_FACT_MODELS);
  const screenRange = rangeText(range(prices.map((p) => p.screenFrom)));
  const batteryRange = rangeText(range(prices.map((p) => p.battery)));
  const updated = formatDate(new Date());
  const faqs = buildFaqs(screenRange, batteryRange);
  const stores = [STORES.vejle, STORES.slagelse];

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: "PhoneSpot",
    url: SITE,
    logo: `${SITE}/brand/logo.png`,
    sameAs: SAME_AS,
    department: stores.map((store) => ({
      "@type": "ElectronicsRepair",
      name: store.name,
      url: `${SITE}/reparation-${store.slug}`,
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
      sameAs: SAME_AS,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: SITE },
      { "@type": "ListItem", position: 2, name: "Reparation", item: `${SITE}/reparation` },
      { "@type": "ListItem", position: 3, name: "Priser og fakta", item: PAGE_URL },
    ],
  };

  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <nav aria-label="Brødkrumme" className="border-b border-[#E5E5EA] bg-white">
        <ol className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3 text-xs text-[#6E6E73]">
          <li>
            <Link href="/" className="hover:text-[#1A3D2E] hover:underline">Forside</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/reparation" className="hover:text-[#1A3D2E] hover:underline">Reparation</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-[#111111]">Priser og fakta</li>
        </ol>
      </nav>

      <article className="bg-white">
        <header className="mx-auto max-w-3xl px-4 pb-8 pt-14">
          <p className="text-sm font-semibold text-[#1A3D2E]">Priser og fakta</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-[#111111] md:text-5xl">
            Reparation hos PhoneSpot i Vejle og Slagelse
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[#444449]">
            PhoneSpot reparerer telefoner og tablets i to butikker: Løversysselvej 3B i Vejle og
            VestsjællandsCentret i Slagelse. Du kan komme ind uden tidsbestilling, 90 % af skærm- og
            batteriskift er klar på 30 minutter, og der er livstidsgaranti på arbejde og dele.
            {screenRange && ` Skærmskift koster fra ${screenRange}.`}
          </p>
          <p className="mt-4 text-sm text-[#6E6E73]">
            Priser opdateret: <time dateTime={new Date().toISOString().slice(0, 10)}>{updated}</time>
          </p>
        </header>

        <section aria-labelledby="priser" className="border-t border-[#E5E5EA]">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 id="priser" className="font-display text-2xl font-bold tracking-tight text-[#111111]">
              Priser
            </h2>
            <ul className="mt-4 space-y-2 text-base leading-relaxed text-[#444449]">
              {screenRange && <li>Skærmskift: fra {screenRange} på modellerne herunder.</li>}
              {batteryRange && <li>Batteriskift: {batteryRange}.</li>}
              <li>Fuld diagnose: 249 kr. Hurtigt tjek ved disken er gratis.</li>
              <li>Alle priser er faste, inklusive moms, reservedel og garanti.</li>
            </ul>

            {prices.length > 0 && (
              <div className="mt-8 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <caption className="sr-only">Priser på skærm- og batteriskift pr. model</caption>
                  <thead>
                    <tr className="border-b border-[#E5E5EA] text-[#6E6E73]">
                      <th scope="col" className="py-2 pr-4 font-semibold">Model</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Skærmskift fra</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Original skærm</th>
                      <th scope="col" className="py-2 font-semibold">Batteriskift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p) => (
                      <tr key={p.modelSlug} className="border-b border-[#F0F0F2]">
                        <th scope="row" className="py-2.5 pr-4 font-medium text-[#111111]">
                          <Link
                            href={`/reparation/${p.brandSlug}/${p.modelSlug}`}
                            className="hover:text-[#1A3D2E] hover:underline"
                          >
                            {p.modelName}
                          </Link>
                        </th>
                        <td className="py-2.5 pr-4 text-[#444449]">{p.screenFrom ? formatKr(p.screenFrom) : "–"}</td>
                        <td className="py-2.5 pr-4 text-[#444449]">{p.screenOriginal ? formatKr(p.screenOriginal) : "–"}</td>
                        <td className="py-2.5 text-[#444449]">{p.battery ? formatKr(p.battery) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-sm text-[#6E6E73]">
              Find priser på alle modeller og reparationer på{" "}
              <Link href="/reparation" className="font-semibold text-[#1A3D2E] hover:underline">
                reparationssiden
              </Link>
              .
            </p>
          </div>
        </section>

        <section aria-labelledby="garanti" className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 id="garanti" className="font-display text-2xl font-bold tracking-tight text-[#111111]">
              Garanti
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#444449]">{WARRANTY_TEXT}</p>
          </div>
        </section>

        <section aria-labelledby="ventetid" className="border-t border-[#E5E5EA]">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 id="ventetid" className="font-display text-2xl font-bold tracking-tight text-[#111111]">
              Ventetid og tjek
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#444449]">{WAIT_TEXT}</p>
            <p className="mt-3 text-base leading-relaxed text-[#444449]">{CHECK_TEXT}</p>
          </div>
        </section>

        <section aria-labelledby="butikker" className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 id="butikker" className="font-display text-2xl font-bold tracking-tight text-[#111111]">
              Butikker, adresser og åbningstider
            </h2>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {stores.map((store) => (
                <div key={store.slug}>
                  <h3 className="text-base font-bold text-[#111111]">
                    <Link href={`/reparation-${store.slug}`} className="hover:text-[#1A3D2E] hover:underline">
                      {store.name}
                    </Link>
                  </h3>
                  <address className="mt-2 not-italic text-sm leading-relaxed text-[#444449]">
                    {store.street}
                    <br />
                    {store.zip} {store.city}
                    <br />
                    Telefon: <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="hover:underline">{store.phone}</a>
                  </address>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-[#444449]">
                    <dt>Man–fre</dt>
                    <dd className="font-medium text-[#111111]">{store.hours.weekdays}</dd>
                    <dt>Lørdag</dt>
                    <dd className="font-medium text-[#111111]">{store.hours.saturday}</dd>
                    <dt>Søndag</dt>
                    <dd className="font-medium text-[#111111]">{store.hours.sunday}</dd>
                  </dl>
                  {store.slug === "vejle" && (
                    <p className="mt-2 text-sm text-[#6E6E73]">Gratis parkering ved døren, ca. 1 km fra centrum.</p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-[#6E6E73]">
              Bor du langt fra butikkerne, kan du{" "}
              <Link href="/reparation/indsend" className="font-semibold text-[#1A3D2E] hover:underline">
                sende enheden ind
              </Link>{" "}
              med en gratis fragtlabel. Garantien er den samme.
            </p>
          </div>
        </section>

        <section aria-labelledby="anmeldelser" className="border-t border-[#E5E5EA]">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 id="anmeldelser" className="font-display text-2xl font-bold tracking-tight text-[#111111]">
              Anmeldelser
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#444449]">
              PhoneSpot har {TRUSTPILOT_SCORE_LABEL_DA} ud af 5 på{" "}
              <a href={TRUSTPILOT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1A3D2E] hover:underline">
                Trustpilot
              </a>
              .
            </p>
          </div>
        </section>

        <section aria-labelledby="faq" className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 id="faq" className="font-display text-2xl font-bold tracking-tight text-[#111111]">
              Spørgsmål og svar
            </h2>
            <div className="mt-6 space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="text-base font-bold text-[#111111]">{faq.question}</h3>
                  <p className="mt-2 text-base leading-relaxed text-[#444449]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
