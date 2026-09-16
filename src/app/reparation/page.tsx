import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE, STORES, openingHoursJsonLd } from "@/lib/store-config";
import { getActiveBrands, getAllModelsWithBrand } from "@/lib/supabase/repairs";
import { BrandPicker } from "./brand-picker";
import styles from "@/components/repair/repair.module.css";
import { RepairMethodVideo } from "@/components/repair/repair-method-video";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import landing from "@/components/repair/repair-landing.module.css";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Reparation af iPhone, Samsung, iPad og MacBook | PhoneSpot",
  description:
    "Professionel reparation af iPhones, iPads, MacBooks, Samsung og mere i Slagelse og Vejle. Skærmskift, batteriskift, MacBook-service og mere. Se priser og vælg din reparation.",
  keywords:
    "iphone reparation, ipad reparation, samsung reparation, skærmskift, batteriskift, reparation slagelse, macbook reparation, telefon reparation slagelse, reparation vestsjællandscentret, reparation vejle, telefon reparation vejle, macbook service, mac reparation, macbook batteriskift, macbook skærmskift, reservedele macbook",
  alternates: {
    canonical: "https://phonespot.dk/reparation",
  },
  openGraph: {
    title:
      "Reparation af iPhone, Samsung, iPad og MacBook | PhoneSpot Slagelse & Vejle",
    description:
      "Reparation af telefoner, tablets og bærbare i Vejle og Slagelse. Find din model, se priser og book skærmskift, batteriskift eller anden reparation.",
    url: "https://phonespot.dk/reparation",
    type: "website",
    images: [{ url: "https://phonespot.dk/images/repair/tekniker-reparerer.jpg", alt: "Reparation af en tablet ved arbejdsbordet" }],
  },
};

// ---------------------------------------------------------------------------
// FAQ data
// ---------------------------------------------------------------------------

const REPAIR_FAQ = [
  {
    question: "Hvad koster en skærmudskiftning?",
    answer:
      "Prisen afhænger af din model og den valgte reservedel. Find din model ovenfor for at se priser på skærmskift, batteriskift og andre reparationer. Priserne er i danske kroner inklusive moms.",
  },
  {
    question: "Hvor lang tid tager en reparation?",
    answer:
      "Tiden afhænger af fejlen, modellen og om reservedelen er på lager. Du kan se det forventede tidsforbrug ved den enkelte reparation, når det er oplyst. Kontakt butikken, hvis du har brug for at kende tiden inden dit besøg.",
  },
  {
    question: "Hvilken garanti gælder for reparationen?",
    answer:
      "Se garantioplysningerne ved den konkrete reparation og vores reparationsbetingelser. Vi hjælper dig gerne med at afklare, hvad der gælder for den valgte reservedel og reparation.",
  },
  {
    question: "Kan jeg komme forbi uden tidsbestilling?",
    answer:
      "Du kan komme forbi vores butikker i Vejle og Slagelse. Du kan også booke online og vælge, hvilken butik du vil aflevere i.",
  },
  {
    question: "Skal jeg tage backup først?",
    answer:
      "Vi anbefaler, at du tager en backup af dine data, inden du afleverer din enhed til reparation.",
  },
  {
    question: "Reparerer I også iPad og MacBook?",
    answer:
      "Ja. Vælg Apple og derefter din enhedstype i modelvælgeren. Find din model for at se de tilgængelige reparationer, eller kontakt os for hjælp.",
  },
  {
    question: "Sælger I også reservedele?",
    answer: "Ja. Se vores reservedele til blandt andet iPhone, iPad, Samsung og MacBook. Find delen til din model, eller kontakt os, hvis du vil have hjælp til reparationen.",
  },
];

const REPAIR_SERVICE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: STORE.name,
  description:
    "Reparation af smartphones, tablets og bærbare i Slagelse og Vejle. Find din model for priser på skærmskift, batteriskift og andre reparationer.",
  url: "https://phonespot.dk/reparation",
  telephone: STORE.phone,
  email: STORE.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: STORE.street,
    addressLocality: STORE.city,
    postalCode: STORE.zip,
    addressCountry: STORE.countryCode,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: STORE.coordinates.lat,
    longitude: STORE.coordinates.lng,
  },
  openingHoursSpecification: openingHoursJsonLd(STORE.hours),
  priceRange: "$$",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Reparationer",
    itemListElement: [
      {
        "@type": "OfferCatalog",
        name: "Skærmskift",
        description:
          "Professionel udskiftning af skærm på smartphones og tablets",
      },
      {
        "@type": "OfferCatalog",
        name: "Batteriskift",
        description: "Udskiftning af batteri på telefoner, tablets og bærbare",
      },
      {
        "@type": "OfferCatalog",
        name: "Behandling af vandskader",
        description:
          "Professionel rensning og reparation af vandskadede enheder",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReparationPage() {
  const [brands, allModels] = await Promise.all([
    getActiveBrands(),
    getAllModelsWithBrand(),
  ]);

  return (
    <div className={`${styles.shell} ${landing.page}`}>
      <JsonLd data={REPAIR_SERVICE_JSONLD} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
        { "@type": "ListItem", position: 2, name: "Reparation", item: "https://phonespot.dk/reparation" },
      ] }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: REPAIR_FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
      <div className={landing.wrap}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}>
          <ol>
            <li>
              <Link href="/">Forside</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Reparation</li>
          </ol>
        </nav>
        <section className={landing.hero} aria-labelledby="repair-title">
          <div className={landing.heroCopy}>
            <span className={styles.eyebrow}>Reparation hos PhoneSpot</span>
            <h1 id="repair-title">Reparation.<br />Tilbage til hverdagen.</h1>
            <p>Reparation af iPhone, Samsung, iPad og MacBook. En ny skærm, et nyt batteri eller hjælp til en fejl, du ikke kender. Find din model og se dine muligheder.</p>
            <div className={landing.actions}>
              <a href="#find-din-pris">Find model og pris <StorefrontIcon kind="arrow" /></a>
              <a href="#reparationsforloeb">Sådan foregår det</a>
            </div>
            <span className={landing.heroLocation}><StorefrontIcon kind="pin" /> I Vejle og Slagelse</span>
          </div>
          <div className={landing.heroPhoto}>
            <Image src="/images/repair/tekniker-reparerer.jpg" alt="En tekniker reparerer en tablet ved arbejdsbordet" fill priority sizes="(max-width: 700px) 100vw, 650px" />
            <span>Et blik for detaljerne.</span>
          </div>
        </section>
        <div className={landing.facts}>
          <span><StorefrontIcon kind="check" /> Se pris og reservedel til din model</span>
          <span><StorefrontIcon kind="pin" /> Book online eller kom forbi</span>
          <span><StorefrontIcon kind="phone" /> Hjælp på <a href={`tel:${STORE.phone.replace(/\s/g, "")}`}>61 10 00 48</a></span>
        </div>
        <section id="find-din-pris" className={landing.finder} aria-labelledby="finder-title">
          <div className={landing.sectionHeading}>
            <div><h2 id="finder-title">Hvad skal vi reparere?</h2><p>Find din model for at se reparationer, reservedele og priser.</p></div>
            <Link href="/kontakt">Kan du ikke finde din model? <StorefrontIcon kind="arrow" /></Link>
          </div>
          <BrandPicker brands={brands} models={allModels} />
        </section>
        <section id="reparationsforloeb" className={landing.method} aria-labelledby="method-title">
          <div className={landing.methodCopy}>
            <span className={styles.eyebrow}>Fra fejl til reparation</span>
            <h2 id="method-title">Sådan får du hjælp.</h2>
            <p>Find din model og vælg reparation. Book en aflevering, eller kom forbi en af vores butikker.</p>
            <ol>
              <li><span>01</span><div><h3>Find model og reparation</h3><p>Se priser og oplysninger om reservedele til din enhed.</p></div></li>
              <li><span>02</span><div><h3>Vælg butik og aflevering</h3><p>Book online, og tag en backup inden dit besøg.</p></div></li>
              <li><span>03</span><div><h3>Vi tager os af reparationen</h3><p>Tal med butikken om tidsforbrug og afhentning.</p></div></li>
            </ol>
          </div>
          <RepairMethodVideo />
        </section>
        <section className={landing.repairs} aria-labelledby="common-repairs-title">
          <div className={landing.sectionHeading}>
            <div><span className={styles.eyebrow}>Mere tid med det, du har</span><h2 id="common-repairs-title">En fejl behøver ikke<br />være farvel.</h2></div>
            <p>Skærmen, batteriet eller forbindelsen til opladeren. Nogle gange er det én del, der står mellem dig og en enhed, du stadig er glad for.</p>
          </div>
          <div className={landing.repairEditorial}>
            <article className={landing.screenStory}>
              <div className={landing.screenPhoto}><Image src="/images/repair/telefon-med-smadret-skaerm.jpg" alt="En knust telefonskærm taget af en telefon" fill sizes="(max-width: 700px) 90vw, 560px" /></div>
              <div><h3>Skærmskift</h3><p>Revner i glasset, streger i billedet eller en skærm, der ikke reagerer? Find din model for at se muligheder og priser på skærmudskiftning. Den valgte reservedel har betydning for prisen.</p><a href="#find-din-pris">Se reparationer til din model <StorefrontIcon kind="arrow" /></a></div>
            </article>
            <div className={landing.repairTopics}>
              <article><h3>Batteriskift</h3><p>Løber telefonen hurtigt tør, eller holder din bærbare kun strøm med opladeren i? Et batteriskift kan være en mulighed. Vælg din model, og se de tilgængelige reparationer.</p></article>
              <article><h3>Ladestik, kamera og lyd</h3><p>En løs forbindelse, et kamera med fejl eller lyd, der driller. Fortæl os, hvad du oplever, og om fejlen opstår hele tiden eller kun indimellem. Det hjælper os med at finde årsagen.</p></article>
              <article><h3>Væskeskade eller ukendt fejl</h3><p>Du behøver ikke kende den præcise fejl for at få hjælp. Kontakt os eller kom forbi med enheden, så vi kan tale om undersøgelse og muligheder. Pris og tid afhænger af, hvad der skal laves.</p><Link href="/kontakt">Tal med os om fejlen <StorefrontIcon kind="arrow" /></Link></article>
            </div>
          </div>
        </section>
        <section id="butikker" className={landing.storeSection} aria-labelledby="repair-stores-title">
          <div className={landing.storePhoto}><Image src="/images/store/butik-indvendig.jpg" alt="Inde i PhoneSpots butik i Slagelse" fill sizes="(max-width: 700px) 100vw, 600px" /></div>
          <div className={landing.storeCopy}>
            <span className={styles.eyebrow}>Hjælp tæt på dig</span>
            <h2 id="repair-stores-title">Reparation i<br />Vejle og Slagelse.</h2>
            <p>Er du i tvivl om modellen eller fejlen? Tag din enhed med i butikken, eller kontakt os før dit besøg.</p>
            <div className={styles.storeLinks}>
              {[STORES.vejle, STORES.slagelse].map(store => <Link key={store.slug} href={`/butik/${store.slug}`}><span><strong>{store.city}</strong><small>{store.street}, {store.zip} {store.city}</small><small>Find vej og åbningstider</small></span><StorefrontIcon kind="arrow" /></Link>)}
            </div>
            <Link className={landing.contactLink} href="/kontakt">Få hjælp til din reparation <StorefrontIcon kind="arrow" /></Link>
          </div>
        </section>
        <section className={landing.deviceGuide} aria-labelledby="repair-devices-title">
          <h2 id="repair-devices-title">Reparation af telefoner, tablets og bærbare</h2>
          <div>
            <article><h3>iPhone og Samsung</h3><p>Find reparation til din iPhone eller Samsung Galaxy. Vælg den præcise model, så du ser de rigtige skærme, batterier og andre reservedele. Du kan også søge efter modeller fra blandt andre Google, OnePlus og Huawei i modelvælgeren.</p><a href="#find-din-pris">Find din telefon <StorefrontIcon kind="arrow" /></a></article>
            <article><h3>iPad og MacBook</h3><p>Vi hjælper også med reparation af iPad, MacBook Air og MacBook Pro. Vælg Apple og derefter din enhedstype. Beskriv gerne problemer med skærm, batteri, tastatur eller opladning, så vi kan hjælpe dig videre.</p><Link href="/reservedele">Se også vores reservedele <StorefrontIcon kind="arrow" /></Link></article>
          </div>
          <p className={landing.longerLife}>Når en reparation holder din enhed i brug, får du mere ud af det, du allerede har. Er reparation ikke den rette løsning for dig, kan du også <Link href="/saelg-din-enhed">få din brugte enhed vurderet</Link>.</p>
        </section>
        <section className={`${styles.faq} ${landing.faq}`}>
          <div>
            <h2>
              Godt at vide
              <br />
              før reparationen.
            </h2>
            <Link href="/handelsbetingelser" className={styles.textLink}>
              Læs reparationsbetingelserne
            </Link>
          </div>
          <div>
            {REPAIR_FAQ.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <aside className={landing.business}>
          <div><h2>Flere enheder på arbejdet?</h2><p>Vi kører ud til virksomheder på hele Sjælland og i hele Jylland, når flere enheder skal repareres.</p></div>
          <Link href="/erhverv">Se reparation til erhverv <StorefrontIcon kind="arrow" /></Link>
        </aside>
        <aside className={landing.insurance}>
          <Image src="/brand/partners/storstrom-forsikring-white.svg" alt="Storstrøm Forsikring" width={120} height={35} />
          <div><h2>Elektronikforsikring via Storstrøm</h2><p>Læs om muligheder og vilkår for elektronikforsikring i samarbejde med Storstrøm Forsikring.</p></div>
          <Link href="/forsikring">Se elektronikforsikring <StorefrontIcon kind="arrow" /></Link>
        </aside>
      </div>
    </div>
  );
}
