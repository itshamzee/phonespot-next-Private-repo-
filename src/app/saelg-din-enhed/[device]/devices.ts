/**
 * Indhold til enhedssiderne under /saelg-din-enhed/[device].
 *
 * Ingen priser her, med vilje: ejeren besluttede i august 2026, at vi ikke
 * publicerer opkøbstal (en offentlig tabel kan ikke holdes, og marginen kan
 * udledes af den). Siderne lever af modeldækning, hvad der påvirker prisen og
 * konkrete forberedelsestrin. Skal tabeller tilføjes, kræver det ejerens ja.
 */

export type SellDeviceSlug = "iphone" | "samsung" | "ipad" | "macbook" | "apple-watch";

export type SellDeviceFaq = { question: string; answer: string };

export type SellDeviceConfig = {
  slug: SellDeviceSlug;
  /** Nøgleordet som navneord: "iPhone", "Samsung Galaxy" osv. */
  name: string;
  /** Længde under 60 tegn, starter med "Sælg ...". */
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  /** Svaret først: ét kort afsnit under H1. */
  answer: string;
  /** Sendes videre til SellDeviceWizard, så første enhed er forvalgt. */
  wizardPreset: { deviceType: string; brand: string };
  bodyHeading: string;
  body: string[];
  /** Modeller formularen kender, i klar tekst. */
  coverageHeading: string;
  coverage: string;
  faq: SellDeviceFaq[];
  /** Blogindlæg (slug under /blog), der findes i src/content/blog. */
  blogSlugs: string[];
  /** Kort ankertekst i hubbens enhedsliste og i krydslinks. */
  linkLabel: string;
};

export const SELL_DEVICES: SellDeviceConfig[] = [
  {
    slug: "iphone",
    name: "iPhone",
    title: "Sælg iPhone: fast pris og udbetaling | PhoneSpot",
    metaDescription:
      "Sælg din brugte iPhone til PhoneSpot. Vælg model, lagerplads og stand, så vender vi tilbage med et tilbud. Aflever i Vejle eller Slagelse. Se, hvad du skal gøre først.",
    eyebrow: "Sælg iPhone",
    h1: "Sælg din iPhone",
    answer:
      "Vil du sælge din iPhone, vælger du model, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud. Du afleverer telefonen i Vejle eller Slagelse eller sender den efter aftale.",
    wizardPreset: { deviceType: "Telefon", brand: "Apple" },
    bodyHeading: "Det afgør, hvad din iPhone er værd",
    body: [
      "Modellen er udgangspunktet, men to iPhones af samme model kan ligge langt fra hinanden. Lagerplads tæller: en iPhone 15 Pro med 256 GB er mere værd end samme model med 128 GB. Kosmetisk stand tæller også, og her er bagsiden og skærmen de to steder, vi kigger først.",
      "Batteriet er den oplysning, de fleste glemmer. Du kan se det under Indstillinger, Batteri, Batteritilstand og opladning. Står maksimal kapacitet under 80 procent, så skriv det i formularen, for det vil alligevel vise sig ved gennemgangen.",
      "Modelnavnet står under Indstillinger, Generelt, Om. Lagerpladsen finder du under Generelt, iPhone-lagerplads. Har du ikke styr på det, så skriv det, du ved, i kommentarfeltet. Er telefonen repareret før, fx med ny skærm eller nyt batteri, så skriv også det. Det gør ikke vurderingen dårligere, men det gør den rigtigere.",
    ],
    coverageHeading: "Hvilke iPhones kan du få vurderet",
    coverage:
      "Formularen kender iPhone X og alle modeller derfra til de nyeste: almindelige, Plus, mini, Pro og Pro Max samt SE (2. og 3. gen). Står din model ikke på listen, kan du skrive den selv.",
    faq: [
      {
        question: "Hvordan fjerner jeg Find min iPhone og min Apple-konto?",
        answer:
          "Gå til Indstillinger, tryk på dit navn øverst, og vælg Log ud nederst. Du bliver bedt om adgangskoden til din Apple-konto, og det slår Find min iPhone og aktiveringslåsen fra. Først derefter nulstiller du telefonen under Generelt, Overfør eller nulstil iPhone, Slet alt indhold og alle indstillinger.",
      },
      {
        question: "Kan jeg sælge en iPhone med revnet skærm?",
        answer:
          "Ja, du kan sende den til vurdering. Skriv, om den reagerer på berøring, om Face ID virker, og om der også er skade på bagsiden. En revnet skærm sænker værdien, men ofte kan det betale sig at sælge telefonen, som den er, frem for at reparere den først. Indlægget nedenfor regner forskellen igennem.",
      },
      {
        question: "Hvad er aktiveringslås, og hvad gør jeg, hvis jeg har glemt mit login?",
        answer:
          "Aktiveringslåsen binder telefonen til din Apple-konto og kan ikke omgås af os. En iPhone, der stadig er låst, kan vi ikke købe. Husker du ikke adgangskoden, kan du nulstille den på iforgot.apple.com. Har du ikke telefonen ved hånden, kan du logge ind på icloud.com/find, vælge telefonen under Alle enheder og trykke Fjern fra konto.",
      },
      {
        question: "Hvad skal jeg sikkerhedskopiere, før jeg nulstiller?",
        answer:
          "Billeder, beskeder og apps kan du tage med i en iCloud-backup eller en backup til computeren. Kontrollér, at backuppen er færdig, før du sletter noget. Skal du over på en ny iPhone, kan du flytte alt direkte mellem de to telefoner, så længe den gamle stadig er tændt.",
      },
      {
        question: "Hvad gør jeg med SIM-kortet og eSIM?",
        answer:
          "Tag SIM-kortet ud. Har du et eSIM, så få det overført til din nye telefon hos din teleudbyder, før du sletter den gamle, for en nulstilling kan slette eSIM-profilerne. Cover og skærmbeskyttelse skal ikke med. Skriv i formularen, hvis der følger oplader eller kabel med.",
      },
    ],
    blogSlugs: ["hvad-er-din-brugte-iphone-vaerd", "saelg-iphone-med-oedelagt-skaerm", "overfoer-data-til-ny-iphone"],
    linkLabel: "iPhone",
  },
  {
    slug: "samsung",
    name: "Samsung Galaxy",
    title: "Sælg Samsung Galaxy: fast pris | PhoneSpot",
    metaDescription:
      "Sælg din brugte Samsung Galaxy S, A, Z Fold eller Z Flip til PhoneSpot. Du får et fast tilbud efter vores gennemgang. Fjern Google-kontoen først.",
    eyebrow: "Sælg Samsung",
    h1: "Sælg din Samsung Galaxy",
    answer:
      "Du sælger din Samsung ved at vælge model, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud, og du kan aflevere telefonen i Vejle eller Slagelse. Fjern Google-kontoen, før du nulstiller.",
    wizardPreset: { deviceType: "Telefon", brand: "Samsung" },
    bodyHeading: "Samsung-modeller er forskellige at vurdere",
    body: [
      "Galaxy S-serien, A-serien og de foldbare modeller har meget forskellige brugsmønstre, og det afspejler sig i, hvad vi kigger efter. På en S-telefon er det skærmen, kanterne og batteriet. På en A-model er det ofte hukommelsesvarianten, fordi samme navn findes med flere størrelser.",
      "Har du en Z Fold eller Z Flip, så fortæl om den indvendige skærm og om folden. Streger, bobler og misfarvning i skærmen er de fejl, der betyder mest, og ydersiden og hængslet tæller også med.",
      "Modelnavnet står under Indstillinger, Om telefonen. Tryk på Softwareoplysninger, hvis du også vil se, hvilken Android-version telefonen kører. Skriv alt, hvad du ved, i formularen. Det er din beskrivelse, vi sammenholder med telefonen, når den er modtaget.",
    ],
    coverageHeading: "Hvilke Samsung-modeller kan du få vurderet",
    coverage:
      "Formularen kender Galaxy S21 til S25 (inklusive Plus og Ultra), Z Fold 4 til 6, Z Flip 4 til 6 og A-modellerne A14, A15, A34, A35, A53, A54 og A55. Andre Galaxy-modeller kan du skrive ind selv.",
    faq: [
      {
        question: "Hvad er FRP-lås, og hvorfor skal Google-kontoen fjernes?",
        answer:
          "FRP (Factory Reset Protection) betyder, at en nulstillet telefon kræver login på den Google-konto, der sidst var på den. Er kontoen ikke fjernet, kan hverken du eller en ny ejer bruge telefonen. Gå til Indstillinger, Konti og backup, Administrer konti, vælg din Google-konto og fjern den, før du nulstiller.",
      },
      {
        question: "Skal jeg også fjerne min Samsung-konto?",
        answer:
          "Ja. Log ud af Samsung-kontoen, og slå Find min mobil fra, så telefonen ikke er knyttet til dig. Når begge konti er fjernet, nulstiller du under Indstillinger, Generel administration, Nulstil, Gendan fabriksindstillinger.",
      },
      {
        question: "Hvordan flytter jeg mine data, inden jeg sælger?",
        answer:
          "Samsungs egen app Smart Switch kan overføre indhold direkte til en ny telefon eller tage en kopi til computeren. Du kan også bruge Google-backup til kontakter, apps og billeder. Kontrollér, at billeder faktisk ligger i skyen eller på computeren, før du sletter.",
      },
      {
        question: "Hvad er vigtigt at oplyse om en foldbar Samsung?",
        answer:
          "Skriv, om den indvendige skærm har streger, bobler eller misfarvning, om folden mærkes tydeligt, og om ydersiden er intakt. Oplys også, hvis skærmen eller hængslet har været repareret. Det er de punkter, der adskiller to ens modeller.",
      },
      {
        question: "Min model står ikke på listen. Kan jeg stadig sælge den?",
        answer:
          "Ja. Vælg Min enhed findes ikke på listen i formularen, og skriv mærke og modelnavn, som det står under Om telefonen. Vi vurderer den konkrete telefon, så du risikerer ikke at få afvist modellen, fordi den mangler i en rullemenu.",
      },
    ],
    blogSlugs: [],
    linkLabel: "Samsung Galaxy",
  },
  {
    slug: "ipad",
    name: "iPad",
    title: "Sælg iPad: fast pris og gratis retur | PhoneSpot",
    metaDescription:
      "Sælg din brugte iPad, iPad Air, iPad Pro eller iPad mini til PhoneSpot. Beskriv model og stand, så vender vi tilbage med et tilbud. Log ud af Apple-kontoen først.",
    eyebrow: "Sælg iPad",
    h1: "Sælg din iPad",
    answer:
      "Din iPad sælger du ved at vælge model, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud. Du kan aflevere i Vejle eller Slagelse eller sende den efter aftale.",
    wizardPreset: { deviceType: "Tablet", brand: "Apple" },
    bodyHeading: "Derfor er to iPads af samme navn ikke ens",
    body: [
      "En iPad findes i mange varianter under samme navn. Lagerplads, Wi-Fi eller mobilforbindelse og chip afgør meget, og derfor spørger formularen om dem. Har du menuen Mobildata i Indstillinger, er det en model med mobilforbindelse, og det skal stå i din beskrivelse.",
      "Modelnavnet står under Indstillinger, Generelt, Om. Tryk på Modelnummer, så vises A-nummeret, fx A2316, som afgør præcis hvilken generation du har. Det er særligt nyttigt på de ældre modeller, hvor navnet ikke fortæller hele historien.",
      "Kig på skærmens kanter og hjørner, hvor skader typisk sidder. Skriv, om Apple Pencil, tastaturcover eller oplader følger med, så kan vi tage det med i vurderingen. Har iPad'en fået ny skærm eller nyt batteri, er det heller ikke et problem, så længe det står i beskrivelsen.",
    ],
    coverageHeading: "Hvilke iPads kan du få vurderet",
    coverage:
      "Formularen kender iPad Pro (11 og 13 tommer, M2 og M4), iPad Air (M1 og M2), iPad (9. og 10. gen) og iPad mini (6. og 7. gen). Har du en anden generation, kan du skrive modellen selv.",
    faq: [
      {
        question: "Hvordan logger jeg ud og nulstiller min iPad?",
        answer:
          "Tryk på dit navn øverst i Indstillinger, og vælg Log ud. Det slår Find min iPad og aktiveringslåsen fra. Derefter vælger du Generelt, Overfør eller nulstil iPad, Slet alt indhold og alle indstillinger. Tag backup først, for sletningen kan ikke fortrydes.",
      },
      {
        question: "Kan jeg sælge en iPad fra arbejde eller skole?",
        answer:
          "Kun hvis den ikke længere er administreret. Står der en profil under Indstillinger, Generelt, VPN og enhedsstyring, er iPad'en tilknyttet en organisation, og kun administratoren kan frigive den. Uden frigivelse kan vi ikke købe den.",
      },
      {
        question: "Har det betydning, om min iPad har mobilforbindelse?",
        answer:
          "Ja, det er to forskellige varianter, og de vurderes hver for sig. Skriv i formularen, om din er Wi-Fi eller Wi-Fi + Cellular. Har den et SIM-kort eller eSIM, så fjern det eller slet profilen, før du afleverer.",
      },
      {
        question: "Hvordan finder jeg ud af, hvilken iPad jeg har?",
        answer:
          "Gå til Indstillinger, Generelt, Om, og se Modelnavn og Modelnummer. Tryk på modelnummeret for at få A-nummeret. Det står også med små bogstaver på bagsiden af iPad'en. Med A-nummeret kan du slå generationen op, hvis navnet ikke er tydeligt.",
      },
      {
        question: "Hvad skal jeg skrive, hvis skærmen er ridset eller revnet?",
        answer:
          "Skriv, om det er overfladeridser eller revner i glasset, og om touch virker over hele skærmen. Oplys også, hvis skærmen har misfarvede områder eller en lysplet. Virker iPad'en ikke, kan du stadig sende en beskrivelse; vi ser på, om den kan købes.",
      },
    ],
    blogSlugs: [],
    linkLabel: "iPad",
  },
  {
    slug: "macbook",
    name: "MacBook",
    title: "Sælg MacBook: fast pris og udbetaling | PhoneSpot",
    metaDescription:
      "Sælg din brugte MacBook Air eller MacBook Pro til PhoneSpot. Oplys model, chip, hukommelse og stand, så vender vi tilbage med et tilbud. Log ud af iCloud først.",
    eyebrow: "Sælg MacBook",
    h1: "Sælg din MacBook",
    answer:
      "Du sælger din MacBook ved at oplyse model, hukommelse, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud. Du afleverer i Vejle eller Slagelse eller sender den efter aftale.",
    wizardPreset: { deviceType: "Laptop", brand: "Apple" },
    bodyHeading: "Det skal vi vide om din MacBook",
    body: [
      "For en MacBook er modellen kun begyndelsen. Chip, arbejdshukommelse og lagerplads afgør meget, og de kan ikke ændres bagefter. En MacBook Air med 8 GB hukommelse og en med 16 GB hedder det samme, men er ikke det samme at sælge.",
      "Apple-menuen og Om denne Mac viser model, år og chip. Batteriets alder finder du under Systeminformation, Strøm, hvor Antal cyklusser og Tilstand står. En MacBook med få cyklusser og en Tilstand på Normal er lettere at give en god vurdering.",
      "Beskriv også skærmen (pletter og slidt belægning), tastatur og trackpad, kabinettets buler og om opladeren følger med. Har tastaturet været skiftet, eller har batteriet fået service, så skriv det også. Kommer computeren med original oplader, er den enklere at komme videre med.",
    ],
    coverageHeading: "Hvilke MacBooks kan du få vurderet",
    coverage:
      "Formularen kender MacBook Air (13 og 15 tommer, M2 og M3) og MacBook Pro (14 og 16 tommer, M2, M3 og M4). Har du en ældre MacBook, kan du skrive modellen selv, og vi vurderer den konkret.",
    faq: [
      {
        question: "Hvordan logger jeg ud af iCloud og Find min Mac?",
        answer:
          "Åbn Systemindstillinger, vælg dit navn øverst og tryk Log ud. Det slår Find min Mac og aktiveringslåsen fra. Log også ud af Beskeder og FaceTime, og fjern Bluetooth-enheder, du har parret. Slet først derefter computeren.",
      },
      {
        question: "Hvordan sletter jeg min MacBook, så den er klar til en ny ejer?",
        answer:
          "Har du en Mac med Apple-chip og macOS Ventura eller nyere, vælger du Systemindstillinger, Generelt, Overfør eller nulstil, Slet alt indhold og alle indstillinger. På ældre Macs starter du i genoprettelsestilstand, sletter disken i Diskværktøj og installerer macOS igen. Tag backup først, fx med Time Machine.",
      },
      {
        question: "Hvad hvis computeren er fra arbejde eller har en firmware-adgangskode?",
        answer:
          "En Mac, der er administreret af en virksomhed (MDM), skal frigives af administratoren, før den kan sælges. En Intel-Mac kan have en firmware-adgangskode, som kun du kan fjerne. Er computeren låst på en af de to måder, kan vi ikke købe den.",
      },
      {
        question: "Hvordan ser jeg batteriets tilstand og antal cyklusser?",
        answer:
          "Hold Alt nede, tryk på Apple-menuen, og vælg Systeminformation. Under Strøm står Antal cyklusser og Tilstand. En Normal tilstand med få hundrede cyklusser er det, du skal sigte efter at kunne oplyse. Står der Service anbefales, skal du skrive det.",
      },
      {
        question: "Betyder det noget, om opladeren og emballagen følger med?",
        answer:
          "Opladeren er en fordel, og du skal skrive, om den er original. Emballagen er mindre vigtig. Mere afgørende er kabinettets stand, skærmen og om alle porte, tastaturet og trackpad virker. Skriv også, hvis tastaturet har en tast, der hænger.",
      },
    ],
    blogSlugs: [],
    linkLabel: "MacBook",
  },
  {
    slug: "apple-watch",
    name: "Apple Watch",
    title: "Sælg Apple Watch: fast pris | PhoneSpot",
    metaDescription:
      "Sælg dit brugte Apple Watch (Series, SE eller Ultra) til PhoneSpot. Fjern parringen først, så er aktiveringslåsen væk. Aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg Apple Watch",
    h1: "Sælg dit Apple Watch",
    answer:
      "Du sælger dit Apple Watch ved at vælge model og beskrive stand i formularen. Vi vender tilbage med et tilbud efter vores gennemgang. Fjern parringen med din iPhone først, ellers sidder aktiveringslåsen stadig på uret.",
    wizardPreset: { deviceType: "Smartwatch", brand: "Apple" },
    bodyHeading: "Små detaljer, der tæller på et ur",
    body: [
      "Et Apple Watch bliver brugt hele dagen, så stand og batteri er de to ting, der adskiller et godt ur fra et slidt. Batteriets tilstand kan du se på uret under Indstillinger, Batteri, Batterisundhed. Viser den maksimal kapacitet, så skriv tallet.",
      "Modellen og størrelsen står under Indstillinger, Generelt, Om på selve uret. Kabinettet kan være aluminium, rustfrit stål eller titanium, og materialet er en del af, hvad der gør to Series 9 forskellige. Har uret mobilforbindelse, har det en Mobil-menu i Indstillinger.",
      "Kig på glasset og kanten rundt om. De små ridser kommer fra bordkanter og dørkarme, og det er dem, vi spørger om i formularen. Skriv, om remmen og opladeren følger med. Er glasset skiftet, eller har uret været åbnet, så nævn det. Det er bedre, at vi hører det fra dig, end at vi finder det ved gennemgangen.",
    ],
    coverageHeading: "Hvilke ure kan du få vurderet",
    coverage:
      "Formularen kender Apple Watch Series 6 til Series 10, SE (1. og 2. gen) og Ultra 2. Vi tager også Samsung Galaxy Watch; vælg Samsung som mærke i formularen.",
    faq: [
      {
        question: "Hvordan fjerner jeg parringen med min iPhone?",
        answer:
          "Hold uret og iPhone tæt på hinanden, åbn Watch-appen, vælg Mit ur, Alle ure, og tryk på i-symbolet ved dit ur. Vælg Fjern parring med Apple Watch. Det fjerner også aktiveringslåsen og tager en backup af uret. Har du mobilforbindelse, bliver du spurgt, om abonnementet skal beholdes.",
      },
      {
        question: "Jeg har ikke min iPhone længere. Hvad gør jeg?",
        answer:
          "Nulstil uret under Indstillinger, Generelt, Nulstil, Slet alt indhold og alle indstillinger. Er der stadig aktiveringslås, kan du fjerne uret fra din konto på icloud.com/find under Alle enheder. Uret kan ikke købes, så længe låsen sidder på.",
      },
      {
        question: "Har størrelse og GPS eller Cellular betydning?",
        answer:
          "Ja. Størrelsen (fx 41 eller 45 mm) og om uret har mobilforbindelse er forskellige varianter, og de skal stå i beskrivelsen. Har uret en Mobil-menu i Indstillinger, er det Cellular-varianten. Tjek, at mobilabonnementet er afsluttet hos din teleudbyder.",
      },
      {
        question: "Hvordan ser jeg batterisundheden på mit ur?",
        answer:
          "Åbn Indstillinger på uret, vælg Batteri og dernæst Batterisundhed. Her står maksimal kapacitet i procent. Er den lav, så skriv det i formularen. Et ur, der ikke holder en dag, er værd at oplyse om, og vi vurderer det som en del af standen.",
      },
      {
        question: "Køber I også Samsung Galaxy Watch?",
        answer:
          "Ja. Vælg Smartwatch og derefter Samsung i formularen. Her gælder de samme trin som på telefonen: Fjern Google- og Samsung-kontoen, nulstil uret, og fjern parringen med din Samsung-telefon, før du afleverer det.",
      },
    ],
    blogSlugs: [],
    linkLabel: "Apple Watch",
  },
];

export function getSellDevice(slug: string): SellDeviceConfig | undefined {
  return SELL_DEVICES.find((device) => device.slug === slug);
}
