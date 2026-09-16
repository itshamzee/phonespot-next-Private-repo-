import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { DeviceImage } from "@/components/repair/device-image";
import { RepairCart } from "@/components/repair/repair-cart";
import { StorstromInsuranceTeaser } from "@/components/ui/storstrom-insurance-teaser";
import styles from "@/components/repair/repair.module.css";
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

  const cheapest = (await getServicesByModel(model.id))
    .filter((s) => s.price_dkk > 0)
    .sort((a, b) => a.price_dkk - b.price_dkk)[0];

  // Helt nye modeller oprettes uden services, så siden kan indekseres fra
  // lanceringsdagen — titlen må ikke love en pris, der ikke findes endnu.
  if (!cheapest) {
    return {
      title: `${model.name} Reparation — Skærmskift & Batteriskift | PhoneSpot`,
      description: `${model.name} reparation hos PhoneSpot i Vejle og Slagelse. Priser på skærmskift og batteriskift offentliggøres snart — kontakt os for en vurdering allerede i dag.`,
      alternates: {
        canonical: `https://phonespot.dk/reparation/${brand.slug}/${model.slug}`,
      },
    };
  }

  return {
    title: `${model.name} reparation i Vejle og Slagelse — Fra ${cheapest.price_dkk} DKK | PhoneSpot`,
    description: `${model.name} reparation i Vejle og Slagelse. Skærmskift, batteriskift og mere fra ${cheapest.price_dkk} DKK. Se priser og oplysninger om hver reparation hos PhoneSpot.`,
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
  const paidServices = services.filter((s) => s.price_dkk > 0);
  const cheapest =
    paidServices.length > 0
      ? Math.min(...paidServices.map((s) => s.price_dkk))
      : null;

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
                <span>Vejle og Slagelse</span>
              </div>
            </div>
          </div>
        </header>
        <section className={styles.section} aria-label="Reparationer og priser">
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
            />
          )}
        </section>
        <section className={styles.help}>
          <div>
            <h2>Er du i tvivl om fejlen?</h2>
            <p>
              Du behøver ikke kende løsningen på forhånd. Kontakt os eller kom
              forbi med din {model.name}, så hjælper vi dig videre.
            </p>
            <Link href="/kontakt">Få hjælp til reparationen</Link>
          </div>
          <div className={styles.storeLinks}>
            <Link href="/butik/vejle">
              <span>
                <strong>Vejle</strong>
                <small>Find vej og åbningstider</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/butik/slagelse">
              <span>
                <strong>Slagelse</strong>
                <small>Find vej og åbningstider</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
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
                Se garantioplysningerne ved den konkrete service og{" "}
                <Link className={styles.textLink} href="/handelsbetingelser">
                  vores reparationsbetingelser
                </Link>
                .
              </p>
            </details>
            <details>
              <summary>Skal jeg tage backup?</summary>
              <p>
                Vi anbefaler, at du tager en backup af dine data inden
                reparationen.
              </p>
            </details>
          </div>
        </section>
        <div className={styles.section}>
          <StorstromInsuranceTeaser variant="repair" />
        </div>
      </div>
    </div>
  );
}
