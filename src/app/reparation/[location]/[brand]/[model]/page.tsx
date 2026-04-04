import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { STORES } from "@/lib/store-config";
import { DeviceImage } from "@/components/repair/device-image";
import { RepairCart } from "@/components/repair/repair-cart";
import {
  getBrandBySlug,
  getModelBySlug,
  getServicesByModel,
  getAllModelSlugs,
} from "@/lib/supabase/repairs";

export const revalidate = 3600;

type Props = {
  params: Promise<{ location: string; brand: string; model: string }>;
};

export async function generateStaticParams() {
  const locations = Object.keys(STORES);
  const modelSlugs = await getAllModelSlugs();
  return locations.flatMap((location) =>
    modelSlugs.map(({ brand, model }) => ({ location, brand, model })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location, brand: brandSlug, model: modelSlug } = await params;
  const store = STORES[location];
  if (!store) return {};

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};
  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) return {};

  const city = store.city;
  const cheapest = (await getServicesByModel(model.id))
    .filter((s) => s.price_dkk > 0)
    .sort((a, b) => a.price_dkk - b.price_dkk)[0];

  return {
    title: `${model.name} Reparation ${city} — Fra ${cheapest?.price_dkk ?? ""} DKK | PhoneSpot`,
    description: `${model.name} reparation i ${city} fra ${cheapest?.price_dkk ?? ""} kr. Skærmskift på 30 min med livstidsgaranti. Besøg os på ${store.street}, ${store.zip} ${city}.`,
    alternates: {
      canonical: `https://phonespot.dk/reparation/${location}/${brand.slug}/${model.slug}`,
    },
  };
}

export default async function LocationModelPricePage({ params }: Props) {
  const { location, brand: brandSlug, model: modelSlug } = await params;

  const store = STORES[location];
  if (!store) notFound();

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) notFound();

  const city = store.city;
  const storeLocation = store.mall
    ? `${store.mall}, ${store.street}`
    : store.street;

  const services = await getServicesByModel(model.id);
  const paidServices = services.filter((s) => s.price_dkk > 0);
  const cheapest =
    paidServices.length > 0
      ? Math.min(...paidServices.map((s) => s.price_dkk))
      : null;
  const totalServices = services.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    url: `https://phonespot.dk/reparation/${location}/${brand.slug}/${model.slug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.street,
      addressLocality: city,
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
        opens: store.hours.weekdays.split(" – ")[0],
        closes: store.hours.weekdays.split(" – ")[1],
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: store.hours.saturday.split(" – ")[0],
        closes: store.hours.saturday.split(" – ")[1],
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: store.hours.sunday.split(" – ")[0],
        closes: store.hours.sunday.split(" – ")[1],
      },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${model.name} Reparation`,
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name },
        price: s.price_dkk,
        priceCurrency: "DKK",
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* ================================================================= */}
      {/*  HERO HEADER — Clean light header                                  */}
      {/* ================================================================= */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-1.5 text-[#86868B]">
              <li>
                <Link href="/reparation" className="hover:text-[#111111]">
                  Reparation
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/reparation/${location}`}
                  className="hover:text-[#111111]"
                >
                  {city}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/reparation/${location}/${brand.slug}`}
                  className="hover:text-[#111111]"
                >
                  {brand.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-[#111111]">{model.name}</li>
            </ol>
          </nav>

          <div className="flex items-center gap-6">
            {/* Device image */}
            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#E5E5EA] bg-white md:flex">
              <DeviceImage
                brandSlug={brand.slug}
                deviceType={brand.device_type}
                imageUrl={model.image_url}
                modelName={model.name}
                className="h-14 w-14 object-contain drop-shadow-sm"
              />
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold leading-[0.95] tracking-tight text-[#111111] md:text-4xl">
                {model.name}{" "}
                <span className="text-[#1A3D2E]">Reparation {city}</span>
              </h1>
              <p className="mt-3 max-w-lg text-[#86868B]">
                Se priser på alle {model.name} reparationer i {city} herunder.
                Alle priser er inkl. moms, reservedele og livstidsgaranti.
              </p>

              {/* Quick stats */}
              <div className="mt-4 flex flex-wrap gap-3">
                {cheapest && (
                  <span className="rounded-full bg-[#1A3D2E] px-4 py-1.5 text-sm font-bold text-white">
                    Fra {cheapest} DKK
                  </span>
                )}
                <span className="rounded-full border border-[#E5E5EA] bg-white px-4 py-1.5 text-sm font-medium text-[#86868B]">
                  {totalServices} reparationer
                </span>
                <span className="rounded-full border border-[#E5E5EA] bg-white px-4 py-1.5 text-sm font-medium text-[#86868B]">
                  Livstidsgaranti
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  MAIN CONTENT — RepairCart (service list + interactive sidebar)  */}
      {/* ================================================================= */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <RepairCart
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
              price_dkk: s.price_dkk,
              estimated_minutes: s.estimated_minutes,
              description: s.description,
              warranty_info: s.warranty_info,
              includes: s.includes,
              quality_tier: s.quality_tier,
              service_category: s.service_category,
              info_note: s.info_note,
            }))}
            brandSlug={brand.slug}
            brandName={brand.name}
            modelSlug={model.slug}
            modelName={model.name}
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/*  STORE INFO                                                        */}
      {/* ================================================================= */}
      <section className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-wrap gap-8">
            <div className="min-w-[200px]">
              <h3 className="font-display text-sm font-bold text-[#111111]">
                {store.name}
              </h3>
              <p className="mt-1 text-sm text-[#86868B]">
                {store.street}
                <br />
                {store.zip} {city}
              </p>
            </div>
            <div className="min-w-[200px]">
              <h3 className="font-display text-sm font-bold text-[#111111]">
                Åbningstider
              </h3>
              <p className="mt-1 text-sm text-[#86868B]">
                Hverdage: {store.hours.weekdays}
                <br />
                Lørdag: {store.hours.saturday}
                <br />
                Søndag: {store.hours.sunday}
              </p>
            </div>
            <div className="min-w-[200px]">
              <h3 className="font-display text-sm font-bold text-[#111111]">
                Kontakt
              </h3>
              <p className="mt-1 text-sm text-[#86868B]">
                {store.phone}
                <br />
                {store.email}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/*  RICH SEO CONTENT                                                  */}
      {/* ================================================================= */}
      <section className="border-t border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            {model.name} Reparation i {city}
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#111111]/70">
            <p>
              Har din {model.name} brug for en reparation? Hos PhoneSpot i{" "}
              {storeLocation}, {city}, tilbyder vi professionel reparation af din{" "}
              {model.name} til faste priser. Alle reparationer udføres af erfarne
              teknikere med kvalitetsdele, og du får livstidsgaranti på både
              arbejde og reservedele.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Specialister i {model.name} reparation i {city}
            </h3>
            <p>
              Vores teknikere i {city} har stor erfaring med {brand.name} enheder
              og kender din {model.name} indgående. Vi bruger kun reservedele der
              matcher de originale specifikationer, så din enhed fungerer præcis
              som ny efter reparationen.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Skærmskift, batteriskift og meget mere
            </h3>
            <p>
              Vi tilbyder et bredt udvalg af reparationer til din {model.name} i{" "}
              {city}. De mest populære reparationer inkluderer skærmskift,
              batteriskift og udskiftning af opladerstik. Se den fulde prisliste
              ovenfor for alle tilgængelige reparationer med faste priser.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Livstidsgaranti på alle reparationer
            </h3>
            <p>
              Alle {model.name} reparationer fra PhoneSpot {city} dækkes af vores
              livstidsgaranti. Det betyder at hvis den samme fejl opstår igen —
              uanset hvornår — reparerer vi enheden uden beregning.{" "}
              {cheapest &&
                `Priser på ${model.name} reparation i ${city} starter fra ${cheapest} DKK.`}
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Walk-in service eller book online
            </h3>
            <p>
              Du finder os på {store.street}, {store.zip} {city}. 90% af alle{" "}
              {model.name} reparationer tager kun 30 minutter. Du kan komme forbi
              som walk-in eller booke tid online.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Ofte stillede spørgsmål
            </h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>
                  Hvor lang tid tager en {model.name} reparation?
                </strong>{" "}
                De fleste reparationer tager kun 30 minutter. Du kan vente i
                butikken mens vi fikser din enhed.
              </li>
              <li>
                <strong>Får jeg garanti?</strong> Ja, livstidsgaranti på alle
                reparationer — både arbejde og reservedele.
              </li>
              <li>
                <strong>Mister jeg mine data?</strong> Ved de fleste
                reparationer bevares dine data. Vi anbefaler dog altid at tage
                backup inden du sender enheden.
              </li>
              <li>
                <strong>Hvor ligger PhoneSpot {city}?</strong> Vi ligger på{" "}
                {store.street}, {store.zip} {city}.{" "}
                {store.mall && `Du finder os i ${store.mall}.`}
              </li>
            </ul>
          </div>

          {/* Bottom CTA — clean light version */}
          <div className="mt-12 overflow-hidden rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-8 text-center">
            <h3 className="font-display text-xl font-bold text-[#111111]">
              Klar til at booke din {model.name} reparation i {city}?
            </h3>
            <p className="mt-2 text-sm text-[#86868B]">
              Vælg din reparation ovenfor eller kontakt os for en gratis
              vurdering.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/reparation/booking?brand=${brand.slug}&model=${model.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#1A3D2E]/90 hover:shadow-lg hover:shadow-[#1A3D2E]/20"
              >
                Book reparation
              </Link>
              <Link
                href="/kontakt"
                className="inline-block rounded-full border border-[#E5E5EA] bg-white px-8 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F7F7F8]"
              >
                Kontakt os
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
