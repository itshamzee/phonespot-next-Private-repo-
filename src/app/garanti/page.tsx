import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import styles from "@/components/ui/information.module.css";

export const metadata: Metadata = {
  title: "36 måneders garanti på refurbished elektronik | PhoneSpot",
  description:
    "PhoneSpot tilbyder 36 måneders fuld garanti på alle refurbished enheder. Læs om, hvad der er dækket, og hvordan du bruger din garanti.",
  keywords:
    "refurbished garanti, garanti refurbished iphone, 36 måneders garanti, refurbished elektronik garanti, phonespot garanti, reklamation refurbished",
  alternates: {
    canonical: "https://phonespot.dk/garanti",
  },
  openGraph: {
    title: "36 måneders garanti på refurbished elektronik | PhoneSpot",
    description:
      "PhoneSpot tilbyder 36 måneders fuld garanti på alle refurbished enheder. Læs om, hvad der er dækket, og hvordan du bruger din garanti.",
    url: "https://phonespot.dk/garanti",
    type: "website",
  },
};

const COVERED_ITEMS = [
  "Skærm og touch",
  "Batteri (min. kapacitet pr. grade)",
  "Kamera og Face ID / Touch ID",
  "Højttalere og mikrofon",
  "Wi-Fi, Bluetooth og GPS",
  "Opladningsport og knapper",
  "Sensorer og vibration",
  "Software og operativsystem",
];

const WARRANTY_FAQ = [
  {
    question: "Hvad dækker garantien?",
    answer:
      "Garantien dækker alle fabrikationsfejl og funktionelle problemer. Hvis din enhed får en fejl, der ikke skyldes forkert brug eller fysisk skade, reparerer eller erstatter vi den gratis inden for garantiperioden på 36 måneder.",
  },
  {
    question: "Dækker garantien kosmetiske skader?",
    answer:
      "Nej, garantien dækker kun funktionelle fejl. Den kosmetiske stand på din enhed svarer til den grade, du har valgt ved køb (A, B eller C). Ridser, buler og andre kosmetiske spor, der var til stede ved levering, er ikke dækket, da de er en del af enhedens graderede stand.",
  },
  {
    question: "Hvad hvis min enhed går i stykker?",
    answer:
      "Kontakt os via vores reklamationsformular eller send en e-mail. Vi svarer inden for 1-2 hverdage med en løsning. Du får en returetiket, sender enheden til os, og vi reparerer eller erstatter den hurtigst muligt.",
  },
  {
    question: "Dækker garantien batteriet?",
    answer:
      "Ja. Batteriets sundhed på købstidspunktet er en individuel måling for din enhed og fremgår altid af produktsiden — det er ikke bundet til grade. Hvis batterikapaciteten i løbet af garantiperioden falder under forringelsesgrænsen for den grade, du har købt, er det dækket af garantien. Grænserne for forringelse i garantiperioden er: Grade A: 85%, Grade B: 80%, Grade C: 75% af den oprindelige kapacitet.",
  },
  {
    question: "Kan jeg få pengene tilbage i stedet?",
    answer:
      "Du har 14 dages fuld fortrydelsesret fra leveringsdagen — ingen spørgsmål stillet. Efter de 14 dage håndterer vi garantisager med reparation eller ombytning til en tilsvarende enhed.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: WARRANTY_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function GarantiPage() {
  return (
    <div className={styles.shell}>
      <JsonLd data={faqJsonLd} />
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}><Link href="/">Forside</Link> / Garanti</nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Hjælp efter købet</span>
          <h1>36 måneders garanti på enheder.</h1>
          <p className={styles.intro}>Her kan du se, hvad garantien dækker, og hvordan du får hjælp ved en fejl. Tilbehør har 2 års reklamationsret.</p>
          <div className={styles.actions}><Link href="/reklamation" className={styles.button}>Indmeld reklamation</Link><Link href="/kontakt" className={styles.secondary}>Kontakt os</Link></div>
        </header>
        <section className={styles.section}>
          <div className={styles.grid}>
            <div><h2>Hvad dækker garantien?</h2><p className={styles.intro}>Garantien dækker fabrikationsfejl og funktionelle problemer i garantiperioden. Hvis fejlen ikke skyldes forkert brug eller fysisk skade, reparerer eller erstatter vi enheden gratis.</p></div>
            <div className={styles.panel}><h3>Funktioner og komponenter</h3><ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#626a65]">{COVERED_ITEMS.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-4! text-sm">Batteriets forringelsesgrænser i garantiperioden står i svaret om batteri nedenfor. Batterisundheden ved køb er en separat, individuel måling.</p></div>
          </div>
        </section>
        <div className={styles.reading}>
          <section><h2>Sådan får du hjælp</h2><ol className="list-decimal space-y-4 pl-5"><li>Indmeld din reklamation online, eller kontakt os med en beskrivelse af fejlen.</li><li>Vi svarer inden for 1–2 hverdage med en løsning og hjælper dig med at sende enheden til os.</li><li>Vi reparerer eller erstatter enheden hurtigst muligt efter garantivilkårene.</li></ol><p>Svartiden er tiden til vores første svar. Det er ikke en fast behandlingstid for selve reparationen.</p><Link href="/reklamation" className={styles.textLink}>Opret din reklamation →</Link></section>
          <section><h2>Dækning og undtagelser</h2><FaqAccordion items={WARRANTY_FAQ} /></section>
          <section><h2>Fortrydelsesret og handelsbetingelser</h2><p>Du har 14 dages fuld fortrydelsesret fra leveringsdagen. Efter de 14 dage håndteres garantisager med reparation eller ombytning til en tilsvarende enhed.</p><div className={styles.actions}><Link href="/handelsbetingelser" className={styles.textLink}>Læs handelsbetingelserne →</Link><Link href="/kontakt" className={styles.textLink}>Få hjælp til returnering →</Link></div></section>
          <section><h2>Vil du også være dækket mod uheld?</h2><p>Elektronikforsikring gennem Storstrøm Forsikring er en særskilt ordning. Læs om dækning og vilkår, eller spørg i butikken i Slagelse.</p><Link href="/forsikring" className={styles.textLink}>Læs om elektronikforsikring →</Link></section>
        </div>
      </div>
    </div>
  );
}
