import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { JsonLd } from "@/components/seo/json-ld";
import styles from "@/components/ui/information.module.css";

export const metadata: Metadata = {
  title: "FAQ – ofte stillede spørgsmål | PhoneSpot",
  description: "Find svar om refurbished enheder, stand, garanti, levering og returnering hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/faq" },
};

const sections = [
  {
    id: "enheder", title: "Enheder og stand",
    items: [
      { question: 'Hvad betyder "refurbished"?', answer: "Refurbished betyder, at enheden er professionelt inspiceret, testet og klargjort til videresalg. Vores refurbished enheder gennemgår en grundig kvalitetskontrol." },
      { question: "Hvilken stand er jeres enheder i?", answer: "Grade P er premiumstand med minimale eller ingen brugsspor. Grade A fremstår som ny. Grade B har lette brugsspor, og Grade C har synlige brugsspor. Grade N er fabriksny og er ikke refurbished. Se de tilgængelige grader ved den enkelte model." },
      { question: "Siger graden noget om batteriet?", answer: "Nej. Batterisundheden måles for den enkelte enhed og beskrives separat på produktsiden. Den kosmetiske grade er ikke en batteriprocent. Kontakt os, hvis du mangler en måling før køb." },
      { question: "Hvad er jeres Outlet?", answer: "Vores Outlet indeholder produkter med særligt gode priser – det kan være restlager, udgåede modeller eller produkter med mindre kosmetiske fejl." },
    ],
  },
  {
    id: "koeb", title: "Køb, levering og garanti",
    items: [
      { question: "Har I garanti?", answer: "Ja, enheder leveres med 36 måneders garanti efter vores garantivilkår. Tilbehør har 2 års reklamationsret." },
      { question: "Hvordan returnerer jeg et produkt?", answer: "Du har 14 dages fortrydelsesret fra modtagelsen. Kontakt os via kontaktformularen eller på info@phonespot.dk." },
      { question: "Hvornår får jeg min ordre?", answer: "Vi sender ordrer mandag-fredag. De fleste ordrer leveres inden for 1-3 hverdage med GLS." },
      { question: "Er det sikkert at købe refurbished?", answer: "Vores refurbished enheder er testet og godkendt af vores teknikere. Du får 36 måneders garanti på enheder og 14 dages fortrydelsesret ved køb online." },
      { question: "Kan jeg betale med MobilePay?", answer: "Ja, vi accepterer MobilePay, Visa, Mastercard og bankoverførsel." },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className={styles.shell}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: sections.flatMap((section) => section.items).map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}><Link href="/">Forside</Link> / Spørgsmål og svar</nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Hjælp hos PhoneSpot</span>
          <h1>Spørgsmål og svar.</h1>
          <p className={styles.intro}>Find svar om enheder, køb og hjælp efter levering. Du kan også kontakte os, hvis dit spørgsmål kræver et personligt svar.</p>
          <nav className={styles.jumpLinks} aria-label="Vælg emne">{sections.map((section) => <a key={section.id} href={`#${section.id}`} className={styles.textLink}>{section.title}</a>)}</nav>
        </header>
        <div className={styles.reading}>
          {sections.map((section) => <section id={section.id} key={section.id}><h2>{section.title}</h2><FaqAccordion items={section.items} /></section>)}
          <section><h2>Vil du vide mere?</h2><div className={styles.actions}><Link href="/kvalitet" className={styles.textLink}>Test og kvalitet →</Link><Link href="/garanti" className={styles.textLink}>Garantivilkår →</Link><Link href="/handelsbetingelser" className={styles.textLink}>Handelsbetingelser →</Link></div></section>
          <section><h2>Hjælp til reparation eller salg</h2><p>Find din model og se reparationspriser, eller send os oplysninger om den enhed, du vil sælge.</p><div className={styles.actions}><Link href="/reparation" className={styles.secondary}>Se reparationer</Link><Link href="/saelg-din-enhed" className={styles.secondary}>Sælg din enhed</Link></div></section>
          <section><h2>Fandt du ikke svaret?</h2><p>Vi hjælper dig gerne. Skriv til os, eller besøg butikken i Vejle eller Slagelse.</p><div className={styles.actions}><Link href="/kontakt" className={styles.button}>Kontakt os</Link><Link href="/butik" className={styles.secondary}>Find butik</Link></div></section>
        </div>
      </div>
    </div>
  );
}
