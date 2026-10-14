import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllBrandSlugs,
  getBrandBySlug,
  getBrandHubData,
} from "@/lib/supabase/repairs";
import { JsonLd } from "@/components/seo/json-ld";
import {
  Breadcrumb,
  CityLinks,
  CommonRepairs,
  FaqSection,
  SITE,
  breadcrumbJsonLd,
  faqJsonLd,
  formatKr,
  hubStyles as hub,
  serviceJsonLd,
} from "@/components/repair/brand-hub";
import { ModelGrid, type ModelCardData } from "./model-grid";
import { getHubContent, hasLifetimeWarranty } from "@/lib/repairs/brand-hub-content";
import { fitTitle } from "@/lib/repairs/hub-meta";
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

  const { fromPrice } = await getBrandHubData(brand.id);
  const content = getHubContent(brand.slug, brand.name, brand.device_type);
  const price = fromPrice ? ` fra ${formatKr(fromPrice)}` : "";
  const title = fitTitle([
    `${content.label}-reparation – skærm og batteri${price} | PhoneSpot`,
    `${content.label}-reparation${price} | PhoneSpot`,
    `${content.label}-reparation | PhoneSpot`,
  ]);
  const warranty = hasLifetimeWarranty(brand.device_type)
    ? "Livstidsgaranti på arbejde og dele."
    : "Fast pris før vi går i gang.";
  const description = `${content.label}-reparation i Vejle og Slagelse${price ? `:${price}` : ""}. ${warranty} Kom forbi uden tid eller send ind med gratis fragtlabel.`;

  return {
    title,
    description: description.length <= 160 ? description : `${content.label}-reparation i Vejle og Slagelse${price ? `:${price}` : ""}. ${warranty}`,
    alternates: { canonical: `${SITE}/reparation/${brand.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/reparation/${brand.slug}`,
      type: "website",
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { brand: brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const { models, categories, fromPrice } = await getBrandHubData(brand.id);
  const content = getHubContent(brand.slug, brand.name, brand.device_type);
  const url = `${SITE}/reparation/${brand.slug}`;

  const modelCards: ModelCardData[] = models.map((model) => ({
    slug: model.slug,
    name: model.name,
    series: model.series,
    cheapestPrice: model.cheapest,
    brandSlug: brand.slug,
    imageUrl: model.image_url,
    deviceType: brand.device_type,
  }));

  const trail = [
    { name: "Reparation", href: "/reparation" },
    { name: brand.name, href: `/reparation/${brand.slug}` },
  ];

  return (
    <div className={styles.shell}>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <JsonLd
        data={serviceJsonLd({
          name: `${content.label}-reparation`,
          url,
          description: content.answer(fromPrice ? formatKr(fromPrice) : null),
          categories,
        })}
      />
      <JsonLd data={faqJsonLd(content.faqs)} />
      <div className={styles.container}>
        <Breadcrumb trail={[{ name: "Reparation", href: "/reparation" }, { name: brand.name }]} />
        <header className={styles.header}>
          <span className={styles.eyebrow}>Reparation · {brand.name}</span>
          <h1>{content.label}-reparation i Vejle og Slagelse.</h1>
          <p className={hub.answer}>{content.answer(fromPrice ? formatKr(fromPrice) : null)}</p>
          <div className={hub.body}>
            {content.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </header>
        <CommonRepairs categories={categories} notes={content.categoryNotes} label={content.label} />
        <section id="find-din-model" className={styles.section} aria-labelledby="find-model">
          <h2 id="find-model">Find din model</h2>
          <ModelGrid models={modelCards} brandName={brand.name} />
        </section>
        <CityLinks label={content.label} note={content.cityNote} />
        <FaqSection title={`Spørgsmål om ${content.label}-reparation`} faqs={content.faqs} />
        <section className={styles.help}>
          <div>
            <h2>Brug for hjælp til at vælge?</h2>
            <p>
              Vi hjælper med at finde din model og den rette reparation.{" "}
              {hasLifetimeWarranty(brand.device_type)
                ? "Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele."
                : "Vilkårene aftales ved den enkelte reparation."}
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
