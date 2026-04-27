import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { createServerClient } from "@/lib/supabase/client";
import { BuyButton } from "./_components/buy-button";

const SLUG = "trusmi-ai-oversaetterbriller-sort";
const URL = "https://phonespot.dk/trusmi-briller";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Trusmi AI Oversætterbriller — Real-time oversættelse | PhoneSpot",
  description:
    "Smart-briller med real-time AI-oversættelse via Bluetooth 5.3. 8+ timers brugstid, 15 dages standby, magnetisk opladning. Spar 400 kr — kun 799 kr inkl. moms. Fri fragt over 500.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Trusmi AI Oversætterbriller",
    description: "Real-time AI-oversættelse via Bluetooth 5.3 — kun 799 kr.",
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
  { label: "System",          value: "Android 9.0+ og iOS 10.0+" },
  { label: "Bluetooth",       value: "5.3 Low Energy" },
  { label: "Chipsæt",         value: "Allwinner V821" },
  { label: "BT-chipsæt",      value: "JL7018" },
  { label: "Batteri",         value: "255 mAh / 3,8V / 3C" },
  { label: "Standby",         value: "15 dage" },
  { label: "Brugstid",        value: "Over 8 timer" },
  { label: "Foto",            value: "6239 × 5058 pixel" },
  { label: "Opladningstid",   value: "Cirka 60 minutter" },
  { label: "Opladning",       value: "Magnetisk" },
  { label: "Materiale",       value: "Plastik PC + ABS" },
  { label: "Mål",             value: "176 × 153,5 × 49 mm" },
  { label: "Vægt",            value: "180 g" },
];

const FEATURES: ReadonlyArray<{ icon: React.ReactNode; title: string; body: string }> = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M12 2v20M2 12h20" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
    title: "Real-time oversættelse",
    body: "Forbind til din telefon via Bluetooth 5.3 og få samtaler oversat øjeblikkeligt — perfekt til rejser, internationale kunder og forretningsmøder.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <rect x="2" y="7" width="18" height="10" rx="2" />
        <path d="M22 11v2" />
      </svg>
    ),
    title: "8+ timers brugstid",
    body: "255 mAh batteri giver dig en hel arbejdsdag på en opladning. 15 dages standby — slip altid det med opladning når du er på farten.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    ),
    title: "Magnetisk hurtig-opladning",
    body: "Fuld opladning på cirka 60 minutter via den medfølgende magnetiske oplader — klik på, snap af.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="12" cy="13" r="4" />
        <path d="M9 3v2h6V3" />
      </svg>
    ),
    title: "Indbygget kamera",
    body: "31 MP foto-sensor (6239 × 5058) til hurtig dokumentation — billeder synkroniseres trådløst til din telefon.",
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.title,
    description: data.description?.split("\n")[0] ?? "AI-oversætterbriller med Bluetooth 5.3",
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

      {/* ───── HERO ───── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F2A20] via-[#1A3D2E] to-[#0F2A20] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:py-24">
          {/* Left: video */}
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-black/30 shadow-2xl ring-1 ring-white/10">
            <video
              src="/trusmi/hero.mp4"
              autoPlay
              muted
              loop
              playsInline
              poster={heroImage}
              className="h-full w-full object-cover"
              aria-label="Trusmi AI Oversætterbriller produktvideo"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          {/* Right: copy + price + CTA */}
          <div className="flex flex-col justify-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Nyhed · Trusmi
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-5xl">
              Oversæt verden i real-time.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
              Smart-briller med indbygget AI-oversættelse. Bluetooth 5.3 til din telefon, 8+ timers brugstid, 15 dages standby. Magnetisk opladning. Apple-clean design.
            </p>

            {/* Price block */}
            <div className="mt-8 inline-flex flex-col gap-1 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur-sm">
              {compareKr && (
                <p className="text-sm text-white/60 line-through">
                  Nypris {compareKr.toLocaleString("da-DK")} kr.
                </p>
              )}
              <div className="flex items-baseline gap-3">
                <span className="font-display text-4xl font-bold text-white sm:text-5xl">
                  {finalKr.toLocaleString("da-DK")}
                </span>
                <span className="text-xl font-semibold text-white">kr.</span>
              </div>
              <p className="text-xs text-white/70">inkl. moms</p>
              {saveKr > 0 && (
                <p className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#00B67A]/20 px-3 py-1 text-xs font-semibold text-[#7DE3B5]">
                  Spar {saveKr.toLocaleString("da-DK")} kr. nu
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="mt-6">
              <BuyButton
                productId={data.id}
                title={data.title}
                image={heroImage}
                priceOere={finalPriceOere}
              />
            </div>

            {/* Trust strip */}
            <ul className="mt-8 grid grid-cols-2 gap-3 text-xs text-white/85 sm:grid-cols-4">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[#7DE3B5]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                Fri fragt over 500 kr
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[#7DE3B5]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                14 dages returret
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[#7DE3B5]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                Lager i Slagelse + Vejle
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[#7DE3B5]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                Trustpilot 4,4 ★
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-[#111111] sm:text-4xl">
              Bygget til den globale samtale
            </h2>
            <p className="mt-3 text-base text-[#6E6E73]">
              Fire grunde til at flere danskere skifter til Trusmi end til alle andre AI-briller tilsammen.
            </p>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-[#E5E5EA] bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A3D2E]/10 text-[#1A3D2E]">
                  {f.icon}
                </div>
                <h3 className="mt-5 text-base font-semibold text-[#111111]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───── GALLERY ───── */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center font-display text-3xl font-bold text-[#111111] sm:text-4xl">
            Set fra alle vinkler
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.map((src, i) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-[#E5E5EA]"
              >
                <Image
                  src={src}
                  alt={`Trusmi AI Oversætterbriller billede ${i + 1}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-contain p-4"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── SPECS ───── */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="font-display text-3xl font-bold text-[#111111] sm:text-4xl">
            Specifikationer
          </h2>
          <dl className="mt-8 divide-y divide-[#E5E5EA] rounded-2xl border border-[#E5E5EA] bg-white">
            {SPECS.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-4 px-5 py-4">
                <dt className="text-sm font-medium text-[#6E6E73]">{s.label}</dt>
                <dd className="text-right text-sm font-semibold text-[#111111]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="bg-[#1A3D2E] text-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Klar til at oversætte verden?</h2>
          <p className="mt-3 text-base text-white/80">
            På lager i Slagelse og Vejle. Sendes samme dag ved bestilling før kl. 14.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <BuyButton
              productId={data.id}
              title={data.title}
              image={heroImage}
              priceOere={finalPriceOere}
            />
          </div>
          {compareKr && (
            <p className="mt-4 text-sm text-white/70">
              Du sparer {(compareKr - finalKr).toLocaleString("da-DK")} kr. — nypris {compareKr.toLocaleString("da-DK")} kr.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
