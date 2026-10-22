import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { STORES, UPCOMING_STORES } from "@/lib/store-config";
import { DeviceImage } from "@/components/repair/device-image";
import { RepairCart } from "@/components/repair/repair-cart";
import { RepairPriceTable } from "@/components/repair/repair-price-table";
import { RepairStoreFinder } from "@/components/repair/repair-store-finder";
import { RepairUpsell } from "@/components/repair/repair-upsell";
import { getModelUpsell } from "@/lib/product/model-accessories";
import { accessoryModelSlug } from "@/lib/product/accessory-models";
import { StorstromInsuranceTeaser } from "@/components/ui/storstrom-insurance-teaser";
import styles from "@/components/repair/repair.module.css";
import sectionStyles from "@/components/repair/model-sections.module.css";
import {
  getBrandBySlug,
  getModelBySlug,
  getServicesByModel,
  getAllModelSlugs,
} from "@/lib/supabase/repairs";
import { countsTowardFromPrice } from "@/lib/repairs/from-price";

export const revalidate = 3600;

type Props = {
  params: Promise<{ brand: string; model: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllModelSlugs();
  return slugs.map(({ brand, model }) => ({ brand, model }));
}

const isPhoneLike = (deviceType: string) =>
  deviceType === "smartphone" || deviceType === "tablet" || deviceType === "watch";

/** Titel- og tekstvarianter, så konsol og apparat aldrig lover skærm/batteri. */
function metaCopy(deviceType: string): { topics: string; soon: string } {
  if (isPhoneLike(deviceType)) {
    return { topics: "Skærmskift, batteriskift og mere", soon: "skærmskift og batteriskift" };
  }
  if (deviceType === "appliance") {
    return { topics: "Fejlsøgning, batteri og reparation", soon: "reparation" };
  }
  return { topics: "Reparation og fejlsøgning", soon: "reparation" };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug, model: modelSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};
  const model = await getModelBySlug(brand.id, modelSlug);
  if (!model) return {};

  const cheapest = (await getServicesByModel(model.id))
    .filter((s) => countsTowardFromPrice(s))
    .sort((a, b) => a.price_dkk - b.price_dkk)[0];

  // Helt nye modeller oprettes uden services, så siden kan indekseres fra
  // lanceringsdagen — titlen må ikke love en pris, der ikke findes endnu.
  const copy = metaCopy(brand.device_type);
  if (!cheapest) {
    return {
      title: isPhoneLike(brand.device_type)
        ? `${model.name} Reparation — Skærmskift & Batteriskift | PhoneSpot`
        : `${model.name} reparation i Vejle og Slagelse | PhoneSpot`,
      description: `${model.name} reparation hos PhoneSpot i Vejle og Slagelse. Priser på ${copy.soon} offentliggøres snart — kontakt os for en vurdering allerede i dag.`,
      alternates: {
        canonical: `https://phonespot.dk/reparation/${brand.slug}/${model.slug}`,
      },
    };
  }

  return {
    title: `${model.name} reparation i Vejle og Slagelse — fra ${cheapest.price_dkk.toLocaleString("da-DK")} kr. | PhoneSpot`,
    description: `${model.name} reparation i Vejle og Slagelse. ${copy.topics} fra ${cheapest.price_dkk.toLocaleString("da-DK")} kr. Se priser og oplysninger om hver reparation hos PhoneSpot.`,
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

  const [services, upsell] = await Promise.all([
    getServicesByModel(model.id),
    getModelUpsell(model.name),
  ]);
  const paidServices = services.filter((s) => countsTowardFromPrice(s));
  const cheapest =
    paidServices.length > 0
      ? Math.min(...paidServices.map((s) => s.price_dkk))
      : null;

  // Tillidslinjen bygger på modellens egne data, så den aldrig lover mere end
  // reparationerne faktisk har: garanti fra warranty_info, tid fra estimated_minutes.
  const repairs = services.filter((s) => s.slug !== "diagnostik");
  const lifetimeCount = repairs.filter((s) =>
    s.warranty_info?.toLocaleLowerCase("da-DK").includes("livstid"),
  ).length;
  const minutes = repairs
    .map((s) => s.estimated_minutes ?? 0)
    .filter((m) => m > 0);
  const twelveMonthCount = repairs.filter((s) =>
    s.warranty_info?.toLocaleLowerCase("da-DK").includes("12 måneders garanti"),
  ).length;
  const trust = [
    twelveMonthCount > 0 && {
      title: "12 mdr. garanti",
      text:
        twelveMonthCount === repairs.length
          ? "På dele og arbejde"
          : "På de fleste reparationer",
    },
    lifetimeCount > 0 && {
      title: "Livstidsgaranti",
      text:
        lifetimeCount === repairs.length
          ? "På arbejde og dele"
          : "På de fleste reparationer",
    },
    minutes.length > 0 && {
      title:
        Math.min(...minutes) === Math.max(...minutes)
          ? "Ca. " + minutes[0] + " min."
          : Math.min(...minutes) + "–" + Math.max(...minutes) + " min.",
      text: "Forventet tid pr. reparation",
    },
    {
      title: "Gratis fejlsøgning",
      text: "Ved disken i butikken",
    },
    {
      title: "Anmeldelser",
      text: "Læs dem på Trustpilot",
      href: "https://dk.trustpilot.com/review/phonespot.dk",
    },
  ].filter(Boolean) as { title: string; text: string; href?: string }[];

  const storeCities = Object.values(STORES).map((store) => store.city);
  const finderStores = Object.values(STORES).map((store) => ({
    slug: store.slug,
    name: store.name,
    city: store.city,
    street: store.street,
    zip: store.zip,
    mall: store.mall,
    phone: store.phone,
    href: store.slug === "vejle" ? "/reparation-vejle" : "/reparation-slagelse",
    mapsUrl: store.googleMapsUrl,
    hours: store.hours,
    coordinates: store.coordinates,
  }));
  const upcomingStores = Object.values(UPCOMING_STORES).map((store) => ({
    slug: store.slug,
    city: store.city.replace(/\s+[NSØV]$/, ""),
    mall: store.mall,
    opens: store.opens,
  }));

  // Reparationerne udføres i begge butikker, så schemaet beskriver ydelsen
  // med begge som udbyder i stedet for at binde modelsiden til én adresse.
  const providers = [STORES.vejle, STORES.slagelse].map((store) => ({
    "@type": "ElectronicsRepair",
    name: store.name,
    telephone: store.phone,
    url: store.slug === "vejle" ? "https://phonespot.dk/reparation-vejle" : "https://phonespot.dk/reparation-slagelse",
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
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${model.name} reparation`,
    serviceType: brand.device_type === "appliance" ? "Reparation af husholdningsapparater" : brand.device_type === "console" ? "Konsolreparation" : "Mobilreparation",
    provider: providers,
    areaServed: [STORES.vejle.city, STORES.slagelse.city],
    // Uden services ville kataloget være tomt — udelad det, så schemaet
    // stadig validerer på "priser kommer snart"-sider.
    ...(paidServices.length > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `${model.name} Reparation`,
        itemListElement: paidServices.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.name },
          price: s.price_dkk,
          priceCurrency: "DKK",
        })),
      },
    }),
  };

  return (
    <div className={styles.shell}>
      <JsonLd data={jsonLd} />
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}>
          <ol>
            <li>
              <Link href="/">Forside</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/reparation">Reparation</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={"/reparation/" + brand.slug}>{brand.name}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{model.name}</li>
          </ol>
        </nav>
        <header className={styles.header}>
          <div className={styles.modelHeader}>
            {model.image_url && (
              <div className={styles.modelHeaderPhoto}>
                <DeviceImage
                  brandSlug={brand.slug}
                  deviceType={brand.device_type}
                  imageUrl={model.image_url}
                  modelName={model.name}
                  className="h-full w-full"
                />
              </div>
            )}
            <div>
              <span className={styles.eyebrow}>Reparation hos PhoneSpot</span>
              <h1>{model.name}</h1>
              <p>
                Vælg, hvad vi skal hjælpe med. Se den konkrete pris og
                oplysninger om reservedelen, før du booker.
              </p>
              <div className={styles.priceLine}>
                <span>
                  {cheapest
                    ? "Fra " + cheapest.toLocaleString("da-DK") + " kr."
                    : "Priser kommer snart"}
                </span>
                <span>{storeCities.join(" og ")}</span>
              </div>
            </div>
          </div>
          {services.length > 0 && (
            <ul className={sectionStyles.trustLine} aria-label="Derfor PhoneSpot">
              {trust.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                      {item.text}
                    </a>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </header>
        <section
          id="reparationer"
          className={styles.section}
          aria-label="Reparationer og priser"
        >
          {services.length === 0 ? (
            <div className={styles.empty}>
              <h2>Priser kommer snart</h2>
              <p>
                Vi har endnu ikke offentliggjort reparationspriser til{" "}
                {model.name}. Kontakt os, så hjælper vi med at vurdere fejlen og
                mulighederne.
              </p>
              <Link href="/kontakt">Kontakt os om {model.name}</Link>
              <p className="mt-5">
                <Link href={"/reparation/" + brand.slug}>
                  Se alle {brand.name}-modeller
                </Link>
              </p>
            </div>
          ) : (
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
              deviceType={brand.device_type}
            />
          )}
        </section>
        <RepairUpsell
          modelName={model.name}
          items={upsell}
          allHref={"/tilbehoer?model=" + accessoryModelSlug(model.name)}
        />
        {services.length > 0 && (
          <RepairPriceTable
            modelName={model.name}
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
              price_dkk: s.price_dkk,
              estimated_minutes: s.estimated_minutes,
              warranty_info: s.warranty_info,
              quality_tier: s.quality_tier,
              service_category: s.service_category,
            }))}
          />
        )}
        <p className="py-6 text-sm">
          <Link href={"/reparation/" + brand.slug} className="font-semibold text-[#1A3D2E] underline underline-offset-4">
            Se alle {brand.name}-reparationer
          </Link>
        </p>
        <RepairStoreFinder
          modelName={model.name}
          stores={finderStores}
          upcoming={upcomingStores}
        />
        <section className={styles.faq}>
          <h2>Inden du afleverer.</h2>
          <div>
            <details>
              <summary>Hvor lang tid tager reparationen?</summary>
              <p>
                Det forventede tidsforbrug står ved reparationen, når det er
                oplyst. Tid og tilgængelighed afhænger af fejlen og
                reservedelen. Kontakt butikken, hvis du har brug for at afklare
                tiden.
              </p>
            </details>
            <details>
              <summary>Hvad gælder for garanti?</summary>
              <p>
                {brand.device_type === "appliance"
                  ? "Reparation af husholdningsapparater har 12 måneders garanti på dele og arbejde."
                  : brand.device_type === "console"
                    ? "Garantivilkårene oplyses ved den enkelte reparation, før vi går i gang."
                    : "Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele, og vandskade har 3 måneders garanti."}{" "}Se også{" "}
                <Link className={styles.textLink} href="/handelsbetingelser">
                  vores reparationsbetingelser
                </Link>
                .
              </p>
            </details>
            {brand.device_type !== "appliance" && (
              <details>
                <summary>Skal jeg tage backup?</summary>
                <p>
                  Vi anbefaler, at du tager en backup af dine data inden
                  reparationen.
                </p>
              </details>
            )}
          </div>
        </section>
        {brand.device_type !== "appliance" && (
          <div className={styles.section}>
            <StorstromInsuranceTeaser variant="repair" />
          </div>
        )}
      </div>
    </div>
  );
}
