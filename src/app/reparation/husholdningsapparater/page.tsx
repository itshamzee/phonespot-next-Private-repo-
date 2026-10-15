import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  Breadcrumb,
  SITE,
  breadcrumbJsonLd,
  faqJsonLd,
  FaqSection,
  hubStyles as hub,
} from "@/components/repair/brand-hub";
import { fitTitle } from "@/lib/repairs/hub-meta";
import { STORES } from "@/lib/store-config";
import styles from "@/components/repair/repair.module.css";
import s from "./appliances.module.css";
import { QuoteForm, QuoteLink } from "./quote-form";
import {
  BRANDS,
  CATEGORIES,
  COFFEE_PRICES,
  CONTROLLER_PRICES,
  DYSON_PRICES,
  FAQS,
  HERO_ANSWER,
  OTHER_VACUUM_PRICES,
  ROBOT_PRICES,
  type ApplianceCategory,
  type ApplianceCategoryId,
  type PriceGroup,
} from "./data";

const PAGE_URL = `${SITE}/reparation/husholdningsapparater`;
const PHONE = STORES.vejle.phone;
const TEL = `tel:${PHONE.replace(/\s/g, "")}`;
const kr = (n: number) => `${n.toLocaleString("da-DK")} kr.`;

const TITLE = fitTitle([
  "Reparation af Dyson, robotstøvsugere og kaffemaskiner | PhoneSpot",
  "Reparation af Dyson, robotstøvsuger og kaffemaskine | PhoneSpot",
  "Reparation af Dyson og kaffemaskiner | PhoneSpot",
  "Reparation af husholdningsapparater | PhoneSpot",
]);
const DESCRIPTION =
  "Reparation af Dyson, robotstøvsugere, kaffemaskiner og controllere i Vejle og Slagelse. Fast pris før start og 12 måneders garanti på dele og arbejde.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website" },
};

/** Sektion med overskrift til venstre og indhold til højre. `quote` giver en lille "Få en fast pris"-knap. */
function ApplianceSection({
  id,
  title,
  intro,
  quote,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  quote?: ApplianceCategoryId;
  children: ReactNode;
}) {
  return (
    <section id={id} className={hub.block} aria-labelledby={`${id}-titel`}>
      <div>
        <h2 id={`${id}-titel`}>{title}</h2>
        {intro && <p>{intro}</p>}
        {quote && (
          <QuoteLink category={quote} className={s.smallButton}>
            Få en fast pris
          </QuoteLink>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}

function CategoryTile({ cat, large }: { cat: ApplianceCategory; large?: boolean }) {
  return (
    <div className={`${s.tile} ${large ? s.tileLarge : ""}`}>
      {cat.image ? (
        <Image
          src={cat.image}
          alt={cat.alt}
          width={600}
          height={600}
          sizes={large ? "(max-width: 800px) 90vw, 520px" : "(max-width: 800px) 132px, 180px"}
          className={s.tileImage}
          priority={cat.id === "stovsugere"}
        />
      ) : (
        <span className={s.tileText} aria-hidden="true">
          Nespresso
          <br />
          De&apos;Longhi
        </span>
      )}
    </div>
  );
}

function CategoryCard({ cat, large }: { cat: ApplianceCategory; large?: boolean }) {
  return (
    <article className={large ? s.feature : s.catRow} aria-labelledby={`kat-${cat.id}`}>
      <CategoryTile cat={cat} large={large} />
      <div className={s.catCopy}>
        <h3 id={`kat-${cat.id}`}>{cat.name}</h3>
        <p>{cat.faults}</p>
        <p className={s.from}>
          Fra <strong>{kr(cat.from)}</strong>
        </p>
        <div className={s.catLinks}>
          <QuoteLink category={cat.id} className={s.smallButton}>
            Få en fast pris
          </QuoteLink>
          <a href={`#${cat.id}`} className={s.secondary}>
            Se priser
          </a>
        </div>
      </div>
    </article>
  );
}

function PriceTable({ group, label }: { group: PriceGroup; label: string }) {
  return (
    <table className={s.table}>
      <caption>{group.caption ?? label}</caption>
      <thead>
        <tr>
          <th scope="col">Reparation</th>
          <th scope="col">Pris inkl. moms</th>
        </tr>
      </thead>
      <tbody>
        {group.rows.map((r) => (
          <tr key={r.label}>
            <td>{r.label}</td>
            <td className={r.price === null ? s.fixed : undefined}>
              {r.price === null ? r.fixedText : kr(r.price)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function serviceJsonLd() {
  const priced = (group: PriceGroup) =>
    group.rows
      .filter((r) => r.price !== null)
      .map((r) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: r.label },
        priceCurrency: "DKK",
        price: r.price,
      }));
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Reparation af husholdningsapparater",
    serviceType: "Reparation af støvsugere, robotstøvsugere, kaffemaskiner og controllere",
    url: PAGE_URL,
    description: HERO_ANSWER,
    areaServed: [
      { "@type": "City", name: "Vejle" },
      { "@type": "City", name: "Slagelse" },
    ],
    provider: [STORES.vejle, STORES.slagelse].map((store) => ({
      "@type": ["Organization", "LocalBusiness"],
      name: store.name,
      url: `${SITE}/reparation-${store.slug}`,
      telephone: store.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: store.street,
        addressLocality: store.city,
        postalCode: store.zip,
        addressCountry: store.countryCode,
      },
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Reparation af husholdningsapparater",
      itemListElement: [
        ...priced(DYSON_PRICES),
        ...priced(ROBOT_PRICES),
        ...priced(COFFEE_PRICES),
        ...priced(CONTROLLER_PRICES),
      ],
    },
  };
}

export default function HouseholdAppliancesPage() {
  return (
    <div className={styles.shell}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Reparation", href: "/reparation" },
          { name: "Husholdningsapparater", href: "/reparation/husholdningsapparater" },
        ])}
      />
      <JsonLd data={serviceJsonLd()} />
      <JsonLd data={faqJsonLd(FAQS)} />
      <div className={styles.container}>
        <Breadcrumb
          trail={[
            { name: "Reparation", href: "/reparation" },
            { name: "Husholdningsapparater" },
          ]}
        />
        <header className={styles.header}>
          <span className={styles.eyebrow}>Reparation · Husholdningsapparater</span>
          <h1>Reparation af husholdningsapparater.</h1>
          <p className={hub.answer}>{HERO_ANSWER}</p>
          <div className={s.actions}>
            <QuoteLink className={s.primary}>Få en fast pris</QuoteLink>
            <a href={TEL} className={s.secondary}>Ring {PHONE}</a>
          </div>
        </header>

        <section className={s.cats} aria-labelledby="kategorier-titel">
          <h2 id="kategorier-titel" className={s.sectionTitle}>Det reparerer vi</h2>
          <div className={s.catGrid}>
            <CategoryCard cat={CATEGORIES[0]} large />
            <div className={s.catList}>
              {CATEGORIES.slice(1).map((cat) => (
                <CategoryCard key={cat.id} cat={cat} />
              ))}
            </div>
          </div>
        </section>

        <section className={s.brands} aria-labelledby="maerker-titel">
          <h2 id="maerker-titel">Vi reparerer de store mærker</h2>
          <ul className={s.brandList}>
            {BRANDS.map((brand) => (
              <li key={brand}>{brand}</li>
            ))}
          </ul>
          <p>Står dit mærke ikke her? Skriv eller ring, så hører vi, om vi kan hjælpe.</p>
        </section>

        <ApplianceSection
          id="stovsugere"
          title="Ledningsfri støvsugere"
          quote="stovsugere"
          intro="Reparation af Dyson-støvsugere i V-serien fra V6 til V15. Shark og Samsung Jet tager vi også imod."
        >
          <PriceTable group={DYSON_PRICES} label="Dyson" />
          <p className={s.note}>
            Typiske fejl er et batteri, der ikke holder, en aftrækker der ikke virker, en tømmelem
            der sidder fast og ladeproblemer. Mister støvsugeren sug, tjekker vi filter og kanaler
            først.
          </p>
          <div style={{ marginTop: 36 }}>
            <PriceTable group={OTHER_VACUUM_PRICES} label="Shark og Samsung Jet" />
          </div>
        </ApplianceSection>

        <ApplianceSection
          id="robotstovsugere"
          title="Robotstøvsugere"
          quote="robotstovsugere"
          intro="Batteri og hjulmodul til Roborock og iRobot Roomba."
        >
          <PriceTable group={ROBOT_PRICES} label="Robotstøvsugere" />
        </ApplianceSection>

        <ApplianceSection
          id="kaffemaskiner"
          title="Kaffemaskiner"
          quote="kaffemaskiner"
          intro="Nespresso Vertuo og Original samt De'Longhi ECAM."
        >
          <PriceTable group={COFFEE_PRICES} label="Kaffemaskiner" />
          <p className={s.note}>
            Vi siger det ærligt, hvis en ny maskine kan betale sig: koster reparationen mere end
            omkring 40 procent af nyprisen, anbefaler vi at købe en ny. Er maskinen stadig under
            producentens garanti, så kontakt De&apos;Longhi eller Nespresso først.
          </p>
        </ApplianceSection>

        <ApplianceSection
          id="controllere"
          title="Controllere"
          quote="controllere"
          intro="PlayStation 5 og Xbox Series, hvor drift og porte er de typiske fejl."
        >
          <PriceTable group={CONTROLLER_PRICES} label="Controllere" />
          <p className={s.note}>
            Nintendo reparerer Joy-Con-drift gratis i EU. Kontakt Nintendo først.
          </p>
        </ApplianceSection>

        <section id="tilbud" className={s.quote} aria-labelledby="tilbud-titel">
          <div className={s.quoteIntro}>
            <h2 id="tilbud-titel">Få en fast pris</h2>
            <p>
              Fortæl, hvad der er galt, så vender vi tilbage med en fast pris. Du binder dig ikke til noget, og
              du kan også bare kigge forbi i Vejle eller Slagelse.
            </p>
            <p>
              Foretrækker du at tale med os, så ring på <a href={TEL}>{PHONE}</a>.
            </p>
          </div>
          <QuoteForm />
        </section>

        <ApplianceSection id="sadan-foregaar-det" title="Sådan foregår det">
          <ol className={s.steps}>
            <li>
              <strong>Kom forbi, ring eller skriv</strong>
              <p>Du behøver ikke bestille tid i Vejle eller Slagelse. Vil du være sikker på, at vi har delen, så ring eller skriv først.</p>
            </li>
            <li>
              <strong>Gratis hurtigt tjek ved disken</strong>
              <p>Vi kigger på apparatet og fortæller dig, hvad der er galt.</p>
            </li>
            <li>
              <strong>Fast pris, før vi går i gang</strong>
              <p>Du siger ja til prisen, før vi begynder. Ved kaffemaskiner koster en diagnose 149 kr., som trækkes fra, hvis vi reparerer maskinen.</p>
            </li>
          </ol>
        </ApplianceSection>

        <ApplianceSection id="batterier" title="Batterier og sikkerhed">
          <div className={hub.body}>
            <p>
              Vi bruger kompatible batterier af god kvalitet, og vi skriver altid, hvilket batteri
              du får. Er et batteri oppustet eller varmt, så stop med
              at lade det og kom forbi.
            </p>
            <p>Reparationen har 12 måneders garanti på dele og arbejde.</p>
          </div>
        </ApplianceSection>

        <ApplianceSection id="find-os" title="Find os">
          <div className={s.stores}>
            {[STORES.vejle, STORES.slagelse].map((store) => (
              <div key={store.slug}>
                <h3>{store.city}</h3>
                <p>{store.street}, {store.zip} {store.city}</p>
                <p>Hverdage {store.hours.weekdays}</p>
                <p>Lørdag {store.hours.saturday}, søndag {store.hours.sunday}</p>
                <p>
                  <a href={`tel:${store.phone.replace(/\s/g, "")}`}>{store.phone}</a>
                </p>
                <p>
                  <a href={store.googleMapsUrl}>Vis rute</a>
                </p>
              </div>
            ))}
          </div>
        </ApplianceSection>

        <FaqSection title="Spørgsmål om apparatreparation" faqs={FAQS} />

        <section className={s.cta} aria-labelledby="cta-titel">
          <h2 id="cta-titel">Er apparatet gået i stykker?</h2>
          <p>Kom forbi i Vejle eller Slagelse. Du får en fast pris, før vi går i gang.</p>
          <div className={s.actions}>
            <QuoteLink className={s.primary}>Få en fast pris</QuoteLink>
            <a href={TEL} className={s.secondary}>Ring {PHONE}</a>
          </div>
        </section>
      </div>
    </div>
  );
}
