import type { SellDeviceConfig } from "./devices";

/** Kategorier, der kom til i november 2026. Vi køber dem både virkende og defekte. */
export const NEW_CATEGORY_PAGES: SellDeviceConfig[] = [
  {
    slug: "laptop",
    name: "bærbar",
    title: "Sælg din bærbar: virkende eller defekt | PhoneSpot",
    metaDescription:
      "Sælg din brugte bærbar til PhoneSpot, også hvis den er defekt. Oplys model, RAM og SSD, og få et tilbud efter vores gennemgang. Vejle, Slagelse eller med post.",
    eyebrow: "Sælg bærbar",
    h1: "Sælg din bærbar",
    answer:
      "Du sælger din bærbar ved at vælge mærke og model og oplyse RAM, lagerplads og stand i formularen. Vi køber både virkende og defekte computere, og du får et tilbud efter vores gennemgang. Aflever i Vejle eller Slagelse, eller send efter aftale.",
    wizardPreset: { deviceType: "Laptop" },
    bodyHeading: "Det afgør, hvad din bærbar er værd",
    body: [
      "Processor, RAM og lagerplads tæller mest. To computere med samme navn kan være meget forskellige indeni, så find de præcise tal. På Windows står de under Indstillinger, System, Om. Modelnavnet står ofte på et mærkat under computeren.",
      "Stand betyder også meget. Tjek skærmen for pletter og streger, prøv alle taster, og mærk efter, om hængslerne er løse. Se på batteriet, og skriv, om computeren kan holde strøm uden oplader. Følger opladeren med, så skriv det, for en bærbar uden oplader er sværere at teste og sælge videre.",
      "Defekte computere kan du også sælge. Tænder den ikke, er skærmen knækket, eller virker tastaturet ikke, så svar Nej ved Fungerer alt? og markér fejlen. Vi skal kende fejlen på forhånd. Husk at tage backup og fjerne dine data, hvis computeren stadig kan starte.",
    ],
    coverageHeading: "Hvilke bærbare kan du få vurderet",
    coverage:
      "Formularen kender Lenovo, Dell, HP, ASUS, Microsoft Surface, Acer og LG. Står din model ikke på listen, kan du skrive den selv. MacBook har sin egen side.",
    faq: [
      {
        question: "Køber I en defekt bærbar?",
        answer:
          "Ja. Vælg Nej ved Fungerer alt?, og markér det, der ikke virker. Vi vurderer hver computer for sig ud fra model og fejl, og vi kan ikke love at købe alle.",
      },
      {
        question: "Hvordan sletter jeg mine data på en Windows-computer?",
        answer:
          "Tag backup, og vælg Indstillinger, System, Gendannelse, Nulstil denne pc. Vælg Fjern alt. Log også ud af din Microsoft-konto, så computeren ikke er bundet til dig.",
      },
      {
        question: "Hvad gør jeg, hvis opladeren er væk?",
        answer:
          "Du kan stadig sælge computeren. Skriv det i kommentarfeltet, så tager vi det med i vurderingen.",
      },
      {
        question: "Køber I gaming-computere?",
        answer:
          "Ja, bærbare fra fx ASUS ROG, Acer Predator og Nitro kan du få vurderet. Skriv grafikkortet i kommentarfeltet, for det betyder meget for værdien.",
      },
    ],
    blogSlugs: [],
    linkLabel: "bærbar",
  },
  {
    slug: "spillekonsol",
    name: "spillekonsol",
    title: "Sælg din spillekonsol: også defekt | PhoneSpot",
    metaDescription:
      "Sælg din PlayStation, Xbox, Nintendo Switch eller Steam Deck til PhoneSpot. Vi køber både virkende og defekte konsoller. Få et tilbud, og aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg spillekonsol",
    h1: "Sælg din spillekonsol",
    answer:
      "Vi køber PlayStation, Xbox, Nintendo Switch og Steam Deck, både virkende og defekte. Vælg model og stand i formularen, så gennemgår vi oplysningerne og vender tilbage med et tilbud. Aflever i Vejle eller Slagelse, eller send efter aftale.",
    wizardPreset: { deviceType: "Konsol" },
    bodyHeading: "Det kigger vi på, når du sælger en konsol",
    body: [
      "Modellen er udgangspunktet. En PlayStation 5 med diskdrev er ikke det samme som en Digital Edition, og en Switch OLED er ikke det samme som en Switch Lite. Lagerpladsen tæller også, og det gør det, der følger med: controller, kabler, strømforsyning og spil.",
      "Tjek konsollen, før du udfylder formularen. Tænder den, kommer billedet frem, og læser diskdrevet en disk? Larmer blæseren usædvanligt meget, eller slukker konsollen under spil? Svarer du Nej ved Fungerer alt?, markerer du det, der ikke virker: diskdrev, HDMI, overophedning eller at den slet ikke tænder.",
      "En defekt konsol har stadig værdi for os. HDMI-porte og diskdrev er typiske fejl, og vi vurderer hver konsol ud fra fejlen. Log ud af din konto, og nulstil konsollen, hvis den kan starte. Kan den ikke, så skriv det, så kigger vi på det sammen.",
    ],
    coverageHeading: "Hvilke konsoller kan du få vurderet",
    coverage:
      "Formularen kender PlayStation 5, 5 Slim, 5 Pro, Digital Edition og Portal, PlayStation 4, Xbox Series X og S, Xbox One, Nintendo Switch 2, OLED og Lite, Steam Deck og ROG Ally. Andre modeller kan du skrive selv.",
    faq: [
      {
        question: "Køber I en defekt PlayStation eller Xbox?",
        answer:
          "Ja. Fejlen skal blot oplyses på forhånd. Vælg Nej ved Fungerer alt?, og markér, hvad der er galt. Vi vurderer hver konsol for sig og kan ikke love at købe alle.",
      },
      {
        question: "Skal controlleren med?",
        answer:
          "Det er bedst, men det er ikke et krav. Skriv i kommentarfeltet, hvad der følger med. Du kan også sælge controlleren for sig.",
      },
      {
        question: "Køber I også spil?",
        answer:
          "Skriv i kommentarfeltet, hvis der følger spil med, så tager vi stilling til dem sammen med konsollen.",
      },
      {
        question: "Hvordan nulstiller jeg min konsol?",
        answer:
          "Log ud af din konto, og vælg nulstilling under konsollens indstillinger. På PlayStation hedder det Nulstil din konsol, på Xbox Nulstil konsol og på Switch Initialiser konsol. Tag backup af dine gemte spil først.",
      },
    ],
    blogSlugs: [],
    linkLabel: "spillekonsol",
  },
  {
    slug: "controller",
    name: "controller",
    title: "Sælg din controller: også med stick drift | PhoneSpot",
    metaDescription:
      "Sælg din DualSense, Xbox-controller eller Joy-Con til PhoneSpot. Vi køber både virkende og defekte controllere, også med stick drift. Aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg controller",
    h1: "Sælg din controller",
    answer:
      "Vi køber controllere til PlayStation, Xbox og Nintendo Switch, både virkende og defekte. Vælg model og stand i formularen, og markér eventuelle fejl. Du får et tilbud efter vores gennemgang og kan aflevere i Vejle eller Slagelse eller sende efter aftale.",
    wizardPreset: { deviceType: "Controller" },
    bodyHeading: "Sådan tjekker du din controller",
    body: [
      "Stick drift er den mest almindelige fejl. Figuren eller kameraet bevæger sig, selv om du ikke rører sticken. Se efter det i et spil eller i konsollens menu. Prøv også alle knapper og triggere, for slidte knapper og triggere, der ikke går helt tilbage, trækker ned.",
      "Standen tæller. Slidte sticks, ridser og afskallet belægning kan ses, så skriv det, du ser. Et trådløst tjek er også vigtigt: forbind controlleren, og sæt den til opladning. Holder den ikke strøm, så markér Opladning. Følger der kabel eller opladestation med, så skriv det i kommentarfeltet.",
      "Også defekte controllere har værdi, fordi mange fejl kan repareres. En DualSense med stick drift eller en Joy-Con, der glider, er derfor ikke til affald. Markér fejlen, så vi kender den på forhånd. Husk at fjerne en eventuel parring fra din konsol, før du sender den.",
      "Du kan tilføje flere controllere i samme anmodning, og du kan sælge dem sammen med en konsol. Tryk på Tilføj endnu en enhed, og beskriv hver controller for sig, så får du ét samlet svar fra os.",
    ],
    coverageHeading: "Hvilke controllere kan du få vurderet",
    coverage: "Formularen kender DualSense, DualSense Edge, DualShock 4, Xbox Wireless Controller, Xbox Elite Series 2, Switch Pro Controller og Joy-Con.",
    faq: [
      {
        question: "Køber I en controller med stick drift?",
        answer: "Ja. Markér Stick drift i formularen. Vi vurderer controlleren ud fra model og stand, og et lille beløb er stadig bedre end en skuffe.",
      },
      {
        question: "Kan jeg sælge kun én Joy-Con?",
        answer: "Ja, skriv i kommentarfeltet, om det er venstre, højre eller et par.",
      },
      {
        question: "Kan jeg sælge flere controllere på én gang?",
        answer: "Ja. Tryk på Tilføj endnu en enhed for hver controller. Du kan også tilføje dem sammen med en konsol.",
      },
      {
        question: "Hvordan gør jeg en controller klar?",
        answer: "Fjern parringen fra din konsol, og tør den af. Der er ingen konto eller data at slette på en almindelig controller.",
      },
    ],
    blogSlugs: [],
    linkLabel: "controller",
  },
  {
    slug: "hoeretelefoner",
    name: "høretelefoner",
    title: "Sælg dine høretelefoner og AirPods | PhoneSpot",
    metaDescription:
      "Sælg dine AirPods, Sony-, Bose- eller Sennheiser-høretelefoner til PhoneSpot. Vi køber både virkende og defekte. Få et tilbud, og aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg høretelefoner",
    h1: "Sælg dine høretelefoner",
    answer:
      "Vi køber AirPods og høretelefoner fra blandt andre Sony, Bose, Sennheiser og Beats, både virkende og defekte. Vælg model og stand i formularen, og markér eventuelle fejl. Du får et tilbud efter vores gennemgang.",
    wizardPreset: { deviceType: "Høretelefoner" },
    bodyHeading: "Det afgør, hvad dine høretelefoner er værd",
    body: [
      "Modellen er det vigtigste, og det næste er, om alt følger med. AirPods skal have begge ørestykker og opladeretuiet. Over-ear-høretelefoner som Sony WH-1000XM5 og AirPods Max er mere værd med taske og kabel. Skriv i kommentarfeltet, hvad der følger med.",
      "Test lyden i begge sider, og prøv støjreduktionen. Lyd i kun én side, svag støjreduktion og knasen er de typiske fejl. Tjek også, hvor længe batteriet holder, og om mikrofonen virker i et opkald. Slidte ørepuder og ørepropper kan ses, så skriv om dem.",
      "Også defekte høretelefoner kan du sende til vurdering. Markér fejlen i formularen, så vi kender den på forhånd. Vi kontrollerer ægtheden på alle høretelefoner, fordi der findes mange kopier, så gem gerne kvitteringen, hvis du har den. Fjern dem fra din konto og dine enheder, før du sender dem.",
    ],
    coverageHeading: "Hvilke høretelefoner kan du få vurderet",
    coverage:
      "Formularen kender AirPods 2 til 4, AirPods Pro, AirPods Max, Sony WH- og WF-1000X, Bose QuietComfort, Sennheiser Momentum, Beats og Samsung Galaxy Buds. Andre modeller kan du skrive selv.",
    faq: [
      {
        question: "Køber I AirPods uden etui?",
        answer: "Skriv det i kommentarfeltet, så vurderer vi det. Uden opladeretui er værdien meget lavere, fordi det er svært at sælge dem videre.",
      },
      {
        question: "Køber I defekte høretelefoner?",
        answer: "Ja. Markér fejlen, fx Lyd i én side eller Støjreduktion. Vi vurderer model og fejl, og vi kan ikke love at købe alle.",
      },
      {
        question: "Hvordan fjerner jeg AirPods fra min Apple-konto?",
        answer: "Åbn Find My, vælg dine AirPods, og tryk Fjern denne enhed, mens de er slukkede eller uden for rækkevidde. Glem dem derefter under Bluetooth.",
      },
      {
        question: "Hvad er værst for prisen?",
        answer: "Manglende dele og svagt batteri trækker mest ned. Slidte ørepuder kan skiftes, så de betyder mindre.",
      },
    ],
    blogSlugs: [],
    linkLabel: "høretelefoner",
  },
  {
    slug: "dyson",
    name: "Dyson",
    title: "Sælg din Dyson Supersonic eller Airwrap | PhoneSpot",
    metaDescription:
      "Sælg din Dyson Supersonic, Airwrap, Corrale eller Airstrait til PhoneSpot. Vi køber både virkende og defekte. Få et tilbud, og aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg Dyson",
    h1: "Sælg din Dyson",
    answer:
      "Vi køber Dyson Supersonic, Airwrap, Corrale og Airstrait, både virkende og defekte. Vælg model og stand i formularen, og skriv, hvad der følger med. Du får et tilbud efter vores gennemgang og kan aflevere i Vejle eller Slagelse.",
    wizardPreset: { deviceType: "Dyson", brand: "Dyson" },
    bodyHeading: "Det afgør, hvad din Dyson er værd",
    body: [
      "Modellen og mundstykkerne betyder mest. En Airwrap er langt mindre værd uden sine tilbehørsdele, så skriv præcist, hvad der følger med. Har du æsken eller tasken, så skriv også det. Serienummeret står på enheden og hjælper os med at bekræfte modellen.",
      "Test varmen og blæseren på alle indstillinger. Svag luft skyldes ofte et tilstoppet filter, som du selv kan rense. Slukker den af sig selv, eller blinker lyset, så skriv det. Tjek også ledningen ved foden, hvor den ofte bliver slidt, og se efter revner i huset.",
      "Rens filteret, og fjern hår, inden du sender enheden. Vi skal kunne teste og rengøre den, før den kan bruges af en ny ejer. Defekte enheder kan du også sende til vurdering: varmer den ikke, tænder den ikke, eller er ledningen beskadiget, så markér det i formularen.",
    ],
    coverageHeading: "Hvilke Dyson-modeller kan du få vurderet",
    coverage: "Formularen kender Supersonic, Supersonic Nural, Airwrap, Airwrap i.d., Corrale og Airstrait. Vi kontrollerer, at enheden er ægte, fordi der findes kopier på markedet.",
    faq: [
      {
        question: "Køber I en defekt Dyson?",
        answer: "Ja. Markér fejlen, fx Varmer ikke eller Ledning. Vi vurderer hver enhed for sig og kan ikke love at købe alle.",
      },
      {
        question: "Hvad gør jeg, hvis jeg mangler mundstykker?",
        answer: "Skriv, hvilke du har, i kommentarfeltet, eller markér Mundstykker mangler. Du kan stadig sælge enheden.",
      },
      {
        question: "Køber I også Dyson-støvsugere?",
        answer: "Skriv modellen i formularen under Min enhed findes ikke på listen, så svarer vi på, om vi kan købe den.",
      },
      {
        question: "Hvordan ved I, om min Dyson er ægte?",
        answer: "Vi tjekker serienummer, vægt og finish. Har du kvitteringen, så gem den, for den gør det lettere.",
      },
    ],
    blogSlugs: [],
    linkLabel: "Dyson",
  },
  {
    slug: "smart-home",
    name: "smart home",
    title: "Sælg smart home: HomePod, Sonos og Nest | PhoneSpot",
    metaDescription:
      "Sælg din HomePod, Sonos-højttaler, Nest eller Echo til PhoneSpot. Vi køber både virkende og defekte enheder. Få et tilbud, og aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg smart home",
    h1: "Sælg din smart home-enhed",
    answer:
      "Vi køber smarte højttalere, skærme og kameraer fra blandt andre Apple, Sonos, Google, Amazon og Ring, både virkende og defekte. Vælg model og stand i formularen, så får du et tilbud efter vores gennemgang.",
    wizardPreset: { deviceType: "Smart home" },
    bodyHeading: "Før du sælger en smart home-enhed",
    body: [
      "Smart home-enheder er bundet til din konto, så det vigtigste er at fjerne dem. En HomePod fjernes i Hjem-appen, en Sonos i Sonos-appen, og en Nest i Google Home. Nulstil derefter enheden. Er den stadig bundet til dig, kan den næste ejer ikke sætte den op.",
      "Test lyd, mikrofon og forbindelse. Knaser højttaleren, hører assistenten dig ikke, eller falder enheden af WiFi, så markér det i formularen. På kameraer og dørklokker skal billede og nattesyn virke. Følger strømforsyning, stativ eller beslag med, så skriv det i kommentarfeltet.",
      "Også defekte enheder kan du sende til vurdering. Oplys fejlen på forhånd, så vi ved, hvad vi vurderer. Vi ser mest på højttalere og skærme, hvor der er efterspørgsel, så mindre enheder som stik og pærer kan du skrive om i kommentarfeltet, før du sender dem.",
    ],
    coverageHeading: "Hvilke enheder kan du få vurderet",
    coverage: "Formularen kender HomePod, Sonos Era, Arc, Beam, Move og One, Google Nest, Amazon Echo og Ring. Andre enheder kan du skrive selv.",
    faq: [
      {
        question: "Køber I defekte højttalere?",
        answer: "Ja. Markér fejlen i formularen. Vi vurderer model og fejl, og vi kan ikke love at købe alle.",
      },
      {
        question: "Hvordan fjerner jeg en HomePod fra min konto?",
        answer: "Åbn Hjem-appen, hold på din HomePod, åbn indstillingerne, og vælg Fjern tilbehør.",
      },
      {
        question: "Køber I hele Sonos-anlæg?",
        answer: "Ja. Tilføj hver højttaler som sin egen enhed, så får du ét samlet svar.",
      },
      {
        question: "Skal strømforsyningen med?",
        answer: "Ja, hvis enheden har en separat strømforsyning. Skriv det i kommentarfeltet, hvis den mangler.",
      },
    ],
    blogSlugs: [],
    linkLabel: "smart home",
  },
];
