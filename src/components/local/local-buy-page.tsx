import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { ProductGridCard } from "@/components/product/product-grid-card";
import type { TemplateWithStock } from "@/components/product/filtered-grid";
import { STORES, openingHoursJsonLd } from "@/lib/store-config";
import {
  getLocalBuyPage,
  inStoreCount,
  localBuyFaqs,
  localBuyPagesForStore,
  type LocalBuyPage as LocalBuyPageData,
} from "@/lib/local-buy-pages";
import styles from "@/components/ui/information.module.css";

const BASE_URL = "https://phonespot.dk";
const GRID = "grid auto-rows-fr grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 md:grid-cols-3";
const IMAGE_SIZES = "(min-width: 1024px) 380px, (min-width: 768px) 33vw, (min-width: 360px) 50vw, 100vw";
/** Så mange modeller fra lageret vises under dem, der ligger i butikken. */
const MAX_FROM_WAREHOUSE = 6;

export function localBuyMetadata(path: string): Metadata {
  const page = getLocalBuyPage(path);
  const url = `${BASE_URL}/${page.path}`;
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, type: "website", locale: "da_DK", siteName: "PhoneSpot" },
  };
}

function Card({ template }: { template: TemplateWithStock }) {
  return (
    <ProductGridCard
      slug={template.slug}
      image={template.images?.[0]}
      imageSizes={IMAGE_SIZES}
      title={template.display_name}
      minPrice={template.min_price}
      compareAtPrice={template.new_price}
      deviceCount={template.device_count}
      locations={template.locations}
      brand={template.brand}
      category={template.category}
      specifications={template.specifications}
    />
  );
}

export function LocalBuyPage({ page, templates }: { page: LocalBuyPageData; templates: TemplateWithStock[] }) {
  const store = STORES[page.store];
  const url = `${BASE_URL}/${page.path}`;
  const storeUrl = `${BASE_URL}/butik/${store.slug}`;
  const where = store.mall ? `i ${store.mall}` : `på ${store.street}`;
  const faqs = localBuyFaqs(page);

  const inStore = templates.filter((template) => inStoreCount(template, store) > 0);
  const unitsInStore = inStore.reduce((sum, template) => sum + inStoreCount(template, store), 0);
  const fromWarehouse = templates
    .filter((template) => inStoreCount(template, store) === 0 && (template.images?.length ?? 0) > 0 && template.min_price != null)
    .sort((a, b) => (a.min_price ?? 0) - (b.min_price ?? 0))
    .slice(0, MAX_FROM_WAREHOUSE);
  const listed = [...inStore, ...fromWarehouse];
  const siblings = localBuyPagesForStore(store.slug).filter((entry) => entry.path !== page.path);

  const lead =
    unitsInStore > 0
      ? `Lige nu ligger der ${unitsInStore} ${unitsInStore === 1 ? page.singular : page.plural} i butikken ${where}. Resten af udvalget sender vi fra vores lager, typisk på 1-2 hverdage. Alle har 36 måneders garanti og 30 dages returret.`
      : `Udvalget skifter fra dag til dag. Lige nu sender vi alle ${page.plural} fra vores lager, typisk på 1-2 hverdage. Ring, før du kører, hvis du vil se en bestemt model i butikken ${where}. Alle har 36 måneders garanti og 30 dages returret.`;

  return (
    <div className={styles.shell}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ElectronicsStore",
          "@id": `${storeUrl}#store`,
          name: store.name,
          url: storeUrl,
          image: `${BASE_URL}/brand/logo.png`,
          telephone: store.phone,
          address: {
            "@type": "PostalAddress",
            streetAddress: store.street,
            addressLocality: store.city,
            postalCode: store.zip,
            addressCountry: store.countryCode,
          },
          geo: { "@type": "GeoCoordinates", latitude: store.coordinates.lat, longitude: store.coordinates.lng },
          openingHoursSpecification: openingHoursJsonLd(store.hours),
          priceRange: "$$",
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Butikker", item: `${BASE_URL}/butik` },
            { "@type": "ListItem", position: 3, name: store.name, item: storeUrl },
            { "@type": "ListItem", position: 4, name: page.h1, item: url },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
        }}
      />
      {listed.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: page.h1,
            itemListElement: listed.map((template, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: template.display_name,
              url: `${BASE_URL}/refurbished/${template.slug}`,
            })),
          }}
        />
      )}

      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}>
          <Link href="/">Forside</Link> / <Link href="/butik">Butikker</Link> / <Link href={`/butik/${store.slug}`}>{store.city}</Link> / {page.h1}
        </nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>{store.name}</span>
          <h1>{page.h1}</h1>
          <p className={styles.intro}>{lead}</p>
          <div className={styles.actions}>
            <a className={styles.button} href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer">Find vej til butikken</a>
            <a className={styles.secondary} href={`tel:${store.phone.replace(/\s/g, "")}`}>Ring {store.phone}</a>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="i-butikken">
          <h2 id="i-butikken">I butikken i {store.city} lige nu</h2>
          {inStore.length > 0 ? (
            <div className={`${GRID} mt-6`}>{inStore.map((template) => <Card key={template.id} template={template} />)}</div>
          ) : (
            <p className={styles.intro}>
              Der ligger ingen {page.plural} fremme i butikken i dag. Bestil online, eller ring på{" "}
              <a className={styles.textLink} href={`tel:${store.phone.replace(/\s/g, "")}`}>{store.phone}</a>, så fortæller vi, hvornår den næste kommer ind.
            </p>
          )}
        </section>

        {fromWarehouse.length > 0 && (
          <section className={styles.section} aria-labelledby="fra-lageret">
            <h2 id="fra-lageret">Flere {page.plural}, sendt fra lageret</h2>
            <p className={styles.intro}>Leveres typisk på 1-2 hverdage. Du har 30 dages returret, hvis den ikke er den rigtige.</p>
            <div className={`${GRID} mt-6`}>{fromWarehouse.map((template) => <Card key={template.id} template={template} />)}</div>
            <div className={styles.actions}>
              <Link className={styles.textLink} href={page.categoryHref}>Se alle {templates.length} modeller →</Link>
            </div>
          </section>
        )}

        <section className={styles.section} aria-label="Planlæg dit besøg">
          <div className={styles.grid}>
            <div className={styles.panel}>
              <h2>Find os i {store.city}</h2>
              <address className={styles.address}>{store.name}<br />{store.street}<br />{store.zip} {store.city}</address>
              {store.slug === "vejle" && <p>Gratis parkering lige ved døren.</p>}
              <Link className={styles.textLink} href={`/butik/${store.slug}`}>Om butikken i {store.city} →</Link>
            </div>
            <div className={styles.panel}>
              <h2>Åbningstider</h2>
              <dl className={styles.hours}>
                <div><dt>Mandag–fredag</dt><dd>{store.hours.weekdays}</dd></div>
                <div><dt>Lørdag</dt><dd>{store.hours.saturday}</dd></div>
                <div><dt>Søndag</dt><dd>{store.hours.sunday}</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className={styles.services} aria-label={`Mere i ${store.city}`}>
          <div>
            <h2>Reparation i {store.city}</h2>
            <p>Vi skifter skærm og batteri i butikken, de fleste mens du venter.</p>
            <Link href={`/reparation-${store.slug}`} className={styles.textLink}>Reparation i {store.city}: priser →</Link>
          </div>
          <div>
            <h2>Sælg din gamle</h2>
            <p>Tag din brugte enhed med. Vi vurderer den ud fra model og stand.</p>
            <Link href={`/saelg-din-enhed/${store.slug}`} className={styles.textLink}>Sælg din enhed i {store.city} →</Link>
          </div>
          {siblings.map((entry) => (
            <div key={entry.path}>
              <h2>{entry.h1}</h2>
              <p>Se hvilke {entry.plural} der står i butikken, og hvad vi kan sende.</p>
              <Link href={`/${entry.path}`} className={styles.textLink}>{entry.h1} →</Link>
            </div>
          ))}
        </section>

        <div className={styles.reading}>
          <section>
            <h2>Spørgsmål om at købe {page.kind === "iphone" ? "iPhone" : "bærbar"} i {store.city}</h2>
            <FaqAccordion items={faqs} />
          </section>
        </div>
      </div>
    </div>
  );
}
