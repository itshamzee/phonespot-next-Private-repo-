import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
import {
  COFFEE_PRICES,
  CONTROLLER_PRICES,
  DYSON_PRICES,
  FAQS,
  HERO_ANSWER,
  OTHER_VACUUM_PRICES,
  ROBOT_PRICES,
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

type SectionImage = { src: string; alt: string; width: number; height: number };

/** Valgfrit billede pr. sektion. Uden `image` vises ingenting. */
function ApplianceSection({
  id,
  title,
  intro,
  image,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  image?: SectionImage;
  children: ReactNode;
}) {
  return (
    <section id={id} className={hub.block} aria-labelledby={`${id}-titel`}>
      <div>
        <h2 id={`${id}-titel`}>{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
      <div>
        {image && (
          <figure className={s.figure}>
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(max-width: 800px) 100vw, 640px"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </figure>
        )}
        {children}
      </div>
    </section>
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
          <ul className={s.index}>
            <li><a href="#stovsugere">Ledningsfri støvsugere</a></li>
            <li><a href="#robotstovsugere">Robotstøvsugere</a></li>
            <li><a href="#kaffemaskiner">Kaffemaskiner</a></li>
            <li><a href="#controllere">Controllere</a></li>
          </ul>
          <div className={s.actions}>
            <Link href="/reparation/booking" className={s.primary}>Book tid</Link>
            <a href={TEL} className={s.secondary}>Ring {PHONE}</a>
          </div>
        </header>

        <ApplianceSection
          id="stovsugere"
          title="Ledningsfri støvsugere"
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
          intro="Batteri og hjulmodul til Roborock og iRobot Roomba."
        >
          <PriceTable group={ROBOT_PRICES} label="Robotstøvsugere" />
        </ApplianceSection>

        <ApplianceSection
          id="kaffemaskiner"
          title="Kaffemaskiner"
          intro="Nespresso Vertuo og Original samt De'Longhi ECAM."
        >
          <PriceTable group={COFFEE_PRICES} label="Kaffemaskiner" />
          <p className={s.note}>
            Vi siger det ærligt, hvis en ny maskine kan betale sig: koster reparationen mere end
            omkring 40 procent af nyprisen, anbefaler vi at købe en ny. Efter hver reparation måler
            vi isolation og lækstrøm. Maskiner, der stadig er under producentens garanti, skal du
            vende tilbage til De&apos;Longhi eller Nespresso med.
          </p>
        </ApplianceSection>

        <ApplianceSection
          id="controllere"
          title="Controllere"
          intro="PlayStation 5 og Xbox Series, hvor drift og porte er de typiske fejl."
        >
          <PriceTable group={CONTROLLER_PRICES} label="Controllere" />
          <p className={s.note}>
            Nintendo reparerer Joy-Con-drift gratis i EU. Kontakt Nintendo først.
          </p>
        </ApplianceSection>

        <ApplianceSection id="sadan-foregaar-det" title="Sådan foregår det">
          <ol className={s.steps}>
            <li>
              <strong>Kom forbi, eller book tid</strong>
              <p>Du behøver ikke bestille tid i Vejle eller Slagelse. Vil du være sikker, kan du booke online.</p>
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
              Vi bruger kompatible batterier med dokumenteret sikkerhedstest efter IEC 62133. Vi
              skriver altid, hvilket batteri du får. Er et batteri oppustet eller varmt, så stop med
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
            <Link href="/reparation/booking" className={s.primary}>Book tid</Link>
            <a href={TEL} className={s.secondary}>Ring {PHONE}</a>
          </div>
        </section>
      </div>
    </div>
  );
}
