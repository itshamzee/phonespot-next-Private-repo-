import Link from "next/link";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { STORES } from "@/lib/store-config";
import { PHONESPOT_ONE_LINER, PHONESPOT_PROMISES } from "@/lib/promises";
import styles from "./storefront.module.css";
import editorial from "./home-editorial.module.css";

const accessories = [
  { title: "Covers", href: "/tilbehoer/covers", image: "cover-product" },
  { title: "Beskyttelsesglas", href: "/beskyttelsesglas", image: "glass-product" },
  { title: "Kabler og opladere", href: "/tilbehoer/opladere", image: "charger-product" },
];

const questions = [
  { question: "Hvad betyder refurbished?", answer: "En refurbished enhed er en brugt enhed, der er klargjort igen. Hos PhoneSpot bliver den inspiceret, testet, rengjort og klargjort til en ny ejer. Du vælger model og stand og kan se oplysningerne om den konkrete enhed før køb.", href: "/kvalitet", label: "Læs om vores kvalitetskontrol" },
  { question: "Hvad betyder stand A, B og C?", answer: "Standen beskriver enhedens kosmetiske udseende. A har ingen synlige brugsspor, B har lette brugsspor, og C har synlige brugsspor. Batteriet vurderes separat. Læs altid beskrivelsen af den konkrete enhed.", href: "/kvalitet#stand", label: "Se forskellen på graderne" },
  { question: "Hvordan er batteriets stand?", answer: "Alle enheder har mindst 90 % batterikapacitet ved levering. Er den lavere, skifter vi batteriet uden beregning. Stand A, B eller C fortæller om udseendet og er ikke en batteriprocent.", href: "/kvalitet#batteri", label: "Læs om batteriet" },
  { question: "Hvad med garantien?", answer: "Refurbished enheder leveres med 36 måneders garanti efter vores garantivilkår. Tilbehør har 2 års reklamationsret. Du har desuden 30 dages returret på enheder.", href: "/garanti", label: "Læs garantivilkårene" },
  { question: "Matcher I prisen hos andre?", answer: "Vi tilbyder prismatch på sammenlignelige refurbished enheder hos danske konkurrenter. Model og kosmetisk stand skal matche, og varen skal være på lager hos konkurrenten. Send os et link, så vi kan vurdere prisen efter vores betingelser.", href: "/prismatch", label: "Se betingelserne for prismatch" },
];

export function StorefrontSections() {
  return <>
    <section className={editorial.promises} aria-labelledby="home-promises-title">
      <div className={editorial.promisesCopy}>
        <span className={styles.eyebrow}>Seks løfter</span>
        <h2 id="home-promises-title">Værkstedet, der står<br /> bag telefonen.</h2>
        <p>{PHONESPOT_ONE_LINER} Vi reparerer selv, og derfor kan vi love mere om den telefon, du køber.</p>
        <Link className={styles.textlink} href="/garanti#loefter">Læs løfterne i detaljer<StorefrontIcon kind="arrow" /></Link>
      </div>
      <ol className={editorial.promiseList}>
        {PHONESPOT_PROMISES.map(item => <li key={item.title}><strong>{item.title}</strong><span>{item.detail}</span></li>)}
      </ol>
    </section>
    <section className={editorial.accessories} aria-labelledby="home-accessories-title">
      <div className={editorial.accessoryCopy}>
        <span className={styles.eyebrow}>Til hverdagens enheder</span>
        <h2 id="home-accessories-title">Det lille,<br /> du bruger hver dag.</h2>
        <p>Et cover til din model. Glas til skærmen. Et kabel, når du mangler strøm.</p>
        <Link className={styles.textlink} href="/tilbehoer">Se alt tilbehør<StorefrontIcon kind="arrow" /></Link>
      </div>
      <nav className={editorial.accessoryLinks} aria-label="Find tilbehør">
        {accessories.map(item => <Link href={item.href} key={item.href}>
          <div className={editorial.accessoryImage}>
            {/* Existing product cutouts from the accessories page. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/accessories/${item.image}.png`} alt="" width="700" height="700" loading="lazy" decoding="async" />
          </div>
          <span>{item.title}<StorefrontIcon kind="arrow" /></span>
        </Link>)}
      </nav>
    </section>
    <section className={styles.store} aria-label="Besøg vores butikker">
      <div className={styles["store-photo"]}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/store/butik-indvendig.jpg" alt="Indenfor i PhoneSpots butik" loading="lazy" />
        <span><StorefrontIcon kind="pin" />PhoneSpot · Også tæt på dig</span>
      </div>
      <div className={styles["store-copy"]}>
        <span className={styles.eyebrow}>Vejle og Slagelse</span>
        <h2>Se den.<br />Prøv den.<br />Tag den med.</h2>
        <p>Kom forbi, se standen med egne øjne, og få hjælp til at vælge. Du kan også få din telefon repareret, mens du venter, ved <Link href="/reparation-vejle">mobilreparation i Vejle</Link> og <Link href="/reparation-slagelse">mobilreparation i Slagelse</Link>, eller få en vurdering af din gamle enhed.</p>
        <div className={styles["store-links"]}>
          {[STORES.vejle, STORES.slagelse].map(store => <Link key={store.slug} href={`/butik/${store.slug}`}><span><strong>{store.city}</strong><small>{store.street}</small><small>Find vej og åbningstider</small></span><StorefrontIcon kind="arrow" /></Link>)}
        </div>
      </div>
    </section>
    <section className={editorial.quality} aria-labelledby="home-quality-title">
      <div className={editorial.qualityCopy}>
        <span className={styles.eyebrow}>Brugt før. Klar igen.</span>
        <h2 id="home-quality-title">Refurbished elektronik.<br />Mere at give af.</h2>
        <p>En god telefon behøver ikke være ny. Hos PhoneSpot finder du kvalitetstestede <Link href="/iphones">iPhones</Link>, <Link href="/smartphones">smartphones med Android</Link>, <Link href="/ipads">iPads</Link>, <Link href="/baerbare">MacBooks og bærbare</Link> samt <Link href="/smartwatches">smartwatches</Link>. Vælg efter det, du har brug for, og se model, stand og pris, før du beslutter dig.</p>
        <p>Når elektronik bruges længere, får vi mere ud af de materialer og det arbejde, der allerede ligger i den. Derfor hjælper vi også med <Link href="/reparation">reparation</Link> og <Link href="/saelg-din-enhed">vurdering af din brugte enhed</Link>.</p>
        <Link className={styles.textlink} href="/kvalitet">Sådan sikrer vi kvaliteten<StorefrontIcon kind="arrow" /></Link>
      </div>
      <div className={editorial.answers}>
        <h3>Godt at vide, før du vælger</h3>
        {questions.map((item, index) => <details key={item.question} open={index === 0}>
          <summary>{item.question}<span aria-hidden="true">+</span></summary>
          <div className={editorial.answer}>
            <p>{item.answer}</p>
            <Link href={item.href}>{item.label}<StorefrontIcon kind="arrow" /></Link>
          </div>
        </details>)}
      </div>
    </section>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions.map(item => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
  </>;
}
