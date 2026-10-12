import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import type { UpcomingStoreConfig } from "@/lib/store-config";
import styles from "@/components/ui/information.module.css";

export const ESBJERG_BLOG_PATH = "/blog/phonespot-aabner-i-esbjerg-storcenter";

/** "Esbjerg N" is the postal district; copy reads better with the town name. */
const townOf = (store: UpcomingStoreConfig) => store.city.replace(/ [NSØV]$/, "");

function getUpcomingFAQs(store: UpcomingStoreConfig): Array<{ question: string; answer: string }> {
  const where = `${store.mall ? `${store.mall}, ` : ""}${store.street}, ${store.zip} ${store.city}`;
  return [
    {
      question: `Hvornår åbner PhoneSpot i ${townOf(store)}?`,
      answer: `Vi åbner i ${store.opens}. Den præcise dato skriver vi her på siden, så snart den er på plads.`,
    },
    {
      question: "Hvor ligger butikken?",
      answer: `Du finder os i ${where}. Der er gratis parkering ved centret.`,
    },
    {
      question: "Hvad kan jeg få hjælp til i butikken?",
      answer: "Reparation af iPhone, Samsung, iPad og andre mærker, køb af refurbished telefoner, tablets og bærbare, vurdering af din brugte enhed samt covers, opladere og beskyttelsesglas.",
    },
    {
      question: "Kan jeg få repareret min telefon, før butikken åbner?",
      answer: "Ja. Du kan sende din enhed ind til os, og vi sender den retur, når den er repareret. Du er også velkommen i vores butikker i Vejle og Slagelse.",
    },
    {
      question: "Hvilken garanti får jeg?",
      answer: "Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele: opstår den samme fejl igen på den del, vi har skiftet, reparerer vi den uden beregning. Nye skader som fald og væske er ikke dækket. Refurbished enheder har 36 måneders garanti, og tilbehør har 2 års reklamationsret.",
    },
    {
      question: "Skal jeg bestille tid?",
      answer: "Nej. Når vi har åbnet, kan du komme forbi uden tidsbestilling. Tiden for en reparation afhænger af model, fejl og om reservedelen er på lager.",
    },
  ];
}

function buildJsonLd(store: UpcomingStoreConfig): Record<string, unknown> {
  // No openingHoursSpecification until the store is open, so search engines
  // do not present it as open today.
  return {
    "@context": "https://schema.org",
    "@type": "ElectronicsRepair",
    name: store.name,
    image: "https://phonespot.dk/brand/logo.png",
    url: `https://phonespot.dk/butik/${store.slug}`,
    telephone: store.phone,
    email: store.email,
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
    priceRange: "$$",
  };
}

export function UpcomingStorePage({ store }: { store: UpcomingStoreConfig }) {
  const faqs = getUpcomingFAQs(store);
  const town = townOf(store);
  return (
    <div className={styles.shell}>
      <JsonLd data={buildJsonLd(store)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) }} />
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}><Link href="/">Forside</Link> / <Link href="/butik">Butikker</Link> / {town}</nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Åbner {store.opens}</span>
          <h1>{store.name}</h1>
          <p className={styles.intro}>Vi åbner i {store.mall} i {store.opens}. Her kan du få repareret din telefon, købe refurbished elektronik med garanti og sælge din brugte enhed – samme sted.</p>
        </header>
        <section className={styles.section} aria-label={`Butikken i ${town}`}>
          <div className={styles.grid}>
            <div className={styles.panel}>
              <h2>Her finder du os</h2>
              <address className={styles.address}>{store.company}<br />{store.mall}<br />{store.street}<br />{store.zip} {store.city}</address>
              <a className={styles.textLink} href={`tel:${store.phone.replace(/\s/g, "")}`}>{store.phone}</a><br />
              <a className={styles.textLink} href={`mailto:${store.email}`}>{store.email}</a>
              <div className={styles.actions}><a className={styles.button} href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer">Find vej</a><Link className={styles.secondary} href={ESBJERG_BLOG_PATH}>Læs nyheden</Link></div>
            </div>
            <div className={styles.panel}><h2>Forventede åbningstider</h2><dl className={styles.hours}>
              <div><dt>Mandag–fredag</dt><dd>{store.hours.weekdays}</dd></div><div><dt>Lørdag</dt><dd>{store.hours.saturday}</dd></div><div><dt>Søndag</dt><dd>{store.hours.sunday}</dd></div>
            </dl><p>Vi følger {store.mall}s åbningstider. Åbningsdato og endelige tider kommer her, så snart de er på plads.</p></div>
          </div>
        </section>
        <section className={styles.notice} aria-label="Indtil vi åbner">
          <h2>Brug for hjælp før vi åbner?</h2>
          <p>Du kan sende din telefon eller tablet ind til reparation, og vi sender den retur, når den er klar. Refurbished enheder og tilbehør kan du købe online med levering til hele landet.</p>
          <div className={styles.actions}><Link href="/reparation/indsend" className={styles.textLink}>Send din enhed ind →</Link><Link href="/butik/vejle" className={styles.textLink}>Butikken i Vejle →</Link></div>
        </section>
        <section className={styles.services} aria-label="Det kan vi hjælpe med">
          <div><h2>Køb refurbished</h2><p>Se og prøv enhederne i butikken. Vi hjælper med model, kosmetisk stand og batteri.</p><Link href="/iphones" className={styles.textLink}>Se iPhones →</Link></div>
          <div><h2>Reparation</h2><p>Skærmskift, batteriskift og andre reparationer. Pris, tid og garanti fremgår ved den valgte service.</p><Link href="/reparation" className={styles.textLink}>Se modeller og priser →</Link></div>
          <div><h2>Sælg din enhed</h2><p>Vi vurderer din enhed ud fra model og stand. Send en forespørgsel allerede nu.</p><Link href="/saelg-din-enhed" className={styles.textLink}>Få en vurdering →</Link></div>
        </section>
        <section className={styles.section}><div className={styles.grid}>
          <div><h2>Find vej til {store.mall}</h2><p className={styles.intro}>{store.mall} ligger i den nordlige del af {town} ved Gl. Vardevej. Der er gratis parkering ved centret, så du kan kombinere dit besøg med en tur i centret.</p><div className={styles.actions}><a href={store.googleMapsUrl} className={styles.textLink} target="_blank" rel="noopener noreferrer">Åbn rutevejledning →</a></div></div>
          <iframe src={store.googleMapsEmbed} title={`Google Maps – ${store.mall}`} className={styles.map} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
        </div></section>
        <div className={styles.reading}>
          <section><h2>Telefonreparation i {town}</h2><p>Vi reparerer skærme, batterier, opladningsporte og kameraer på iPhone, Samsung, iPad og andre mærker. Du vælger selv skærmkvalitet, og prisen er fast og oplyst, før vi går i gang. Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele.</p><Link href="/reparation" className={styles.textLink}>Se priser på reparation →</Link></section>
          <section><h2>Refurbished iPhones i {town}</h2><p>Vores refurbished enheder er testet og renset, og de har 36 måneders garanti. I butikken kan du se og prøve dem, før du vælger – og læse om stand og batteri på den enkelte enhed.</p><div className={styles.actions}><Link href="/kvalitet" className={styles.textLink}>Sådan vurderer vi kvalitet →</Link><Link href="/garanti" className={styles.textLink}>Læs garantivilkårene →</Link></div></section>
          <section><h2>Sælg din brugte telefon i {town}</h2><p>Har du en iPhone, Samsung eller iPad liggende? Send oplysninger om din enhed online, så vender vi tilbage med et tilbud. Når butikken åbner, kan du også få en uforpligtende vurdering ved disken.</p><Link href="/saelg-din-enhed" className={styles.textLink}>Fortæl os om din enhed →</Link></section>
          <section><h2>Spørgsmål om butikken</h2><FaqAccordion items={faqs} /></section>
        </div>
      </div>
    </div>
  );
}
