import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { STORE, STORES } from "@/lib/store-config";
import { DeviceImage } from "@/components/repair/device-image";
import { RepairCart } from "@/components/repair/repair-cart";
import { StorstromInsuranceTeaser } from "@/components/ui/storstrom-insurance-teaser";
// ServiceInfoTooltip moved into RepairCart client component
import {
  getBrandBySlug,
  getModelBySlug,
  getServicesByModel,
  getAllModelSlugs,
} from "@/lib/supabase/repairs";

export const revalidate = 3600;

type Props = {
  params: Promise<{ brand: string; model: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllModelSlugs();
  return slugs.map(({ brand, model }) => ({ brand, model }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug, model: modelSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};
  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) return {};

  const cheapest = (await getServicesByModel(model.id)).filter(s => s.price_dkk > 0).sort((a, b) => a.price_dkk - b.price_dkk)[0];

  return {
    title: `${model.name} Reparation Slagelse — Fra ${cheapest?.price_dkk ?? ""} DKK | PhoneSpot`,
    description: `${model.name} reparation i Slagelse. Skærmskift, batteriskift og mere fra ${cheapest?.price_dkk ?? ""} DKK. Livstidsgaranti på alle reparationer. Hurtig service hos PhoneSpot.`,
    alternates: {
      canonical: `https://phonespot.dk/reparation/${brand.slug}/${model.slug}`,
    },
  };
}

export default async function ModelPricePage({ params }: Props) {
  const { brand: brandSlug, model: modelSlug } = await params;

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) notFound();

  const services = await getServicesByModel(model.id);
  const paidServices = services.filter(s => s.price_dkk > 0);
  const cheapest = paidServices.length > 0
    ? Math.min(...paidServices.map(s => s.price_dkk))
    : null;
  const totalServices = services.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: STORE.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: STORE.street,
      addressLocality: STORE.city,
      postalCode: STORE.zip,
      addressCountry: STORE.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: STORE.coordinates.lat,
      longitude: STORE.coordinates.lng,
    },
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
              <li><Link href="/reparation" className="hover:text-[#111111]">Reparation</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href={`/reparation/${brand.slug}`} className="hover:text-[#111111]">{brand.name}</Link></li>
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
                {model.name} <span className="text-[#1A3D2E]">Reparation</span>
              </h1>
              <p className="mt-3 max-w-lg text-[#86868B]">
                Se priser på alle {model.name} reparationer herunder. Alle priser er inkl. moms,
                reservedele og livstidsgaranti.
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
      {/*  INSURANCE TEASER — Storstrøm Forsikring                          */}
      {/* ================================================================= */}
      <section className="bg-[#F7F7F8] pb-12">
        <div className="mx-auto max-w-7xl px-4">
          <StorstromInsuranceTeaser variant="repair" />
        </div>
      </section>

      {/* ================================================================= */}
      {/*  RICH SEO CONTENT                                                  */}
      {/* ================================================================= */}
      <section className="border-t border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            {model.name} Reparation
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#111111]/70">
            <p>
              Har din {model.name} brug for en reparation? Hos PhoneSpot i Slagelse og Vejle
              tilbyder vi professionel reparation af din {model.name} til faste priser.
              Alle reparationer udføres af erfarne teknikere med kvalitetsdele, og du får
              livstidsgaranti på både arbejde og reservedele.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Specialister i {model.name} reparation
            </h3>
            <p>
              Vores teknikere har stor erfaring med {brand.name} enheder og kender din {model.name}
              indgående. Vi bruger kun reservedele der matcher de originale specifikationer,
              så din enhed fungerer præcis som ny efter reparationen.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Skærmskift, batteriskift og meget mere
            </h3>
            <p>
              Vi tilbyder et bredt udvalg af reparationer til din {model.name}. De mest
              populære reparationer inkluderer skærmskift, batteriskift og udskiftning af
              opladerstik. Se den fulde prisliste ovenfor for alle tilgængelige reparationer
              med faste priser.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Livstidsgaranti på alle reparationer
            </h3>
            <p>
              Alle {model.name} reparationer fra PhoneSpot dækkes af vores livstidsgaranti.
              Det betyder at hvis den samme fejl opstår igen — uanset hvornår — reparerer
              vi enheden uden beregning. {cheapest && `Priser på ${model.name} reparation starter fra ${cheapest} DKK.`}
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Walk-in service eller book online
            </h3>
            <p>
              Du finder os i {STORES.slagelse.mall}, {STORES.slagelse.street}, {STORES.slagelse.zip} {STORES.slagelse.city}
              og på {STORES.vejle.street}, {STORES.vejle.zip} {STORES.vejle.city}.
              90% af alle {model.name} reparationer tager kun 30 minutter.
              Du kan komme forbi som walk-in eller booke tid online.
            </p>

            <h3 className="!mt-8 font-display text-lg font-bold text-[#111111]">
              Ofte stillede spørgsmål
            </h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Hvor lang tid tager en {model.name} reparation?</strong> De fleste
                reparationer tager kun 30 minutter. Du kan vente i butikken mens vi
                fikser din enhed.
              </li>
              <li>
                <strong>Får jeg garanti?</strong> Ja, livstidsgaranti på alle reparationer —
                både arbejde og reservedele.
              </li>
              <li>
                <strong>Mister jeg mine data?</strong> Ved de fleste reparationer bevares
                dine data. Vi anbefaler dog altid at tage backup inden du sender enheden.
              </li>
            </ul>
          </div>

          {/* Bottom CTA — clean light version */}
          <div className="mt-12 overflow-hidden rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-8 text-center">
            <h3 className="font-display text-xl font-bold text-[#111111]">
              Klar til at booke din {model.name} reparation?
            </h3>
            <p className="mt-2 text-sm text-[#86868B]">
              Vælg din reparation ovenfor eller kontakt os for en gratis vurdering.
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
