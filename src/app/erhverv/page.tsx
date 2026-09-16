import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RepairInquiryForm } from "@/components/business/repair-inquiry-form";
import { JsonLd } from "@/components/seo/json-ld";
import { COMPANY_EMAIL, STORES } from "@/lib/store-config";
import styles from "@/components/business/business-repair.module.css";

const PAGE_URL = "https://phonespot.dk/erhverv";
const PHONE = STORES.slagelse.phone;
const PHONE_HREF = `tel:${PHONE.replace(/\s/g, "")}`;

export const metadata: Metadata = {
  title: "Erhvervsreparation på jeres adresse | PhoneSpot",
  description: "Flere enheder til reparation? PhoneSpot kører ud til virksomheder på hele Sjælland og i hele Jylland. Send en forespørgsel, så aftaler vi omfang, tid og pris.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Reparation på jeres adresse | PhoneSpot Erhverv",
    description: "Reparation af virksomhedens telefoner, tablets og bærbare. Vi kører ud på hele Sjælland og i hele Jylland, når flere enheder skal repareres.",
    url: PAGE_URL,
    type: "website",
    images: [{ url: "https://phonespot.dk/images/repair/tekniker-reparerer.jpg", width: 1200, height: 565, alt: "En tekniker reparerer en tablet ved arbejdsbordet" }],
  },
};

const FAQ = [
  {
    question: "Hvor kører I ud?",
    answer: "Vi kører ud til virksomheder på hele Sjælland og i hele Jylland, når flere enheder skal repareres. Skriv jeres postnummer og by i forespørgslen, så aftaler vi besøget med jer.",
  },
  {
    question: "Hvor mange enheder skal vi have?",
    answer: "Udkørsel er til opgaver med flere enheder. Fortæl os cirka, hvor mange I har, og hvad der skal laves. Så afklarer vi sammen, hvordan opgaven kan løses.",
  },
  {
    question: "Hvilke enheder kan vi få repareret?",
    answer: "I kan sende en forespørgsel om telefoner, tablets og bærbare. Oplys gerne mærke, model og fejl på enhederne, så vi kan vurdere den konkrete opgave og aftale, hvad vi kan udføre hos jer.",
  },
  {
    question: "Hvad koster det, og hvor lang tid tager det?",
    answer: "Det afhænger af enhederne, fejlene og opgavens omfang. Pris og tidspunkt aftales med jer på baggrund af henvendelsen, før besøget finder sted.",
  },
  {
    question: "Booker vi et besøg ved at sende formularen?",
    answer: "Nej. Formularen er en uforpligtende forespørgsel. Vi kontakter jer for at afklare opgaven, og besøget er først aftalt, når vi sammen har fastlagt omfang, tidspunkt og pris.",
  },
];

export default function BusinessRepairPage() {
  return (
    <div className={styles.page}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Erhvervsreparation på virksomhedens adresse",
        serviceType: "Reparation af telefoner, tablets og bærbare til virksomheder",
        description: "PhoneSpot kører ud til virksomheder på hele Sjælland og i hele Jylland, når flere enheder skal repareres. Omfang, tidspunkt og pris aftales på baggrund af henvendelsen.",
        url: PAGE_URL,
        provider: { "@type": "Organization", name: "PhoneSpot", url: "https://phonespot.dk", telephone: PHONE, email: COMPANY_EMAIL },
        areaServed: [{ "@type": "Place", name: "Sjælland" }, { "@type": "Place", name: "Jylland" }],
      }} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }} />
      <div className={styles.wrap}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}>
          <ol><li><Link href="/">Forside</Link></li><li aria-hidden="true">/</li><li aria-current="page">Erhverv</li></ol>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>Reparation på<br />jeres adresse.</h1>
            <p>Når flere enheder skal repareres, kører vi ud til jer på hele Sjælland og i hele Jylland.</p>
            <p>Fortæl os om virksomhedens telefoner, tablets eller bærbare. Så aftaler vi omfang, tidspunkt og pris.</p>
            <div className={styles.actions}>
              <a href="#forespoergsel" className={styles.button}>Beskriv jeres opgave</a>
              <a href={PHONE_HREF} className={styles.phoneLink}>Ring {PHONE.replace(/^\+45\s/, "")}</a>
            </div>
          </div>
          <div className={styles.heroPhoto}>
            <Image src="/images/repair/tekniker-reparerer.jpg" alt="En tekniker reparerer en tablet ved arbejdsbordet" fill priority sizes="(max-width: 760px) 100vw, 55vw" />
          </div>
        </header>

        <section className={styles.process} aria-labelledby="business-process-title">
          <div className={styles.processIntro}>
            <h2 id="business-process-title">Flere enheder.<br />Én samlet opgave.</h2>
            <p>Telefonen til kundekontakt. Tabletten på lageret. Den bærbare på kontoret. Når flere af jeres arbejdsredskaber trænger til reparation, kan vi planlægge et besøg hos jer.</p>
            <p>Send gerne en samlet oversigt over modeller og fejl. Vi gennemgår opgaven med jer, før besøget aftales.</p>
          </div>
          <ol className={styles.steps}>
            <li><span aria-hidden="true">1</span><div><h3>Fortæl os om enhederne</h3><p>Beskriv modellerne, problemerne og cirka, hvor mange enheder I har. Oplys også, hvor virksomheden ligger.</p></div></li>
            <li><span aria-hidden="true">2</span><div><h3>Vi aftaler opgaven sammen</h3><p>Vi afklarer, hvad der skal laves hos jer, og aftaler pris og et tidspunkt, der passer til opgaven.</p></div></li>
            <li><span aria-hidden="true">3</span><div><h3>Vi kommer ud til jer</h3><p>Vi besøger virksomheden og reparerer enhederne efter den aftale, vi har lavet sammen.</p></div></li>
          </ol>
        </section>

        <section id="forespoergsel" className={styles.inquiry} aria-labelledby="business-inquiry-title">
          <div className={styles.inquiryIntro}>
            <h2 id="business-inquiry-title">Hvad skal vi<br />hjælpe jer med?</h2>
            <p>Beskriv opgaven, så tager vi den derfra. I behøver ikke kende den præcise fejl for at kontakte os.</p>
            <p>Vi kører ud på hele Sjælland og i hele Jylland ved reparation af flere enheder.</p>
            <div className={styles.contact}>
              <h3>Tag gerne fat i os direkte</h3>
              <a href={PHONE_HREF}>{PHONE}</a>
              <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
            </div>
            <div className={styles.singleRepair}>
              <p>Har du en enkelt enhed?</p>
              <Link href="/reparation">Se reparation i vores butikker</Link>
            </div>
          </div>
          <RepairInquiryForm />
        </section>

        <section className={styles.faq} aria-labelledby="business-faq-title">
          <h2 id="business-faq-title">Inden vi kommer<br />forbi.</h2>
          <div className={styles.questions}>
            {FAQ.map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}<span className={styles.faqToggle} aria-hidden="true" /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <aside className={styles.reseller} aria-label="Reservedele til forhandlere">
          <div><h2>Driver du et værksted?</h2><p>Skal du købe reservedele til dine egne reparationer, kan du søge om en forhandlerkonto.</p></div>
          <Link href="/b2b/registrer">Søg om forhandlerkonto</Link>
        </aside>
      </div>
    </div>
  );
}
