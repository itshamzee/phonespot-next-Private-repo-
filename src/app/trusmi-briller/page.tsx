import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { createServerClient } from "@/lib/supabase/client";
import { STORES } from "@/lib/store-config";
import { BuyButton } from "./_components/buy-button";
import { HeroVideo } from "./_components/hero-video";
import { FAQAccordion } from "./_components/faq";

const SLUG = "trusmi-ai-oversaetterbriller-sort";
const URL = "https://phonespot.dk/trusmi-briller";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Trusmi AI Oversætterbriller — Real-time oversættelse på 40+ sprog | PhoneSpot",
  description:
    "Smart-briller med real-time AI-oversættelse via Bluetooth 5.3. På lager i Slagelse + Vejle — hent samme dag. Fri fragt over 500 kr. Spar 400 kr nu — kun 799 kr.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Trusmi AI Oversætterbriller",
    description: "Real-time AI-oversættelse på 40+ sprog. På lager i Slagelse + Vejle. 799 kr.",
    url: URL,
    type: "website",
    images: [{ url: "/trusmi/02.webp", width: 550, height: 550 }],
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
  { label: "System",          value: "Android 9.0+ / iOS 10.0+" },
  { label: "Bluetooth",       value: "5.3 Low Energy" },
  { label: "Chipsæt",         value: "Allwinner V821" },
  { label: "BT-chipsæt",      value: "JL7018" },
  { label: "Batteri",         value: "255 mAh / 3,8V / 3C" },
  { label: "Standby",         value: "15 dage" },
  { label: "Brugstid",        value: "Over 8 timer" },
  { label: "Foto",            value: "6239 × 5058 pixel" },
  { label: "Opladningstid",   value: "~60 minutter" },
  { label: "Opladning",       value: "Magnetisk" },
  { label: "Materiale",       value: "Plastik PC + ABS" },
  { label: "Mål",             value: "176 × 153,5 × 49 mm" },
  { label: "Vægt",            value: "180 g" },
  { label: "Garanti",         value: "24 mdr. fuld returret" },
];

const STEPS: ReadonlyArray<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Forbind",
    body: "Hent Trusmi-app'en og forbind via Bluetooth — under 2 minutter første gang.",
  },
  {
    n: "02",
    title: "Vælg sprog",
    body: "40+ sprog at vælge mellem. Skift mellem dem mens samtalen kører.",
  },
  {
    n: "03",
    title: "Tal frit",
    body: "Brillerne lytter, app'en oversætter, du svarer. Som at have en personlig tolk.",
  },
];

const USECASES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Forretningsmøder",
    body: "Du holder møder med leverandører i Tyskland, Polen eller Kina. Trusmi sikrer at du forstår nuancerne — og bliver forstået.",
  },
  {
    title: "Rejser",
    body: "Bestil mad i Tokyo, spørg om vej i Lissabon, forhandl pris i Marrakesh. Uden at føle dig sårbar fordi du ikke kan sproget.",
  },
  {
    title: "Internationale familier",
    body: "Snak med svigerforældre i Polen eller Marokko som om I altid har talt samme sprog. Trusmi fjerner barrieren.",
  },
  {
    title: "Konferencer & events",
    body: "Lyt til foredrag på sprog du ikke mestrer. Real-time undertekster i øret — uden at du skal kigge ned i en telefon.",
  },
];

const FEATURES: ReadonlyArray<{ title: string; body: string; iconPath: string }> = [
  {
    title: "Real-time oversættelse",
    body: "Bluetooth 5.3 Low Energy giver lav latenstid og stabil forbindelse til din telefon, så samtalen flyder.",
    iconPath: "M12 2v20M2 12h20",
  },
  {
    title: "8+ timers brugstid",
    body: "255 mAh batteri rækker en hel arbejdsdag. 15 dages standby så de altid er klar.",
    iconPath: "M3 7h14a2 2 0 012 2v6a2 2 0 01-2 2H3M3 7v10M21 11v2",
  },
  {
    title: "Magnetisk hurtig-opladning",
    body: "Klik på, snap af. Fuld opladning på cirka 60 minutter via det medfølgende kabel.",
    iconPath: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  },
  {
    title: "Indbygget kamera",
    body: "31 megapixel sensor (6239 × 5058) til hurtig dokumentation. Synkroniseres trådløst.",
    iconPath: "M3 3h18v18H3zM12 8a4 4 0 100 8 4 4 0 000-8zM9 3v2h6V3",
  },
  {
    title: "Lette og diskrete",
    body: "180 gram total. PC + ABS plastik — ridsefast, holdbart, og diskret nok til møder.",
    iconPath: "M2 12c4-6 14-6 18 0M2 12c4 6 14 6 18 0M9 12a3 3 0 116 0 3 3 0 01-6 0z",
  },
  {
    title: "iOS + Android",
    body: "Virker både på iPhone (iOS 10+) og Android (9+). Du behøver ikke skifte din telefon.",
    iconPath: "M5 4h14v16H5zM10 18h4",
  },
];

export default async function TrusmiBrillerPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("sku_products")
    .select("id, title, description, selling_price, sale_price, images")
    .eq("slug", SLUG)
    .eq("is_active", true)
    .eq("status", "published")
    .single<Product>();

  if (!data) notFound();

  const heroImage = data.images?.[0] ?? "/trusmi/02.webp";
  const gallery = data.images ?? [];
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
    description: "AI-oversætterbriller med Bluetooth 5.3, real-time oversættelse på 40+ sprog.",
    image: gallery.map((img) => `https://phonespot.dk${img}`),
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
        {/* Editorial top label */}
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12">
          <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <span>Trusmi · Lanceringspris</span>
            <span className="hidden sm:inline">Dispatch · 2026</span>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:grid-cols-12 lg:gap-16">
          {/* Hero video — 7 cols */}
          <div className="lg:col-span-7">
            <HeroVideo
              src="/trusmi/hero.mp4"
              poster={heroImage}
              className="aspect-[4/5] w-full rounded-[28px] ring-1 ring-white/10 sm:aspect-square lg:aspect-[4/5]"
            />
          </div>

          {/* Pitch + price + CTA — 5 cols */}
          <div className="flex flex-col justify-end lg:col-span-5">
            <h1 className="font-display text-[44px] font-bold leading-[0.95] tracking-tight sm:text-[64px] lg:text-[72px]">
              Forstå<br />
              <span className="italic font-light text-white/85">verden</span><br />
              i real-time.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Trusmi-brillerne lytter med dig. App&apos;en oversætter på 40+ sprog. Du svarer
              naturligt. Som at have en personlig tolk — uden tolken.
            </p>

            {/* Price block — editorial */}
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

            {/* Quick benefits */}
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

      {/* ════════ THE PITCH (editorial) ════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
            Hvorfor Trusmi
          </p>
          <h2 className="mt-6 font-display text-3xl font-bold leading-[1.1] text-[#0F2A20] sm:text-5xl lg:text-[56px]">
            7 milliarder mennesker.<br />
            <span className="italic font-light text-[#3F4A45]">Et sprog: dit.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[#3F4A45]">
            Du behøver ikke at lære nye sprog for at forstå verden. Du behøver bare en
            partner der gør det for dig — i øjeblikket, mens samtalen sker. Det er det
            Trusmi er. Ikke en gimmick. Et redskab.
          </p>
        </div>
      </section>

      {/* ════════ HOW IT WORKS — 3 steps ════════ */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
                Sådan virker det
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-[#0F2A20] sm:text-4xl">
                Tre skridt fra<br />kasse til samtale.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#3F4A45]">
                Setup tager mindre end fem minutter. Derefter er det bare på og snak.
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

      {/* ════════ FEATURES grid ════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
              Specifikationer der betyder noget
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-[#0F2A20] sm:text-4xl">
              Bygget til den globale samtale.
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

      {/* ════════ USE CASES — editorial cards ════════ */}
      <section className="bg-[#0F2A20] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
              Til hvad
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Designet til folk der<br />
              <span className="italic font-light text-white/85">bevæger sig.</span>
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

      {/* ════════ GALLERY ════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#C9A56F]">
                I detaljen
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold text-[#0F2A20] sm:text-4xl">
                Set fra alle vinkler.
              </h2>
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.map((src, i) => (
              <div
                key={src}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-[#F5F1E8]"
              >
                <Image
                  src={src}
                  alt={`Trusmi AI Oversætterbriller billede ${i + 1}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ SPECS table ════════ */}
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

      {/* ════════ PICKUP STORES — feature ════════ */}
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
              Bestil online før kl. 14 på en hverdag — pakken er klar samme dag i {slagelse.city} eller {vejle.city}. Eller kig forbi og prøv brillerne først.
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
            Forstå verden.<br />
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
