import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/seo/json-ld";
import { SellDeviceWizard } from "@/components/sell-device/sell-device-wizard";
import { SellMethodVideo } from "@/components/sell-device/sell-method-video";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import { STORES } from "@/lib/store-config";
import styles from "@/components/sell-device/sell-device.module.css";

export const metadata: Metadata = {
  title: "Sælg brugt elektronik – iPhone, Samsung og MacBook | PhoneSpot",
  description:
    "Sælg din brugte iPhone, Samsung, iPad, MacBook eller smartwatch. Få en vurdering hos PhoneSpot i Vejle og Slagelse, eller send din enhed efter aftale.",
  alternates: { canonical: "https://phonespot.dk/saelg-din-enhed" },
  openGraph: {
    title: "Sælg din brugte elektronik | PhoneSpot",
    description:
      "Din gamle enhed. Stadig noget værd. Fortæl os om din model og stand, så gennemgår vi den og vender tilbage med en vurdering.",
    url: "https://phonespot.dk/saelg-din-enhed",
    type: "website",
    images: [{ url: "https://phonespot.dk/images/repair/tekniker-reparerer.jpg", alt: "Reparation og længere levetid for elektronik" }],
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
  {
    question: "Hvordan gør jeg min enhed klar til salg?",
    answer:
      "Tag en sikkerhedskopi af det, du vil beholde. Fjern dine konti og aktiveringslåse, nulstil enheden, og tag dit SIM-kort og eventuelle hukommelseskort ud inden aflevering. Er du i tvivl om et trin, kan du kontakte os, før du afleverer.",
  },
  {
    question: "Hvornår aftaler vi pris og betaling?",
    answer:
      "Formularen er en anmodning om vurdering. Vi gennemgår oplysningerne og kontakter dig om et eventuelt tilbud. Pris, betaling og aflevering aftales som del af handlen; du beslutter selv, om du vil gå videre med tilbuddet.",
  },
  {
    question: "Hvorfor sælge en enhed, der stadig virker?",
    answer:
      "Har du selv brug for den, giver det mening at bruge den længere. Ligger den ubrugt, kan et salg give den mulighed for at blive brugt af en anden. Vi vurderer den konkrete enhed og mulighederne for et videre liv som brugt elektronik.",
  },
];

export default function SaelgDinEnhedPage() {
  return (
    <div className={styles.surface}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
          { "@type": "ListItem", position: 2, name: "Sælg din enhed", item: "https://phonespot.dk/saelg-din-enhed" },
        ],
      }} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map(({ question, answer }) => ({
          "@type": "Question", name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }} />
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
              Sælg din brugte elektronik.
            </h1>
            <p className={styles.lead}>
              Din gamle enhed kan stadig være noget værd. Fortæl os om din
              iPhone, Samsung, iPad eller computer. Vi gennemgår model og stand
              og vender tilbage med en vurdering.
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
        <section className={styles.method} aria-labelledby="method-title">
          <div className={styles.methodCopy}>
            <p className={styles.eyebrow}>Din enhed. Dit valg.</p>
            <h2 id="method-title">Et overblik.<br /> Inden du begynder.</h2>
            <p>Fra de første oplysninger til en aftale. Se, hvad du skal gøre, og hvad vi hjælper med undervejs.</p>
            <a href="#process-title">Læs trinene nedenfor <StorefrontIcon kind="arrow" /></a>
          </div>
          <SellMethodVideo />
        </section>
        <section className={styles.process} aria-labelledby="process-title">
          <div>
            <p className={styles.eyebrow}>Fra vurdering til aftale</p>
            <h2 id="process-title">Sådan foregår det</h2>
            <div className={styles.processImage}>
              <Image src="/images/buyback/groenne-traeer.jpg" alt="Sollys gennem grønne trækroner" fill sizes="(max-width: 600px) 90vw, 450px" />
            </div>
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
        <section className={styles.secondLife} aria-labelledby="second-life-title">
          <div className={styles.secondLifeImage}>
            <Image src="/images/repair/tekniker-reparerer.jpg" alt="En tekniker arbejder med de indvendige dele i en tablet" fill sizes="(max-width: 700px) 90vw, 650px" />
          </div>
          <div className={styles.secondLifeCopy}>
            <p className={styles.eyebrow}>Mere liv i det, vi allerede har</p>
            <h2 id="second-life-title">Fra din skuffe.<br />Til en ny hverdag.</h2>
            <p>En telefon, der ligger ubrugt, kan stadig have mange opgaver foran sig. Når du sælger brugt elektronik, giver du den mulighed for at komme videre til en ny ejer. Det er den tanke, PhoneSpot bygger på: at få mere ud af de enheder, der allerede findes.</p>
            <p>Genbrug gør brugte enheder tilgængelige for andre. Og når en brugt telefon erstatter et nykøb, kan behovet for nye råstoffer og fremstilling mindskes. Det Europæiske Miljøagentur peger på længere brugstid som en måde at mindske telefoners miljø- og klimaaftryk på.</p>
            <p>Vurdering, test og reparation er en del af arbejdet med at holde elektronik i brug. Har din enhed en fejl, så beskriv den. Vi ser på, om der er mulighed for at give den et nyt liv.</p>
            <div className={styles.editorialLinks}>
              <Link href="/kvalitet">Sådan arbejder vi med kvalitet <StorefrontIcon kind="arrow" /></Link>
              <a href="https://www.eea.europa.eu/en/analysis/publications/europes-consumption-in-a-circular-economy-the-benefits-of-longer-lasting-electronics">Læs Miljøagenturets viden om længere levetid</a>
            </div>
          </div>
        </section>
        <section className={styles.deviceGuide} aria-labelledby="devices-title">
          <div className={styles.deviceGuideHeading}>
            <div>
              <p className={styles.eyebrow}>Opkøb af brugt elektronik</p>
              <h2 id="devices-title">Hvad vil du give videre?</h2>
            </div>
            <a href="#start">Få din enhed vurderet <StorefrontIcon kind="arrow" /></a>
          </div>
          <p className={styles.deviceGuideLead}>Vi vurderer telefoner, tablets, bærbare og smartwatches. Mærke og model er kun begyndelsen: lagerplads, batteri, funktioner og kosmetisk stand har også betydning. Beskriv det, du ved — også ridser, skader og tidligere reparationer.</p>
          <div className={styles.deviceTopics}>
            <article>
              <h3>Sælg din brugte iPhone</h3>
              <p>Vil du sælge en gammel iPhone, starter du med model og lagerplads i formularen. Fortæl også om batteriet, skærmen og kameraerne. Vi vurderer oplysningerne om netop din telefon, uanset om det er en standardmodel, Pro eller Pro Max. Husk at fjerne Find og din Apple-konto inden et salg.</p>
            </article>
            <article>
              <h3>Sælg din Samsung Galaxy</h3>
              <p>Du kan sende en Samsung Galaxy til vurdering, herunder modeller fra Galaxy S-, A-, Z Fold- og Z Flip-serierne. Beskriv både skærm, bagside og funktioner. Har du en foldbar telefon, er oplysninger om hængsel og den indvendige skærm også nyttige. Din Google- og Samsung-konto skal fjernes inden aflevering.</p>
            </article>
            <article>
              <h3>Sælg din iPad eller tablet</h3>
              <p>En iPad eller Samsung Galaxy Tab, du ikke længere bruger, kan være relevant for en ny ejer. Vælg tablet i formularen, og oplys model, lagerplads og stand. Skriv gerne, om det er en Wi-Fi-model eller en model med mobilforbindelse. Kan du ikke finde modellen, kan du selv indtaste den.</p>
            </article>
            <article>
              <h3>Sælg din MacBook eller laptop</h3>
              <p>Vi vurderer MacBook Air og MacBook Pro samt bærbare fra blandt andre Lenovo, Dell og HP. Oplys den præcise model og gerne processor, hukommelse og lagerplads. Beskriv batteri, tastatur og skærm, og om opladeren følger med. Du kan aflevere i Vejle eller Slagelse eller sende efter aftale.</p>
            </article>
            <article>
              <h3>Sælg dit smartwatch</h3>
              <p>Har du et Apple Watch eller Samsung Galaxy Watch til overs? Vælg smartwatch, og fortæl om model, størrelse og stand. Beskriv opladning, skærm og batteri. Fjern parringen med din telefon og eventuel aktiveringslås, før uret afleveres til en ny ejer.</p>
            </article>
            <article>
              <h3>En smadret skærm er også værd at beskrive</h3>
              <p>Du kan bede om en vurdering af en defekt telefon eller computer. Oplys, hvad der er sket, og hvilke funktioner der virker. En skade betyder, at vi skal se nærmere på mulighederne; den er ikke et løfte om opkøb. Vil du hellere beholde enheden, kan du <Link href="/reparation">se mulighederne for reparation</Link>.</p>
            </article>
          </div>
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
