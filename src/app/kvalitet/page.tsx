import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { GRADE_SHORT_LABEL } from "@/lib/grades";
import styles from "@/components/ui/information.module.css";

export const metadata: Metadata = {
  title: "Kvalitet og stand på refurbished enheder | PhoneSpot",
  description: "Læs om PhoneSpots testproces, kosmetiske grader og individuelt målt batterikapacitet. Refurbished enheder med 36 måneders garanti.",
  keywords: "refurbished iphone, refurbished ipad, brugt iphone kvalitet, refurbished telefon garanti, grade a iphone, refurbished vs brugt, kvalitetstestet iphone, refurbished danmark",
  alternates: { canonical: "https://phonespot.dk/kvalitet" },
  openGraph: { title: "Kvalitet og stand | PhoneSpot", description: "Test, kosmetisk stand og individuelt målt batteri. Se, hvad du køber.", url: "https://phonespot.dk/kvalitet", type: "website" },
};

const grades = [
  { grade: "P" as const, description: "Næsten perfekt med minimale eller ingen brugsspor." },
  { grade: "A" as const, description: "Ingen synlige brugsspor. Enheden fremstår som ny." },
  { grade: "B" as const, description: "Lette brugsspor som små ridser eller mærker." },
  { grade: "C" as const, description: "Synlige brugsspor med ridser og mærker." },
];

const QUALITY_FAQ = [
  { question: "Hvad er forskellen på refurbished og brugt?", answer: "En refurbished enhed fra PhoneSpot er inspiceret, testet, rengjort og klargjort til videresalg. Vores refurbished enheder leveres med 36 måneders garanti." },
  { question: "Hvad betyder Grade A, B og C?", answer: "Graden beskriver den kosmetiske stand. Grade A fremstår som ny uden synlige brugsspor. Grade B har lette brugsspor som små ridser eller mærker. Grade C har synlige brugsspor. Batterikapaciteten måles separat for den enkelte enhed." },
  { question: "Er Grade N også refurbished?", answer: "Nej. Grade N er en fabriksny enhed, som er forseglet og aldrig brugt. Grade P er refurbished i premiumstand med minimale eller ingen brugsspor." },
  { question: "Hvordan ved jeg, hvor godt batteriet er?", answer: "Batteriets sundhed måles individuelt. Se den oplyste batterikapacitet for den konkrete enhed på produktsiden. Graden siger ikke noget om batteriprocenten. Kontakt os før køb, hvis du mangler en måling." },
  { question: "Tester I også bærbare og iPads?", answer: "Ja. Testene tilpasses enheden. På bærbare kontrolleres blandt andet tastatur, trackpad, skærmhængsler og porte ud over skærm, batteri og forbindelser." },
  { question: "Tjekker I for vandskade?", answer: "Enhederne inspiceres for vandskadeindikatorer som del af vores testproces. Enheder med tegn på vandskade sælges ikke som refurbished hos PhoneSpot." },
  { question: "Hvad gør jeg, hvis min enhed har en fejl?", answer: "Kontakt os eller opret en reklamation. Enheder har 36 måneders garanti på fabrikationsfejl og funktionelle mangler efter vores garantivilkår. Tilbehør har 2 års reklamationsret." },
  { question: "Har jeg fortrydelsesret?", answer: "Ved køb online har du 14 dages fortrydelsesret fra leveringsdagen. Læs vores returpolitik for fremgangsmåde og vilkår." },
  { question: "Hvorfor vælge en enhed, der allerede er brugt?", answer: "Når en fungerende enhed bliver testet og taget i brug igen, forlænges dens levetid. Det giver eksisterende elektronik mere tid i brug." },
];

export default function QualityPage() {
  return (
    <div className={styles.shell}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: QUALITY_FAQ.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}><Link href="/">Forside</Link> / Kvalitet</nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Kvalitet hos PhoneSpot</span>
          <h1>Kend den enhed, du køber.</h1>
          <p className={styles.intro}>Vi tester funktionerne, vurderer den kosmetiske stand og måler batteriet. Tre forskellige oplysninger, der hjælper dig med at vælge.</p>
          <nav className={styles.jumpLinks} aria-label="På denne side"><a href="#test" className={styles.textLink}>Testprocessen</a><a href="#stand" className={styles.textLink}>Stand og grader</a><a href="#batteri" className={styles.textLink}>Batteri</a></nav>
        </header>
        <section id="test" className={styles.section}>
          <div className={styles.grid}>
            <div><h2>Testet, før den kommer videre.</h2><p className={styles.intro}>Vores refurbished enheder gennemgår over 30 kontrolpunkter. Testene tilpasses modellen og dens funktioner. Enheder, der ikke lever op til vores standard, sælges ikke som refurbished.</p></div>
            <div className={styles.rows}>
              <div><h3>Skærm, kamera og lyd</h3><p>Touch, pixels, lysstyrke og farver kontrolleres. Vi tester kameraer, Face ID eller Touch ID samt højttalere og mikrofon.</p></div>
              <div><h3>Forbindelser og betjening</h3><p>Wi-Fi, Bluetooth, GPS, sensorer, knapper og porte testes. På bærbare kontrollerer vi også tastatur, trackpad og hængsler.</p></div>
              <div><h3>Inspektion og klargøring</h3><p>Skærm, kabinet og porte inspiceres, også for vandskadeindikatorer. Enheden nulstilles, rengøres og klargøres med software, som modellen understøtter.</p></div>
            </div>
          </div>
        </section>
        <section id="stand" className={styles.section}>
          <div className={styles.grid}>
            <div><h2>Standen handler om det, du kan se.</h2><p className={styles.intro}>Graden beskriver de kosmetiske brugsspor. De refurbished enheder er testet for funktion i alle grader, mens batteriet vurderes separat. De tilgængelige grader fremgår ved den enkelte model.</p><div className={styles.notice} style={{ marginTop: 24 }}><h3>{GRADE_SHORT_LABEL.N} · Grade N</h3><p>En forseglet enhed, som aldrig har været brugt. Grade N er ny og sælges derfor ikke som refurbished.</p></div></div>
            <div className={styles.rows}>{grades.map(({ grade, description }) => <div key={grade}><h3>{GRADE_SHORT_LABEL[grade]} · Grade {grade}</h3><p>{description}</p></div>)}</div>
          </div>
        </section>
        <section id="batteri" className={styles.section}>
          <div className={styles.notice}><h2>Batteriet måles for sig.</h2><p className={styles.intro}>To enheder med samme grade kan have forskellig batterisundhed. Derfor skal du se den målte kapacitet for netop den enhed, du overvejer. Er målingen ikke oplyst, hjælper vi dig med at afklare den før køb.</p><div className={styles.actions}><Link className={styles.textLink} href="/kontakt">Spørg til en enhed →</Link><Link className={styles.textLink} href="/garanti">Læs batteriets garantivilkår →</Link></div></div>
        </section>
        <section className={styles.section}><div className={styles.grid}>
          <figure className={styles.photo}><Image src="/images/store/butik-indvendig.jpg" alt="Enheder og tilbehør hos PhoneSpot" width={1000} height={650} sizes="(max-width: 700px) 100vw, 50vw" /><figcaption>Se enhederne og få rådgivning hos PhoneSpot.</figcaption></figure>
          <div className={styles.panel}><h2>Se standen med egne øjne.</h2><p>Besøg os i Vejle eller Slagelse, hvis du vil se og prøve en enhed. Vi hjælper med at finde en model og stand, der passer til dig.</p><p>Ved at tage en testet enhed i brug igen giver du eksisterende elektronik længere levetid.</p><Link href="/butik" className={styles.button}>Find din butik</Link></div>
        </div></section>
        <div className={styles.reading}>
          <section><h2>Garanti og hjælp efter købet</h2><p>Enheder har 36 måneders garanti. Tilbehør har 2 års reklamationsret. Dækning, undtagelser og fremgangsmåden ved en fejl fremgår af vores garantivilkår.</p><div className={styles.actions}><Link href="/garanti" className={styles.textLink}>Læs garantien →</Link><Link href="/handelsbetingelser" className={styles.textLink}>Returpolitik →</Link></div></section>
          <section><h2>Spørgsmål om kvalitet</h2><FaqAccordion items={QUALITY_FAQ} /></section>
          <section><h2>Find din næste enhed</h2><div className={styles.actions}><Link href="/iphones" className={styles.button}>Se iPhones</Link><Link href="/ipads" className={styles.secondary}>Se iPads</Link><Link href="/baerbare" className={styles.secondary}>Se bærbare</Link></div><div className={styles.actions}><Link href="/blog/refurbished-vs-brugt-guide" className={styles.textLink}>Læs guiden til refurbished →</Link></div></section>
        </div>
      </div>
    </div>
  );
}
