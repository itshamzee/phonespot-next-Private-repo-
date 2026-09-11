import type { Metadata } from "next";
import Link from "next/link";
import { SellDeviceWizard } from "@/components/sell-device/sell-device-wizard";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import { STORES } from "@/lib/store-config";
import styles from "@/components/sell-device/sell-device.module.css";

export const metadata: Metadata = {
  title: "Sælg din brugte telefon, tablet eller laptop | PhoneSpot",
  description:
    "Beskriv din brugte telefon, tablet, laptop eller smartwatch og få en vurdering hos PhoneSpot. Aflever i Vejle eller Slagelse, eller send efter aftale.",
  alternates: { canonical: "https://phonespot.dk/saelg-din-enhed" },
  openGraph: {
    title: "Sælg din brugte enhed | PhoneSpot",
    description:
      "Din gamle enhed. Stadig noget værd. Fortæl os om din model og stand, så gennemgår vi den og vender tilbage med en vurdering.",
    url: "https://phonespot.dk/saelg-din-enhed",
    type: "website",
  },
};

const questions = [
  {
    question: "Hvad er min enhed værd?",
    answer:
      "Det afhænger blandt andet af model, lagerplads og stand. Beskriv din enhed i formularen, så gennemgår vi oplysningerne og vender tilbage med en vurdering og et eventuelt tilbud.",
  },
  {
    question: "Kan jeg sælge flere enheder?",
    answer:
      "Ja. Vælg din første enhed og tryk på Tilføj endnu en enhed. Du kan beskrive standen for hver enhed og sende dem i én samlet anmodning.",
  },
  {
    question: "Min model er ikke på listen. Hvad gør jeg?",
    answer:
      "Vælg enhedstype og tryk på Min enhed findes ikke på listen. Så kan du selv skrive mærke og model. Listen er en hjælp til formularen; vi vurderer din konkrete enhed.",
  },
  {
    question: "Kan I vurdere en defekt enhed?",
    answer:
      "Beskriv skader og dele, der ikke virker, i formularen. Vi gennemgår oplysningerne for at vurdere, om vi kan tilbyde at købe enheden. En aktiv iCloud- eller Google-lås skal fjernes inden et salg.",
  },
  {
    question: "Hvordan afleverer eller sender jeg enheden?",
    answer:
      "Vælg din foretrukne løsning i formularen. Når der er en aftale, får du oplysninger om aflevering i Vejle eller Slagelse eller om indsendelse med en forsendelseslabel.",
  },
];

export default function SaelgDinEnhedPage() {
  return (
    <div className={styles.surface}>
      <div className={styles.wrap}>
        <nav aria-label="Brødkrummer" className={styles.breadcrumb}>
          <Link href="/">Forside</Link>
          <span aria-hidden="true">/</span>
          <span>Sælg din enhed</span>
        </nav>
        <section className={styles.startArea} aria-labelledby="sell-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>
              <StorefrontIcon kind="exchange" />
              Sælg din enhed
            </p>
            <h1 id="sell-title">
              Din gamle enhed.
              <br />
              Stadig noget værd.
            </h1>
            <p className={styles.lead}>
              Fortæl os om din model og stand. Vi gennemgår dine oplysninger og
              vender tilbage med en vurdering.
            </p>
            <div className={styles.introDetail}>
              <p>
                Telefon, tablet, laptop eller smartwatch — du kan tilføje flere
                enheder i samme anmodning.
              </p>
              <div>
                <StorefrontIcon kind="person" />
                <span>Din enhed bliver vurderet af os.</span>
              </div>
              <div>
                <StorefrontIcon kind="pin" />
                <span>
                  Aflever i Vejle eller Slagelse, eller send efter aftale.
                </span>
              </div>
              <p className={styles.note}>
                Du sender en vurderingsanmodning. Et eventuelt tilbud kommer
                efter vores gennemgang.
              </p>
            </div>
          </div>
          <div id="start" className={styles.formStart}>
            <SellDeviceWizard />
          </div>
        </section>
        <section className={styles.process} aria-labelledby="process-title">
          <div>
            <p className={styles.eyebrow}>Fra vurdering til aftale</p>
            <h2 id="process-title">Sådan foregår det</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>Vi vurderer din enhed</h3>
                <p>
                  Vi ser på model, stand og dine oplysninger og kontakter dig om
                  en vurdering.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Du tager stilling</h3>
                <p>
                  Modtager du et tilbud, kan du gennemgå det og vælge, om du vil
                  gå videre.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Aflever eller send</h3>
                <p>
                  Vi aftaler aflevering eller indsendelse og gennemgår enheden
                  som del af handlen.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section className={styles.help} aria-labelledby="help-title">
          <div>
            <p className={styles.eyebrow}>Hjælp til dit salg</p>
            <h2 id="help-title">Godt at vide</h2>
            <div className={styles.faq}>
              {questions.map(({ question, answer }) => (
                <details key={question}>
                  <summary>
                    {question}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <aside className={styles.stores} aria-labelledby="stores-title">
            <StorefrontIcon kind="pin" />
            <h2 id="stores-title">Kom forbi os</h2>
            <p>Har du brug for hjælp til din enhed? Tal med os i butikken.</p>
            {[STORES.vejle, STORES.slagelse].map((store) => (
              <div className={styles.store} key={store.slug}>
                <h3>{store.name}</h3>
                <p>
                  {store.street}
                  <br />
                  {store.zip} {store.city}
                </p>
                <Link href={`/butik/${store.slug}`}>
                  Se butik og åbningstider <StorefrontIcon kind="arrow" />
                </Link>
              </div>
            ))}
            <Link className={styles.helpLink} href="/kontakt">
              Kontakt os om din enhed <StorefrontIcon kind="arrow" />
            </Link>
          </aside>
        </section>
      </div>
    </div>
  );
}
