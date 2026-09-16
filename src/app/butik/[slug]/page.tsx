import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { STORES, openingHoursJsonLd, type StoreLocationConfig } from "@/lib/store-config";
import styles from "@/components/ui/information.module.css";

export function generateStaticParams() {
  return Object.values(STORES).map((store) => ({
    slug: store.slug,
  }));
}

/* ------------------------------------------------------------------ */
/*  Dynamic metadata                                                   */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = STORES[slug];
  if (!store) return {};

  if (slug === "vejle") {
    return {
      title: "PhoneSpot Vejle — Brugt elektronik og iPhone-reparation | Løversysselvej",
      description:
        "Besøg PhoneSpot Vejle på Løversysselvej 3B. iPhone-reparation og refurbished enheder med 36 måneders garanti, sælg din enhed. Åbent man-fre 10-17:30, weekend 10-15.",
      alternates: {
        canonical: "https://phonespot.dk/butik/vejle",
      },
      openGraph: {
        title: "PhoneSpot Vejle — Brugt elektronik og iPhone-reparation",
        description:
          "Professionel iPhone-reparation og brugt elektronik i Vejle. 36 mdr. garanti, Klarna-delbetaling. Løversysselvej 3B.",
        url: "https://phonespot.dk/butik/vejle",
        type: "website",
      },
    };
  }

  const title = `${store.name} — besøg os${store.mall ? ` i ${store.mall}` : ""}`;
  const description = `Besøg ${store.name}${store.mall ? ` i ${store.mall}` : ""}, ${store.city}. Reparation, personlig rådgivning og refurbished elektronik med 36 mdr. garanti.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://phonespot.dk/butik/${store.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/butik/${store.slug}`,
      type: "website",
    },
  };
}

function getSlagelseFAQs(): Array<{ question: string; answer: string }> {
  return [
    {
      question: "Hvad er åbningstiderne i Slagelse?",
      answer:
        `Vi har åbent mandag til fredag ${STORES.slagelse.hours.weekdays}, lørdag ${STORES.slagelse.hours.saturday} og søndag ${STORES.slagelse.hours.sunday}. Åbningstider kan variere på helligdage.`,
    },
    {
      question: "Er der parkering ved butikken?",
      answer:
        "Ja, VestsjællandsCentret har gratis parkering til alle kunder. Der er adgang fra Løvegade og Parkvej med plads til over 1.000 biler.",
    },
    {
      question: "Kan jeg komme ind med min telefon til reparation uden tidsbestilling?",
      answer:
        "Ja, du kan komme forbi uden tidsbestilling. Tiden afhænger af model, fejl og om reservedelen er på lager. Du kan også booke online og vælge Slagelse.",
    },
    {
      question: "Hvad kan jeg forvente at få for min brugte iPhone?",
      answer:
        "Prisen afhænger af model, stand og lagerkapacitet. Send oplysninger om din enhed online, eller kom forbi butikken for en gratis vurdering. Vi gennemgår din forespørgsel og vender tilbage med et tilbud.",
    },
    {
      question: "Hvad sker der med mine data, når jeg sælger min telefon?",
      answer:
        "Inden vi overtager enheden, sørger vi for at guide dig igennem en fuld fabriksnulstilling, så alle dine personlige data er slettet. Du kan også gøre det selv hjemmefra via iCloud eller din Google-konto.",
    },
  ];
}

function getVejleFAQs(): Array<{ question: string; answer: string }> {
  return [
    {
      question: "Hvad koster iPhone-reparation i Vejle?",
      answer: "Prisen afhænger af model og type reparation. Se aktuelle priser og vilkår på vores reparationsside. Priserne er inklusive moms.",
    },
    {
      question: "Hvor hurtigt kan I skifte skærm i Vejle?",
      answer: "Tiden afhænger af model, fejl og om reservedelen er på lager. Se den forventede tid ved reparationen, eller kontakt butikken inden dit besøg.",
    },
    {
      question: "Er der parkering ved butikken i Vejle?",
      answer: "Ja, der er gratis parkering lige ved butikken på Løversysselvej 3B. Du kan parkere direkte foran døren.",
    },
    {
      question: "Kan jeg sælge min brugte telefon hos jer i Vejle?",
      answer: "Ja, vi vurderer brugte telefoner, tablets og laptops. Kom forbi butikken, eller send oplysninger om model og stand online. Vi gennemgår enheden og vender tilbage med et tilbud.",
    },
    {
      question: "Hvad er jeres garanti på reparationer?",
      answer: "Se garantioplysningerne ved den konkrete reparation og vores reparationsbetingelser. På refurbished enheder giver vi 36 måneders garanti. Tilbehør har 2 års reklamationsret.",
    },
    {
      question: "Hvilke mærker reparerer I i Vejle?",
      answer: "Vi reparerer alle større mærker: Apple (iPhone, iPad, MacBook), Samsung, Huawei, OnePlus, Google Pixel og flere. Se alle mærker og priser på vores reparationsside.",
    },
  ];
}

function getGenericFAQs(store: StoreLocationConfig): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Hvor ligger ${store.name}?`,
      answer: `${store.name} ligger på ${store.street}, ${store.zip} ${store.city}${store.mall ? ` i ${store.mall}` : ""}. Du kan finde os på Google Maps via linket på denne side.`,
    },
    {
      question: `Hvad er åbningstiderne for ${store.name}?`,
      answer: `Vi har åbent mandag til fredag ${store.hours.weekdays}, lørdag ${store.hours.saturday} og søndag ${store.hours.sunday}${store.mall ? `. Vi følger ${store.mall}s åbningstider, som kan variere på helligdage` : ""}.`,
    },
    {
      question: `Kan jeg komme forbi uden tidsbestilling?`,
      answer: `Ja, du er altid velkommen til at kigge forbi ${store.name} uden tidsbestilling. For reparationer anbefaler vi dog at booke online på forhånd, så vi kan have de rette reservedele klar.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  JSON-LD builder                                                    */
/* ------------------------------------------------------------------ */

function buildJsonLd(store: StoreLocationConfig): Record<string, unknown> {
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
    openingHoursSpecification: openingHoursJsonLd(store.hours),
    priceRange: "$$",
  };
}

function StorePage({ store }: { store: StoreLocationConfig }) {
  const faqs = store.slug === "vejle" ? getVejleFAQs() : store.slug === "slagelse" ? getSlagelseFAQs() : getGenericFAQs(store);
  return (
    <div className={styles.shell}>
      <JsonLd data={buildJsonLd(store)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) }} />
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}><Link href="/">Forside</Link> / <Link href="/butik">Butikker</Link> / {store.city}</nav>
        <header className={styles.header}><span className={styles.eyebrow}>Din lokale PhoneSpot</span><h1>{store.name}</h1><p className={styles.intro}>Køb en enhed, få den repareret eller sælg din brugte elektronik. Vi hjælper dig {store.mall ? `i ${store.mall}` : `på ${store.street}`}.</p></header>
        <section className={styles.section} aria-label="Planlæg dit besøg">
          <div className={styles.grid}>
            <div className={styles.panel}>
              <h2>Find os i {store.city}</h2>
              <address className={styles.address}>{store.company}<br />{store.street}<br />{store.zip} {store.city}</address>
              <a className={styles.textLink} href={`tel:${store.phone.replace(/\s/g, "")}`}>{store.phone}</a><br />
              <a className={styles.textLink} href={`mailto:${store.email}`}>{store.email}</a>
              <div className={styles.actions}><a className={styles.button} href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer">Find vej</a><Link className={styles.secondary} href={`/reparation/booking?store=${store.slug}`}>Book reparation</Link></div>
            </div>
            <div className={styles.panel}><h2>Åbningstider</h2><dl className={styles.hours}>
              <div><dt>Mandag–fredag</dt><dd>{store.hours.weekdays}</dd></div><div><dt>Lørdag</dt><dd>{store.hours.saturday}</dd></div><div><dt>Søndag</dt><dd>{store.hours.sunday}</dd></div>
            </dl>{store.mall && <p>Åbningstiderne kan variere på helligdage i {store.mall}.</p>}<p>Du er velkommen uden tidsbestilling. Kontakt os gerne inden besøget, hvis du søger en bestemt enhed eller reservedel.</p></div>
          </div>
        </section>
        <section className={styles.services} aria-label="Hjælp i butikken">
          <div><h2>Køb refurbished</h2><p>Se og prøv vores enheder. Vi hjælper med model, kosmetisk stand og batteri.</p><Link href="/iphones" className={styles.textLink}>Se iPhones →</Link></div>
          <div><h2>Reparation</h2><p>Find skærmskift, batteriskift og andre reparationer. Tid og garanti fremgår ved den valgte service.</p><Link href="/reparation" className={styles.textLink}>Se modeller og priser →</Link></div>
          <div><h2>Sælg din enhed</h2><p>Vi vurderer din enhed ud fra model og stand. Send en forespørgsel eller kom forbi butikken.</p><Link href="/saelg-din-enhed" className={styles.textLink}>Få en vurdering →</Link></div>
        </section>
        <section className={styles.section}><div className={styles.grid}>
          <div><h2>{store.mall ? `Besøg os i ${store.mall}` : `Find vej til ${store.name}`}</h2><p className={styles.intro}>{store.slug === "vejle" ? "Butikken ligger tæt på Bredballe og er nem at komme til fra Vejle-området. Der er gratis parkering ved butikken på Løversysselvej 3B." : store.slug === "slagelse" ? "Du finder os i VestsjællandsCentret. Kombinér dit besøg med en tur i centret. Der er gratis parkering med adgang fra Løvegade og Parkvej." : `Du finder os på ${store.street}, ${store.zip} ${store.city}.`}</p><div className={styles.actions}><a href={store.googleMapsUrl} className={styles.textLink} target="_blank" rel="noopener noreferrer">Åbn rutevejledning →</a></div></div>
          <iframe src={store.googleMapsEmbed} title={`Google Maps – ${store.name}`} className={styles.map} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
        </div></section>
        {store.slug === "slagelse" && <figure className={styles.photo}><Image src="/images/store/butik-indvendig.jpg" alt="Enheder og tilbehør i PhoneSpots butik" width={1248} height={650} sizes="(max-width: 700px) 100vw, 1248px" /><figcaption>Et kig indenfor hos PhoneSpot.</figcaption></figure>}
        <div className={styles.reading}>
          <section><h2>iPhone-reparation i {store.city}</h2><p>Vi hjælper med skærme, batterier og opladningsporte på din iPhone. Du kan komme forbi i butikken eller booke en tid. Tiden afhænger af model, fejl og reservedelens tilgængelighed.</p><Link href="/reparation" className={styles.textLink}>Se aktuelle reparationer og vilkår →</Link></section>
          <section><h2>Køb brugte iPhones i {store.city}</h2><p>Vores refurbished enheder er testet og renset, og enhederne har 36 måneders garanti. Se og prøv dem i butikken, og læs om stand og den enkelte enheds batteri, inden du vælger.</p><div className={styles.actions}><Link href="/kvalitet" className={styles.textLink}>Sådan vurderer vi kvalitet →</Link><Link href="/garanti" className={styles.textLink}>Læs garantivilkårene →</Link></div></section>
          <section><h2>Sælg din brugte telefon i {store.city}</h2><p>Har du en iPhone, Samsung eller iPad liggende? Kig forbi {store.street} for en gratis og uforpligtende vurdering. Du kan også sende oplysninger om din enhed online. Vi gennemgår din forespørgsel og vender tilbage med et tilbud.</p><Link href="/saelg-din-enhed" className={styles.textLink}>Fortæl os om din enhed →</Link></section>
          <section><h2>Afhentning i butikken</h2><p>Vælg afhentning, når du bestiller online, og afvent besked om, at din ordre er klar. Kontakt os, hvis du har spørgsmål til afhentning i {store.city}.</p></section>
          <section><h2>Spørgsmål om butikken</h2><FaqAccordion items={faqs} /></section>
        </div>
      </div>
    </div>
  );
}

export default async function StoreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 const store = STORES[slug];
 if (!store) notFound();
 return <StorePage store={store} />;
}
