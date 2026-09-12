import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE, STORES } from "@/lib/store-config";
import { getActiveBrands, getAllModelsWithBrand } from "@/lib/supabase/repairs";
import { BrandPicker } from "./brand-picker";
import styles from "@/components/repair/repair.module.css";
import { StorstromInsuranceTeaser } from "@/components/ui/storstrom-insurance-teaser";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Reparation af iPhone, iPad, Samsung & Mere | PhoneSpot",
  description:
    "Professionel reparation af iPhones, iPads, MacBooks, Samsung og mere i Slagelse og Vejle. Skærmskift, batteriskift, MacBook service og mere. Se priser og vælg din reparation.",
  keywords:
    "iphone reparation, ipad reparation, samsung reparation, skærmskift, batteriskift, reparation slagelse, macbook reparation, telefon reparation slagelse, reparation vestsjællandscentret, reparation vejle, telefon reparation vejle, macbook service, mac reparation, macbook batteriskift, macbook skærmskift, reservedele macbook",
  alternates: {
    canonical: "https://phonespot.dk/reparation",
  },
  openGraph: {
    title:
      "Reparation af iPhone, iPad, Samsung & Mere | PhoneSpot Slagelse & Vejle",
    description:
      "Professionel reparation med kvalitetsdele og garanti. Skærmskift, batteriskift, vandskade og mere. Faste priser og hurtig service i Slagelse og Vejle.",
    url: "https://phonespot.dk/reparation",
    type: "website",
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
];

const REPAIR_SERVICE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: STORE.name,
  description:
    "Professionel reparation af smartphones, tablets og bærbare i Slagelse og Vejle. Skærmskift, batteriskift, vandskade og mere med faste priser og garanti.",
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
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "10:00",
      closes: "17:00",
    },
  ],
  priceRange: "$$",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Reparationsservices",
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
        description: "Udskiftning af batteri med højkapacitets reservedele",
      },
      {
        "@type": "OfferCatalog",
        name: "Vandskade-behandling",
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
    <div className={styles.shell}>
      <JsonLd data={REPAIR_SERVICE_JSONLD} />
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
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}>
          <ol>
            <li>
              <Link href="/">Forside</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Reparation</li>
          </ol>
        </nav>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Reparation hos PhoneSpot</span>
            <h1>Giv din telefon mere tid.</h1>
            <p>
              En ny skærm. Et friskt batteri. Find din model, se prisen og lad
              vores teknikere tage sig af resten i Vejle eller Slagelse.
            </p>
            <div className={styles.heroActions}>
              <a href="#find-din-pris">Find din reparation</a>
              <a href="#butikker">Find butik</a>
            </div>
          </div>
          <div className={styles.heroPhoto}>
            <Image
              src="/images/repair/telefon-med-smadret-skaerm.jpg"
              alt="Telefon med knust skærm og adskilt display"
              fill
              priority
              sizes="(max-width: 600px) 90vw, 45vw"
            />
          </div>
        </section>
        <section id="find-din-pris" className={styles.section}>
          <h2>Hvad skal vi reparere?</h2>
          <p className={styles.intro}>
            Find din model for at se reparationer, reservedele og priser.
          </p>
          <BrandPicker brands={brands} models={allModels} />
        </section>
        <section id="butikker" className={styles.help}>
          <div>
            <span className={styles.eyebrow}>Hjælp tæt på dig</span>
            <h2>
              Kom forbi.
              <br />
              Vi ser på det sammen.
            </h2>
            <p>
              Er du i tvivl om modellen eller fejlen? Tag din enhed med i
              butikken, eller kontakt os før dit besøg.
            </p>
            <Link href="/kontakt">Få hjælp til din reparation</Link>
          </div>
          <div className={styles.storeLinks}>
            {[STORES.vejle, STORES.slagelse].map((store) => (
              <Link key={store.slug} href={"/butik/" + store.slug}>
                <span>
                  <strong>{store.city}</strong>
                  <small>
                    {store.street}, {store.zip} {store.city}
                  </small>
                  <small>Find vej og åbningstider</small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
        <section className={styles.faq}>
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
        <div className={styles.section}>
          <StorstromInsuranceTeaser variant="repair" />
        </div>
      </div>
    </div>
  );
}
