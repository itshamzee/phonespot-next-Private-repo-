import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { createServerClient } from "@/lib/supabase/client";
import { STORES } from "@/lib/store-config";
import { BuyButton } from "../trusmi-briller/_components/buy-button";
import { HeroVideo } from "../trusmi-briller/_components/hero-video";
import { FAQAccordion } from "./_components/faq";

const SLUG = "trusmi-smart-pencil-ipad-hvid";
const URL = "https://phonespot.dk/trusmi-blyant";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Trusmi Smart Pencil til iPad — Spar 150 kr | PhoneSpot",
  description:
    "Aluminiumsblyant til iPad Pro 11\" og 12,9\" (2021). 8 timers brugstid, USB-C opladning, udskiftelig spids. På lager i Slagelse + Vejle. Kun 349 kr — spar 150.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Trusmi Smart Pencil til iPad",
    description: "iPad-blyant med 8 timers brugstid og USB-C — 349 kr på lager i Slagelse + Vejle.",
    url: URL,
    type: "website",
    images: [{ url: "/trusmi-pencil/01.webp", width: 550, height: 550 }],
  },
};

interface Product {
  id: string;
  title: string;
  description: string | null;
  selling_price: number;
  sale_price: number | null;
  images: string[];
}

const SPECS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Model",              value: "SP01-01" },
  { label: "Længde",             value: "165,5 mm" },
  { label: "Diameter",           value: "9,0 mm" },
  { label: "Brugstid",           value: "Cirka 8 timer" },
  { label: "Standby",            value: "Cirka 360 dage" },
  { label: "Opladningstid",      value: "Cirka 40 minutter" },
  { label: "Opladning",          value: "USB Type-C" },
  { label: "Spænding",           value: "DC 4,2 – 5,0 V" },
  { label: "Strøm (opladning)",  value: "Cirka 220 mA" },
  { label: "Auto-sleep",         value: "Efter 300 sekunder" },
  { label: "Vægt",               value: "Cirka 14 g" },
  { label: "Materiale",          value: "Aluminiumslegering" },
  { label: "Spids-materiale",    value: "POM (udskiftelig)" },
  { label: "Tænd/sluk",          value: "Fysisk knap" },
  { label: "Batteri",            value: "Lithium 3,7 V / 100 mAh" },
  { label: "Garanti",            value: "24 mdr. fuld returret" },
];

const COMPATIBLE: ReadonlyArray<{ name: string; codes: string }> = [
  { name: "iPad Pro 11\" (3. gen, 2021)",    codes: "A2378 · A2379" },
  { name: "iPad Pro 12,9\" (5. gen, 2021)",  codes: "A2461 · A2462 · A2437" },
];

const STEPS: ReadonlyArray<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Tænd",
    body: "Tryk én gang på den fysiske tænd-knap. Ingen Bluetooth-parring. Ingen app.",
  },
  {
    n: "02",
    title: "Skriv",
    body: "Plug-and-play med iPad Pro 2021. Aktiv kapacitiv spids — præcis som en blyant.",
  },
  {
    n: "03",
    title: "Oplad via USB-C",
    body: "40 minutter for fuld opladning. Standby holder 360 dage — den glemmer du sjældent.",
  },
];

const USECASES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Notater & forelæsninger",
    body: "Håndskrevne noter føles naturligt. Spar tonsvis af papir, tag struktur fra dag ét.",
  },
  {
    title: "Tegninger & skitser",
    body: "POM-spidsen giver præcis kontrol til Procreate, Concepts, Adobe Fresco og Notability.",
  },
  {
    title: "Underskriv PDF'er",
    body: "Signér kontrakter, faktura og dokumenter direkte i din iPad — ingen printer nødvendig.",
  },
  {
    title: "Annoteringer & gennemgang",
    body: "Marker op, kommentar dokumenter, ret studierapporter eller gennemgå design-mockups.",
  },
];

const FEATURES: ReadonlyArray<{ title: string; body: string; iconPath: string }> = [
  {
    title: "Plug-and-play",
    body: "Ingen Bluetooth, ingen parring. Tænd og skriv. Virker på iPad Pro 11\" (3. gen) og 12,9\" (5. gen).",
    iconPath: "M9 17l3 3 8-8M14 4l6 6M3 11l3 3",
  },
  {
    title: "8+ timers brugstid",
    body: "100 mAh lithium-batteri rækker en hel arbejdsdag. 360 dages standby så den altid er klar.",
    iconPath: "M3 7h14a2 2 0 012 2v6a2 2 0 01-2 2H3M3 7v10M21 11v2",
  },
  {
    title: "USB-C opladning",
    body: "40 minutter for fuld opladning. Samme kabel som din iPad — ingen ekstra rod på skrivebordet.",
    iconPath: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  },
  {
    title: "Udskiftelig POM-spids",
    body: "Når spidsen er slidt, udskifter du den selv på 10 sekunder. Ingen serviceomkostninger.",
    iconPath: "M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z",
  },
  {
    title: "Aluminiumskabinet",
    body: "Letvægts-aluminium, kun 14 gram. Føles solidt i hånden, men din håndled mærker det ikke.",
    iconPath: "M3 21l9-9 9 9M5 15l7-7 7 7",
  },
  {
    title: "Ingen abonnement",
    body: "Engangskøb. Ingen app, ingen subscription, ingen skjulte gebyrer. Bare værktøjet.",
    iconPath: "M5 13l4 4L19 7",
  },
];

export default async function TrusmiBlyantPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("sku_products")
    .select("id, title, description, selling_price, sale_price, images")
    .eq("slug", SLUG)
    .eq("is_active", true)
    .eq("status", "published")
    .single<Product>();

  if (!data) notFound();

  const heroImage = data.images?.[0] ?? "/trusmi-pencil/01.webp";
  const finalPriceOere = data.sale_price ?? data.selling_price;
  const compareAtOere = data.sale_price ? data.selling_price : null;
  const finalKr = finalPriceOere / 100;
  const compareKr = compareAtOere ? compareAtOere / 100 : null;
  const saveKr = compareKr ? compareKr - finalKr : 0;
  const savePercent = compareKr ? Math.round(((compareKr - finalKr) / compareKr) * 100) : 0;

  const slagelse = STORES.slagelse;
  const vejle = STORES.vejle;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.title,
    description: "iPad-blyant med USB-C opladning, 8 timers brugstid og udskiftelig POM-spids.",
    image: [`https://phonespot.dk${heroImage}`],
    brand: { "@type": "Brand", name: "Trusmi" },
    offers: {
      "@type": "Offer",
      url: URL,
      priceCurrency: "DKK",
      price: finalKr.toFixed(2),
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "PhoneSpot" },
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* ════════ HERO ════════ */}
      <section className="relative bg-[#0F2A20] text-white">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12">
          <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <span>Trusmi · iPad Pro 2021</span>
            <span className="hidden sm:inline">Dispatch · 2026</span>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <HeroVideo
              src="/trusmi-pencil/hero.mp4"
              poster={heroImage}
              className="aspect-[4/5] w-full rounded-[28px] ring-1 ring-white/10 sm:aspect-square lg:aspect-[4/5]"
            />
          </div>

          <div className="flex flex-col justify-end lg:col-span-5">
            <h1 className="font-display text-[44px] font-bold leading-[0.95] tracking-tight sm:text-[64px] lg:text-[72px]">
              Skriv.<br />
              <span className="italic font-light text-white/85">Tegn.</span><br />
              Naviger.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Trusmi Smart Pencil giver dig præcision på din iPad Pro — uden Bluetooth-bøvl, uden abonnement. Aluminium, USB-C og en spids der føles som blyant.
            </p>

            <div className="mt-10 flex items-end gap-6 border-t border-white/15 pt-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/55">
                  Spar {saveKr.toLocaleString("da-DK")} kr.
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-display text-5xl font-bold tabular-nums sm:text-6xl">
                    {finalKr.toLocaleString("da-DK")}
                  </span>
                  <span className="text-xl font-medium text-white/85">kr.</span>
                </div>
                {compareKr && (
                  <p className="mt-1 text-sm text-white/55 line-through tabular-nums">
                    Nypris {compareKr.toLocaleString("da-DK")} kr.
                  </p>
                )}
              </div>
              {savePercent > 0 && (
                <span className="ml-auto rounded-full bg-[#C9A56F] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1A1004]">
                  −{savePercent}%
                </span>
              )}
            </div>

            <div className="mt-6">
              <BuyButton
                productId={data.id}
                title={data.title}
                image={heroImage}
                priceOere={finalPriceOere}
                fullWidth
              />
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                "På lager i Slagelse + Vejle",
                "Hent samme dag",
                "Fri fragt over 500 kr",
                "24 mdr. fuld returret",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-white/85">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C9A56F]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ════════ PICKUP STRIP ════════ */}
      <section className="border-y border-[#C9A56F]/30 bg-[#F5F1E8] text-[#1A1004]">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-6 sm:flex-row sm:items-center sm:gap-8 sm:px-6">
          <span className="rounded-full bg-[#0F2A20] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F5F1E8]">
            Klik & Hent
          </span>
          <p className="text-base font-medium sm:text-lg">
            På lager i begge butikker — bestil online nu, hent samme dag i {slagelse.city} eller {vejle.city}.
          </p>
          <Link
            href="#butikker"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Se butiksinfo
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ════════ COMPATIBILITY (critical for pencil) ════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F] text-center">
            Kompatibilitet
          </p>
          <h2 className="mt-4 text-center font-display text-3xl font-bold text-[#0F2A20] sm:text-4xl">
            Bygget til iPad Pro 2021.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-[#3F4A45]">
            Tjek modelnummeret bag på din iPad — står ved siden af FCC-mærket. Trusmi Smart Pencil virker med:
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {COMPATIBLE.map((c) => (
              <li
                key={c.name}
                className="flex flex-col items-start gap-3 rounded-2xl border border-[#0F2A20]/10 bg-[#F7F7F8] p-6 sm:p-7"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2A20] text-[#C9A56F]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <rect x="6" y="3" width="12" height="18" rx="2" />
                    <line x1="11" y1="18" x2="13" y2="18" />
                  </svg>
                </span>
                <h3 className="font-display text-lg font-semibold text-[#0F2A20]">{c.name}</h3>
                <p className="font-mono text-sm tabular-nums tracking-wider text-[#6E6E73]">
                  {c.codes}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ════════ THE PITCH ════════ */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
            Hvorfor Trusmi
          </p>
          <h2 className="mt-6 font-display text-3xl font-bold leading-[1.1] text-[#0F2A20] sm:text-5xl lg:text-[56px]">
            Apple Pencil's følelse.<br />
            <span className="italic font-light text-[#3F4A45]">En tredjedel af prisen.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[#3F4A45]">
            Du behøver ikke at betale 1.099 kr for en blyant. Trusmi Smart Pencil giver dig præcis kontrol, hurtig respons og hele økosystemet — uden at koste mere end et almindeligt cover.
          </p>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
                Sådan virker det
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-[#0F2A20] sm:text-4xl">
                Tre skridt fra<br />kasse til skitse.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#3F4A45]">
                Ingen app, ingen parring, ingen ventetid. Bare tænd og skriv.
              </p>
            </div>
            <ol className="grid gap-8 lg:col-span-8 lg:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="relative">
                  <span className="font-display text-6xl font-light text-[#C9A56F] tabular-nums">
                    {s.n}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-[#0F2A20]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#3F4A45]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
              Bygget rigtigt
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-[#0F2A20] sm:text-4xl">
              Den smartere blyant.
            </h2>
          </div>

          <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-[#E8E4DC] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="bg-white p-7 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F2A20] text-[#C9A56F]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d={f.iconPath} />
                  </svg>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-[#0F2A20]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3F4A45]">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ════════ USE CASES ════════ */}
      <section className="bg-[#0F2A20] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
              Til hvad
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Til folk der<br />
              <span className="italic font-light text-white/85">skaber.</span>
            </h2>
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2">
            {USECASES.map((u, i) => (
              <li
                key={u.title}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-7 transition-all hover:bg-white/[0.06] sm:p-8"
              >
                <span className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[#C9A56F] tabular-nums">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-display text-2xl font-semibold leading-tight">
                  {u.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{u.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ════════ HERO IMAGE ════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F] text-center">
            I detaljen
          </p>
          <h2 className="mt-4 text-center font-display text-3xl font-bold text-[#0F2A20] sm:text-4xl">
            Tæt på.
          </h2>
          <div className="mt-10 mx-auto aspect-square max-w-2xl overflow-hidden rounded-3xl bg-[#F5F1E8]">
            <Image
              src={heroImage}
              alt="Trusmi Smart Pencil til iPad"
              width={800}
              height={800}
              className="h-full w-full object-contain p-12"
              priority
            />
          </div>
        </div>
      </section>

      {/* ════════ SPECS ════════ */}
      <section className="bg-[#F5F1E8]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
            Tekniske data
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold text-[#0F2A20] sm:text-4xl">
            Specifikationer.
          </h2>
          <dl className="mt-10 divide-y divide-[#1A1004]/10">
            {SPECS.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-4 py-4">
                <dt className="text-sm font-medium uppercase tracking-wide text-[#3F4A45] sm:text-[13px] sm:tracking-[0.15em]">
                  {s.label}
                </dt>
                <dd className="text-right text-base font-semibold text-[#0F2A20] tabular-nums">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ════════ STORES ════════ */}
      <section id="butikker" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
              Klik & hent
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-[#0F2A20] sm:text-5xl">
              På lager. Lige nu.<br />
              <span className="italic font-light text-[#3F4A45]">I to butikker.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#3F4A45]">
              Bestil online før kl. 14 på en hverdag — pakken er klar samme dag i {slagelse.city} eller {vejle.city}. Eller kig forbi og prøv blyanten først.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[slagelse, vejle].map((store) => (
              <div
                key={store.slug}
                className="group flex flex-col rounded-3xl border border-[#0F2A20]/10 bg-[#F7F7F8] p-8 transition-shadow hover:shadow-lg sm:p-10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.3em] text-[#C9A56F]">
                      Butik · {store.city}
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-bold text-[#0F2A20] sm:text-3xl">
                      {store.name}
                    </h3>
                  </div>
                  <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                    <span className="absolute h-3 w-3 animate-ping rounded-full bg-[#1A3D2E] opacity-50" />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-[#1A3D2E]" />
                  </span>
                </div>
                <address className="mt-6 not-italic text-base leading-relaxed text-[#3F4A45]">
                  {store.street}<br />
                  {store.zip} {store.city}
                  {store.mall && (
                    <>
                      <br />
                      <span className="text-sm text-[#6E6E73]">{store.mall}</span>
                    </>
                  )}
                </address>
                <dl className="mt-6 grid gap-2 text-sm text-[#3F4A45]">
                  <div className="flex justify-between gap-3">
                    <dt>Hverdage</dt>
                    <dd className="tabular-nums">{store.hours.weekdays}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Lørdag</dt>
                    <dd className="tabular-nums">{store.hours.saturday}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Søndag</dt>
                    <dd className="tabular-nums">{store.hours.sunday}</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-wrap gap-3 pt-6 border-t border-[#0F2A20]/10">
                  <a
                    href={`tel:${store.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2A20] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1A3D2E]"
                  >
                    Ring {store.phone.replace("+45 ", "")}
                  </a>
                  <a
                    href={store.googleMapsUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0F2A20]/15 px-4 py-2 text-sm font-semibold text-[#0F2A20] transition-colors hover:border-[#0F2A20]/40"
                  >
                    Vis vej
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FAQ ════════ */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
            Spørgsmål & svar
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold text-[#0F2A20] sm:text-5xl">
            Det vigtigste.<br />
            <span className="italic font-light text-[#3F4A45]">Hurtigt besvaret.</span>
          </h2>
          <div className="mt-10">
            <FAQAccordion />
          </div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="bg-[#0F2A20] text-white">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
            Klar?
          </p>
          <h2 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-6xl">
            Tag den i hånden.<br />
            <span className="italic font-light text-white/85">I dag.</span>
          </h2>
          <p className="mt-6 text-base text-white/75 sm:text-lg">
            På lager i Slagelse og Vejle. Sendes samme dag ved bestilling før kl. 14.
          </p>
          <div className="mx-auto mt-10 max-w-xl">
            <BuyButton
              productId={data.id}
              title={data.title}
              image={heroImage}
              priceOere={finalPriceOere}
              fullWidth
            />
          </div>
          {compareKr && (
            <p className="mt-5 text-sm text-white/60">
              Du sparer {saveKr.toLocaleString("da-DK")} kr. — nypris {compareKr.toLocaleString("da-DK")} kr.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
