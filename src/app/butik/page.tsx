import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES, UPCOMING_STORES, openingHoursJsonLd } from "@/lib/store-config";
import styles from "@/components/ui/information.module.css";

export const metadata: Metadata = {
  title: "Besøg PhoneSpot – butikker i Slagelse og Vejle, snart Esbjerg",
  description: "Find adresse og åbningstider for PhoneSpot i Slagelse og Vejle – og snart i Esbjerg Storcenter. Besøg os for reparation, refurbished enheder og vurdering af din brugte elektronik.",
  alternates: { canonical: "https://phonespot.dk/butik" },
  openGraph: { title: "Besøg PhoneSpot – butikker i Slagelse og Vejle", description: "Reparation, refurbished enheder og personlig rådgivning i vores to butikker.", url: "https://phonespot.dk/butik", type: "website" },
};

const storeList = Object.values(STORES);
const upcomingList = Object.values(UPCOMING_STORES);
const organizationJsonLd = {
  "@context": "https://schema.org", "@type": "Organization",
  name: "PhoneSpot", url: "https://phonespot.dk", logo: "https://phonespot.dk/brand/logo.png",
  subOrganization: storeList.map((store) => ({
    "@type": "LocalBusiness", name: store.name, url: `https://phonespot.dk/butik/${store.slug}`,
    telephone: store.phone, email: store.email,
    address: { "@type": "PostalAddress", streetAddress: store.street, addressLocality: store.city, postalCode: store.zip, addressCountry: store.countryCode },
    geo: { "@type": "GeoCoordinates", latitude: store.coordinates.lat, longitude: store.coordinates.lng },
    openingHoursSpecification: openingHoursJsonLd(store.hours),
  })),
};

export default function ButikPage() {
  return (
    <div className={styles.shell}>
      <JsonLd data={organizationJsonLd} />
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}><Link href="/">Forside</Link> / Butikker</nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>PhoneSpot tæt på dig</span>
          <h1>Kom forbi i Vejle eller Slagelse.</h1>
          <p className={styles.intro}>Se enhederne, få hjælp til en reparation eller lad os vurdere din brugte elektronik. Her finder du vej til begge butikker{upcomingList.length > 0 && <> – og til {upcomingList.map((s) => `${s.mall}, hvor vi åbner i ${s.opens}`).join(" og ")}</>}.</p>
        </header>
        <section aria-label="Vores butikker" className={styles.section}>
          <div className={styles.grid}>
            {storeList.map((store) => (
              <article key={store.slug} className={styles.panel}>
                <h2>{store.name}</h2>
                <address className={styles.address}>{store.mall && <>{store.mall}<br /></>}{store.street}<br />{store.zip} {store.city}</address>
                <dl className={styles.hours}>
                  <div><dt>Mandag–fredag</dt><dd>{store.hours.weekdays}</dd></div>
                  <div><dt>Lørdag</dt><dd>{store.hours.saturday}</dd></div>
                  <div><dt>Søndag</dt><dd>{store.hours.sunday}</dd></div>
                </dl>
                <a href={`tel:${store.phone.replace(/\s/g, "")}`} className={styles.textLink}>{store.phone}</a>
                <div className={styles.actions}>
                  <Link href={`/butik/${store.slug}`} className={styles.button}>Se butik i {store.city}</Link>
                  <a href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={styles.secondary}>Find vej</a>
                </div>
                <div className={styles.actions}><Link href={`/reparation/booking?store=${store.slug}`} className={styles.textLink}>Book reparation i {store.city}</Link></div>
              </article>
            ))}
            {upcomingList.map((store) => (
              <article key={store.slug} className={styles.panel}>
                <span className={styles.eyebrow}>Åbner {store.opens}</span>
                <h2>{store.name}</h2>
                <address className={styles.address}>{store.mall}<br />{store.street}<br />{store.zip} {store.city}</address>
                <p>Reparation, refurbished enheder og vurdering af din brugte elektronik – fra {store.opens.split(" ")[0]} også i {store.mall}.</p>
                <div className={styles.actions}>
                  <Link href={`/butik/${store.slug}`} className={styles.button}>Se butik i {store.city.replace(/ N$/, "")}</Link>
                  <a href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={styles.secondary}>Find vej</a>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.services} aria-label="Det kan vi hjælpe med">
          <div><h2>Køb en enhed</h2><p>Se og prøv refurbished enheder. Vi hjælper dig med at finde model og stand.</p><Link href="/iphones" className={styles.textLink}>Se vores iPhones →</Link></div>
          <div><h2>Få den repareret</h2><p>Find din model og se priser og forventet tid. Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele.</p><Link href="/reparation" className={styles.textLink}>Se reparationer →</Link></div>
          <div><h2>Sælg din enhed</h2><p>Fortæl os om din enhed og få en personlig vurdering. Tilbuddet afhænger af model og stand.</p><Link href="/saelg-din-enhed" className={styles.textLink}>Få en vurdering →</Link></div>
        </section>
        <section className={styles.section}>
          <div className={styles.grid}>
            <figure className={styles.photo}>
              <Image src="/images/store/butik-indvendig.jpg" alt="Enheder og tilbehør i PhoneSpots butik" width={1000} height={650} sizes="(max-width: 700px) 100vw, 50vw" />
              <figcaption>Et kig indenfor hos PhoneSpot.</figcaption>
            </figure>
            <div className={styles.panel}>
              <h2>Rådgivning ansigt til ansigt.</h2>
              <p>Er du i tvivl om stand, batteri eller den rigtige model? Kom forbi og tal med os, før du vælger.</p>
              <p>Vi har også covers, opladere og beskyttelsesglas til din enhed.</p>
              <div className={styles.actions}><Link href="/tilbehoer" className={styles.textLink}>Se tilbehør →</Link><Link href="/kontakt" className={styles.textLink}>Kontakt os →</Link></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
