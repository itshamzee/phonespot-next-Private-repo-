import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllBrandSlugs,
  getBrandBySlug,
  getModelsByBrand,
  getCheapestPrice,
} from "@/lib/supabase/repairs";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import { ModelGrid, type ModelCardData } from "./model-grid";
import styles from "@/components/repair/repair.module.css";

export const revalidate = 3600;

type Props = { params: Promise<{ brand: string }> };

export async function generateStaticParams() {
  const slugs = await getAllBrandSlugs();
  return slugs.map((brand) => ({ brand }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};

  return {
    title: `${brand.name}-reparation i Vejle og Slagelse — se priser | PhoneSpot`,
    description: `Professionel ${brand.name}-reparation i Vejle og Slagelse. Se priser på skærmskift, batteriskift og mere for alle ${brand.name}-modeller. Se priser og oplysninger om den enkelte reparation.`,
    alternates: {
      canonical: `https://phonespot.dk/reparation/${brand.slug}`,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { brand: brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const models = await getModelsByBrand(brand.id);

  const modelCards: ModelCardData[] = await Promise.all(
    models.map(async (model) => ({
      slug: model.slug,
      name: model.name,
      series: model.series,
      cheapestPrice: await getCheapestPrice(model.id),
      brandSlug: brand.slug,
      imageUrl: model.image_url,
      deviceType: brand.device_type,
    })),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${brand.name} Reparation - ${STORE.name}`,
    url: `https://phonespot.dk/reparation/${brand.slug}`,
    description: `Professionel ${brand.name}-reparation i ${STORE.city}. Se priser og oplysninger om den enkelte reparation.`,
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
      name: `${brand.name} Reparationer`,
      itemListElement: modelCards
        .filter((m) => m.cheapestPrice != null && m.cheapestPrice > 0)
        .map((m) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: `${m.name} Reparation`,
          },
          priceCurrency: "DKK",
          price: m.cheapestPrice,
        })),
    },
  };

  return (
    <div className={styles.shell}>
      <JsonLd data={jsonLd} />
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Brødkrumme">
          <ol>
            <li>
              <Link href="/">Forside</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/reparation">Reparation</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{brand.name}</li>
          </ol>
        </nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Reparation · {brand.name}</span>
          <h1>Vælg din {brand.name}-model.</h1>
          <p>
            Find din model og se priser på de reparationer, vi tilbyder. Du
            vælger reparation og aflevering i næste trin.
          </p>
        </header>
        <section className={styles.section} aria-label="Vælg model">
          <ModelGrid models={modelCards} brandName={brand.name} />
        </section>
        <section className={styles.help}>
          <div>
            <h2>Brug for hjælp til at vælge?</h2>
            <p>
              Vi hjælper med at finde din model og den rette reparation. Garanti
              og forventet tidsforbrug står ved den enkelte service, når det er
              oplyst.
            </p>
            <Link href="/kontakt">Kontakt os</Link>
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
      </div>
    </div>
  );
}
