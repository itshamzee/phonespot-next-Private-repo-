import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import styles from "@/components/ui/information.module.css";
import { PHONESPOT_PROMISES } from "@/lib/promises";

export const metadata: Metadata = {
  title: "36 måneders garanti og 30 dages returret | PhoneSpot",
  description:
    "36 måneders garanti på brugte og refurbished enheder, batteri min. 90 % ved levering, 30 dages returret og garantisag over disken samme dag.",
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
  "Batteri (min. 90 % ved levering, derefter grænse pr. grade)",
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
      "Ja. Alle enheder har mindst 90 % batterikapacitet ved levering. Er den lavere, skifter vi batteriet uden beregning. Den målte værdi står på produktsiden, når vi har den. Hvis batterikapaciteten i løbet af garantiperioden falder under forringelsesgrænsen for den grade, du har købt, er det dækket af garantien. Grænserne for forringelse i garantiperioden er: Grade A: 85%, Grade B: 80%, Grade C: 75% af den oprindelige kapacitet.",
  },
  {
    question: "Kan jeg få pengene tilbage i stedet?",
    answer:
      "Ja, inden for 30 dage fra leveringsdagen kan du returnere en enhed og få pengene tilbage. Efter de 30 dage håndterer vi garantisager med reparation eller ombytning til en tilsvarende enhed.",
  },
  {
    question: "Kan jeg få min garantisag løst i butikken?",
    answer:
      "Ja. Kom ind i Vejle eller Slagelse, så afgør vi garantisagen over disken samme dag. Kan vi ikke løse den samme dag, får du en lånetelefon, mens vi arbejder på den.",
  },
  {
    question: "Får jeg at vide, om dele er skiftet?",
    answer:
      "Ja. Vi oplyser altid, om skærm og batteri er originale eller skiftet. Spørg os, hvis det ikke står på produktsiden, før du køber.",
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
        <section id="loefter" className={styles.section}>
          <h2>Vores 6 løfter</h2>
          <ol className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {PHONESPOT_PROMISES.map((p, i) => (
              <li key={p.title} className="border-t border-[#d9ddd8] pt-4">
                <p className="text-sm font-semibold text-charcoal">
                  <span className="mr-2 tabular-nums text-[#626a65]">{String(i + 1).padStart(2, "0")}</span>
                  {p.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#626a65]">{p.detail}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.section}>
          <div className={styles.grid}>
            <div><h2>Hvad dækker garantien?</h2><p className={styles.intro}>Garantien dækker fabrikationsfejl og funktionelle problemer i garantiperioden. Hvis fejlen ikke skyldes forkert brug eller fysisk skade, reparerer eller erstatter vi enheden gratis.</p></div>
            <div className={styles.panel}><h3>Funktioner og komponenter</h3><ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#626a65]">{COVERED_ITEMS.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-4! text-sm">Batteriets forringelsesgrænser i garantiperioden står i svaret om batteri nedenfor. Batterisundheden ved køb er en separat, individuel måling.</p></div>
          </div>
        </section>
        <div className={styles.reading}>
          <section><h2>Sådan får du hjælp</h2><ol className="list-decimal space-y-4 pl-5"><li>Indmeld din reklamation online, eller kontakt os med en beskrivelse af fejlen.</li><li>Vi svarer inden for 1–2 hverdage med en løsning og hjælper dig med at sende enheden til os.</li><li>Vi reparerer eller erstatter enheden hurtigst muligt efter garantivilkårene.</li></ol><p>Svartiden er tiden til vores første svar. Det er ikke en fast behandlingstid for selve reparationen.</p><Link href="/reklamation" className={styles.textLink}>Opret din reklamation →</Link></section>
          <section><h2>Dækning og undtagelser</h2><FaqAccordion items={WARRANTY_FAQ} /></section>
          <section><h2>Returret og handelsbetingelser</h2><p>Du har 30 dages returret på enheder fra leveringsdagen. Det rækker ud over den lovpligtige fortrydelsesret på 14 dage. Efter de 30 dage håndteres garantisager med reparation eller ombytning til en tilsvarende enhed. Tilbehør har 14 dages fortrydelsesret.</p><div className={styles.actions}><Link href="/handelsbetingelser" className={styles.textLink}>Læs handelsbetingelserne →</Link><Link href="/kontakt" className={styles.textLink}>Få hjælp til returnering →</Link></div></section>
          <section><h2>Vil du også være dækket mod uheld?</h2><p>Elektronikforsikring gennem Storstrøm Forsikring er en særskilt ordning. Læs om dækning og vilkår, eller spørg i butikken i Slagelse.</p><Link href="/forsikring" className={styles.textLink}>Læs om elektronikforsikring →</Link></section>
        </div>
      </div>
    </div>
  );
}
