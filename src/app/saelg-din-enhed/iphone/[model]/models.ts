/**
 * Indhold til siderne under /saelg-din-enhed/iphone/[model].
 *
 * Ingen priser her, med vilje: se kommentaren i ../../[device]/devices.ts.
 * Ældste iPhone, vi køber, er iPhone 11 (ejerbeslutning 2026-10-31). Defekte
 * iPhones købes, men fejlen skal oplyses i formularen på forhånd.
 */
import type { SellFaq, SellLandingContent } from "@/components/sell-device/sell-landing-page";

export type IphoneSellPage = SellLandingContent & {
  slug: string;
  /** Navn i brødkrummer og JSON-LD. */
  name: string;
  /** Under 60 tegn, starter med "Sælg ...". */
  title: string;
  metaDescription: string;
  linkLabel: string;
};

const PRESET = { deviceType: "Telefon", brand: "Apple" };
const BLOGS = ["hvad-er-din-brugte-iphone-vaerd", "saelg-iphone-med-oedelagt-skaerm"];

function defectFaq(model: string): SellFaq {
  return {
    question: `Køber I en defekt ${model}?`,
    answer: `Ja, også når noget ikke virker. Vælg Nej ved Fungerer alt? i formularen, og markér det, der fejler, så vi kender fejlen på forhånd. Vi vurderer hver telefon for sig, og en aktiveringslåst ${model} kan vi ikke købe.`,
  };
}

function worthFaq(model: string, detail: string): SellFaq {
  return {
    question: `Hvad er min ${model} værd?`,
    answer: `Det afhænger af den præcise model, lagerplads, stand og batteri. ${detail} Du får et konkret tilbud, når vi har gennemgået dine oplysninger, og siger du ja, holder prisen, medmindre telefonen afviger fra din beskrivelse.`,
  };
}

const FAMILY_PAGES: IphoneSellPage[] = [
  {
    slug: "iphone-18",
    name: "iPhone 18 Pro og Duo",
    title: "Sælg iPhone 18 Pro eller iPhone Duo | PhoneSpot",
    metaDescription:
      "Sælg din iPhone 18 Pro, 18 Pro Max eller iPhone Duo til PhoneSpot. Gem kvitteringen, beskriv standen, og få et tilbud. Aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg iPhone 18",
    h1: "Sælg din iPhone 18 Pro eller iPhone Duo",
    answer:
      "Du sælger din iPhone 18 Pro, 18 Pro Max eller iPhone Duo ved at vælge model, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud, og du kan aflevere telefonen i Vejle eller Slagelse.",
    wizardPreset: PRESET,
    bodyHeading: "Så ny en iPhone kræver ekstra oplysninger",
    body: [
      "18 Pro og 18 Pro Max kom i handlen i september 2026, og iPhone Duo fulgte i oktober. Telefonerne er så nye, at små forskelle tæller: en ubrugt telefon, en telefon med et par uger på bagen og en telefon med skrammer på rammen er tre forskellige handler. Fortæl præcist, hvordan den er blevet brugt.",
      "Gem kvitteringen, og skriv i formularen, om der er tegnet AppleCare, og hvor telefonen er købt. Følger der kabel og andet ekstra med, så skriv også det. Har du købt telefonen på afbetaling hos et teleselskab, skal den være betalt ud, før du sælger den.",
      "På iPhone Duo er det folden, vi kigger mest på. Beskriv den indvendige skærm, hængslet, og om telefonen lukker tæt. Streger, bobler eller en ujævn fold skal med i beskrivelsen, også når de er små. Kig også på den ydre skærm og rammen i titanium.",
    ],
    coverageHeading: "Hvilke modeller dækker siden",
    coverage: "Siden dækker iPhone 18 Pro, iPhone 18 Pro Max og den foldbare iPhone Duo, som du kan vælge direkte i formularen.",
    faqHeading: "Spørgsmål om at sælge iPhone 18 og Duo",
    faq: [
      worthFaq("iPhone 18 Pro", "På så ny en model betyder det også noget, om du har kvitteringen, og om telefonen næsten er ubrugt."),
      {
        question: "Kan jeg sælge en iPhone Duo med mærker i folden?",
        answer:
          "Du kan sende den til vurdering. Foldeskærmen er den dyreste del, så beskriv mærkerne så præcist som muligt, og sig, om berøringen virker hen over hele skærmen. Sæt aldrig hærdet glas på den indvendige skærm, inden du sender den.",
      },
      {
        question: "Jeg har købt telefonen på afbetaling. Kan jeg sælge den?",
        answer:
          "Først når den er betalt ud. Tjek med dit teleselskab, hvad der mangler, og om telefonen er låst til deres net. Skriv det i kommentarfeltet, hvis du er i tvivl.",
      },
      defectFaq("iPhone 18 Pro"),
    ],
    blogSlugs: ["iphone-18-pro-reparation-teardown", "hvad-er-din-brugte-iphone-vaerd"],
    linkLabel: "iPhone 18 Pro og Duo",
  },
  {
    slug: "iphone-17",
    name: "iPhone 17",
    title: "Sælg iPhone 17, 17 Pro eller iPhone Air | PhoneSpot",
    metaDescription:
      "Sælg din iPhone 17, 17 Pro, 17 Pro Max, 17e eller iPhone Air til PhoneSpot. Vælg model og stand, og få et tilbud. Aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg iPhone 17",
    h1: "Sælg din iPhone 17",
    answer:
      "Vil du sælge en iPhone 17, 17 Pro, 17 Pro Max, 17e eller iPhone Air, vælger du modellen i formularen og beskriver standen. Vi gennemgår oplysningerne og vender tilbage med et tilbud. Aflever i Vejle eller Slagelse, eller send efter aftale.",
    wizardPreset: PRESET,
    bodyHeading: "17-serien spænder bredt",
    body: [
      "Serien er ikke én telefon. iPhone 17 Pro og Pro Max har aluminiumsramme og findes med op til 1 TB, Pro Max også med 2 TB. iPhone Air er den tynde model, og almindelig iPhone 17 starter ved 256 GB. Vælg derfor den rigtige model og lagerplads, for det er her, den største forskel i værdi ligger.",
      "Aluminiumsrammen på Pro-modellerne kan få synlige mærker på kanterne og omkring kameraplateauet. Kig på telefonen i godt lys, og skriv, hvad du ser. Små mærker kommer under Små ridser i formularen, men dybe hak og bulede hjørner skal stå i kommentarfeltet.",
      "iPhone Air bruger kun eSIM. Flyt derfor dit abonnement til din nye telefon, før du nulstiller Air. Det samme gælder alle andre iPhones med eSIM. Batteriet kan du tjekke under Indstillinger, Batteri, hvor du også kan se antallet af opladninger.",
    ],
    coverageHeading: "Hvilke modeller dækker siden",
    coverage: "Siden dækker iPhone 17, iPhone 17e, iPhone 17 Pro, iPhone 17 Pro Max og iPhone Air. Alle fem står i formularens modelliste.",
    faqHeading: "Spørgsmål om at sælge iPhone 17",
    faq: [
      worthFaq("iPhone 17", "Forskellen mellem 17e, 17, Air og Pro er stor, så vælg den rigtige model."),
      {
        question: "Hvad gør jeg med eSIM på iPhone Air?",
        answer:
          "Få eSIM overført til din nye telefon, før du nulstiller den gamle. Air har ingen SIM-skuffe, så en nulstilling kan efterlade dig uden aktivt nummer. Dit teleselskab kan hjælpe, hvis overførslen driller.",
      },
      {
        question: "Kan jeg sælge en iPhone 17 Pro med mærker på rammen?",
        answer:
          "Ja. Mærker på rammen er almindelige, og du skal blot beskrive dem. Vælg den stand, der passer bedst, og skriv om dybe hak i kommentarfeltet. Så undgår du, at vi må vende tilbage med en ændring efter gennemgangen.",
      },
      defectFaq("iPhone 17"),
    ],
    blogSlugs: BLOGS,
    linkLabel: "iPhone 17",
  },
  {
    slug: "iphone-16",
    name: "iPhone 16",
    title: "Sælg iPhone 16, 16 Plus, 16 Pro eller 16e | PhoneSpot",
    metaDescription:
      "Sælg din iPhone 16, 16 Plus, 16 Pro, 16 Pro Max eller 16e til PhoneSpot. Beskriv standen, og få et tilbud. Aflever i Vejle eller Slagelse eller send efter aftale.",
    eyebrow: "Sælg iPhone 16",
    h1: "Sælg din iPhone 16",
    answer:
      "Du sælger din iPhone 16 ved at vælge den præcise model, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud. Du kan aflevere telefonen i Vejle eller Slagelse eller sende den efter aftale.",
    wizardPreset: PRESET,
    bodyHeading: "Tjek de nye knapper, før du sender",
    body: [
      "iPhone 16, 16 Plus, 16 Pro og 16 Pro Max har Kamerakontrol på siden og Handlingsknappen i stedet for lydløs-knappen. Tryk på begge, før du udfylder formularen. Virker en af dem ikke, så vælg Nej ved Fungerer alt? og markér Knapper.",
      "iPhone 16e er en anden telefon end resten af serien. Den har ét kamera bagpå, og den har hverken Kamerakontrol eller MagSafe. Vælg derfor 16e i listen og ikke almindelig 16, for de to ligger forskelligt i værdi.",
      "16 Pro findes fra 128 GB til 1 TB, mens Pro Max starter ved 256 GB. Lagerpladsen ser du under Indstillinger, Generelt, iPhone-lagerplads. Batteriet tjekker du under Indstillinger, Batteri, og her kan du også se antallet af opladninger, som er nyttigt at skrive i kommentarfeltet.",
    ],
    coverageHeading: "Hvilke modeller dækker siden",
    coverage: "Siden dækker iPhone 16, iPhone 16 Plus, iPhone 16 Pro, iPhone 16 Pro Max og iPhone 16e. Alle står i formularens modelliste.",
    faqHeading: "Spørgsmål om at sælge iPhone 16",
    faq: [
      worthFaq("iPhone 16", "En Pro med stor lagerplads ligger et helt andet sted end en 16e med 128 GB."),
      {
        question: "Bør jeg sælge min iPhone 16 nu, hvor iPhone 18 er kommet?",
        answer:
          "Værdien af brugte telefoner falder typisk, efterhånden som der kommer nye modeller. Bruger du ikke telefonen, er der sjældent noget at vinde ved at vente. Bruger du den stadig, er det bedre at beholde den, til du har brug for at skifte.",
      },
      {
        question: "Hvordan ser jeg, om det er en 16 eller en 16e?",
        answer:
          "Se under Indstillinger, Generelt, Om, hvor modelnavnet står. Du kan også kigge bagpå: 16e har ét kamera, mens almindelig iPhone 16 har to.",
      },
      defectFaq("iPhone 16"),
    ],
    blogSlugs: ["iphone-16-vs-iphone-15-sammenligning", ...BLOGS],
    linkLabel: "iPhone 16",
  },
  {
    slug: "iphone-15",
    name: "iPhone 15",
    title: "Sælg iPhone 15, 15 Plus, 15 Pro eller Pro Max | PhoneSpot",
    metaDescription:
      "Sælg din iPhone 15, 15 Plus, 15 Pro eller 15 Pro Max til PhoneSpot. Tjek USB-C-porten, beskriv standen, og få et tilbud. Aflever i Vejle eller Slagelse.",
    eyebrow: "Sælg iPhone 15",
    h1: "Sælg din iPhone 15",
    answer:
      "Vil du sælge din iPhone 15, 15 Plus, 15 Pro eller 15 Pro Max, vælger du model, lagerplads og stand i formularen. Vi vender tilbage med et tilbud efter vores gennemgang, og du kan aflevere telefonen i Vejle eller Slagelse.",
    wizardPreset: PRESET,
    bodyHeading: "Første iPhone med USB-C",
    body: [
      "iPhone 15 var den første iPhone med USB-C. Lader telefonen langsomt eller kun i bestemte vinkler, så prøv et andet kabel, og rens forsigtigt porten for lommefnug. Hjælper det ikke, så markér Opladning i formularen. Det er bedre at skrive det nu end at få det frem ved gennemgangen.",
      "15 Pro og 15 Pro Max har ramme i titanium og Handlingsknap, mens 15 og 15 Plus har aluminiumsramme og lydløs-knap. Pro Max starter ved 256 GB, og 15 Pro findes op til 1 TB. Modelnavn og lagerplads finder du under Indstillinger, Generelt, Om.",
      "Fra iPhone 15 kan du se antal opladninger under Indstillinger, Batteri. Har du haft slået grænsen på 80 procent til, har batteriet ofte holdt sig pænt, og det er en god oplysning at give. Står maksimal kapacitet under 80 procent, så vælg det i formularen. Det gør tilbuddet mere præcist.",
    ],
    coverageHeading: "Hvilke modeller dækker siden",
    coverage: "Siden dækker iPhone 15, iPhone 15 Plus, iPhone 15 Pro og iPhone 15 Pro Max. Alle fire står i formularens modelliste.",
    faqHeading: "Spørgsmål om at sælge iPhone 15",
    faq: [
      worthFaq("iPhone 15", "Pro-modeller i titanium ligger højere end 15 og 15 Plus, og batteriet betyder meget på en telefon i den alder."),
      {
        question: "Hvad gør jeg, hvis min iPhone 15 ikke vil lade?",
        answer:
          "Prøv et andet kabel og en anden oplader, og se efter fnug i porten. Lader den stadig ikke, så vælg Nej ved Fungerer alt? og markér Opladning. Tænder telefonen slet ikke, markerer du Tænder ikke.",
      },
      {
        question: "Skal kablet med, når jeg sælger?",
        answer:
          "Det er ikke et krav. Følger der kabel med, så skriv det i formularen. Cover og skærmbeskyttelse skal du beholde.",
      },
      defectFaq("iPhone 15"),
    ],
    blogSlugs: ["iphone-16-vs-iphone-15-sammenligning", ...BLOGS],
    linkLabel: "iPhone 15",
  },
  {
    slug: "iphone-14",
    name: "iPhone 14",
    title: "Sælg iPhone 14, 14 Plus, 14 Pro eller Pro Max | PhoneSpot",
    metaDescription:
      "Sælg din iPhone 14, 14 Plus, 14 Pro eller 14 Pro Max til PhoneSpot. Tjek batteri og kamera, og få et tilbud efter vores gennemgang. Vejle, Slagelse eller med post.",
    eyebrow: "Sælg iPhone 14",
    h1: "Sælg din iPhone 14",
    answer:
      "Du sælger din iPhone 14 ved at vælge model, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud. Du afleverer telefonen i Vejle eller Slagelse eller sender den efter aftale.",
    wizardPreset: PRESET,
    bodyHeading: "To slags iPhone 14",
    body: [
      "14 og 14 Plus ligner iPhone 13 på forsiden med hak i skærmen, mens 14 Pro og Pro Max har Dynamic Island, skærm der altid er tændt, og 48 megapixel kamera. Forskellen er stor, også i værdi, så tjek modelnavnet under Indstillinger, Generelt, Om.",
      "En iPhone 14 er efterhånden nogle år gammel, og mange batterier nærmer sig 80 procent. Find tallet under Indstillinger, Batteri, Batteritilstand og opladning, og vælg det svar i formularen, der passer. Er batteriet allerede skiftet, så skriv det i kommentarfeltet, og fortæl, om det er gjort hos en reparatør.",
      "Bagglas og kameraglas får ofte små skader, som man ikke selv lægger mærke til. Tag telefonen ud af coveret, og kig på det i godt lys. Tag også et testbillede. Plamager eller et kamera, der ryster, skal med i beskrivelsen. Markér Kamera, hvis det ikke fungerer, som det skal.",
    ],
    coverageHeading: "Hvilke modeller dækker siden",
    coverage: "Siden dækker iPhone 14, iPhone 14 Plus, iPhone 14 Pro og iPhone 14 Pro Max. Alle fire står i formularens modelliste.",
    faqHeading: "Spørgsmål om at sælge iPhone 14",
    faq: [
      worthFaq("iPhone 14", "Batteriet og bagglasset er ofte det, der gør forskellen på en telefon i den alder."),
      {
        question: "Kan jeg sælge en iPhone 14 med revnet bagglas?",
        answer:
          "Ja. Vælg Revnet ved bagsiden i formularen. Skriv også, om kameraglasset er helt, og om telefonen stadig er tæt, hvis du ved det. Revner i bagglasset sænker værdien, men det stopper ikke et salg.",
      },
      {
        question: "Hvordan ser jeg, om min iPhone 14 er repareret?",
        answer:
          "Under Indstillinger, Generelt, Om viser iPhone, om dele som skærm og batteri er skiftet, når det er tilfældet. Står der noget, så skriv det i kommentarfeltet. En tidligere reparation stopper ikke et salg, men vi skal kende den.",
      },
      defectFaq("iPhone 14"),
    ],
    blogSlugs: BLOGS,
    linkLabel: "iPhone 14",
  },
  {
    slug: "iphone-13",
    name: "iPhone 13",
    title: "Sælg iPhone 13, 13 mini, 13 Pro eller Pro Max | PhoneSpot",
    metaDescription:
      "Sælg din iPhone 13, 13 mini, 13 Pro eller 13 Pro Max til PhoneSpot. Oplys batteri og lagerplads, og få et tilbud. Aflever i Vejle eller Slagelse eller send efter aftale.",
    eyebrow: "Sælg iPhone 13",
    h1: "Sælg din iPhone 13",
    answer:
      "Vil du sælge din iPhone 13, vælger du model, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud. Aflever telefonen i Vejle eller Slagelse, eller send den efter aftale.",
    wizardPreset: PRESET,
    bodyHeading: "Batteriet afgør meget på en iPhone 13",
    body: [
      "iPhone 13-serien kom i 2021, og det er batteriet, der oftest skiller en god telefon fra en slidt. Se maksimal kapacitet under Indstillinger, Batteri, Batteritilstand og opladning, og vælg det rigtige svar i formularen. Er du i tvivl, kan du vælge Ved ikke, så tjekker vi det.",
      "Serien har fire modeller. 13 mini og 13 har to kameraer, mens 13 Pro og 13 Pro Max har tre og en skærm med 120 Hz. Pro-modellerne findes også med 1 TB. Alle i serien starter ved 128 GB, så har du købt den billigste, er det sandsynligvis den størrelse, du har.",
      "Skærmen er det næste, vi kigger på. Vis et helt hvidt og et helt sort billede, og se efter pletter, streger eller grønlige områder. Tjek også Face ID, som kan holde op med at virke efter et fald eller en skærmreparation. Virker det ikke, så markér Face ID i formularen.",
    ],
    coverageHeading: "Hvilke modeller dækker siden",
    coverage: "Siden dækker iPhone 13, iPhone 13 mini, iPhone 13 Pro og iPhone 13 Pro Max. Alle fire står i formularens modelliste.",
    faqHeading: "Spørgsmål om at sælge iPhone 13",
    faq: [
      worthFaq("iPhone 13", "Pro-modellerne ligger højere end 13 og 13 mini, og batteriet kan flytte vurderingen en del."),
      {
        question: "Kan jeg sælge en iPhone 13 med dårligt batteri?",
        answer:
          "Ja. Oplys tallet i formularen, så trækker vi det med i vurderingen. Du behøver ikke skifte batteriet først, for vi kan selv gøre det, før telefonen sælges videre.",
      },
      {
        question: "Face ID virker ikke på min iPhone 13. Kan jeg stadig sælge den?",
        answer:
          "Ja, men skriv det. Vælg Nej ved Fungerer alt? og markér Face ID. Fortæl også, om telefonen har haft ny skærm eller har været tabt, for det hjælper os med at finde årsagen.",
      },
      defectFaq("iPhone 13"),
    ],
    blogSlugs: BLOGS,
    linkLabel: "iPhone 13",
  },
  {
    slug: "iphone-12",
    name: "iPhone 12",
    title: "Sælg iPhone 12, 12 mini, 12 Pro eller Pro Max | PhoneSpot",
    metaDescription:
      "Sælg din iPhone 12, 12 mini, 12 Pro eller 12 Pro Max til PhoneSpot. Beskriv stand og batteri, og få et tilbud. Aflever i Vejle eller Slagelse eller send efter aftale.",
    eyebrow: "Sælg iPhone 12",
    h1: "Sælg din iPhone 12",
    answer:
      "Du sælger din iPhone 12 ved at vælge model, lagerplads og stand i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud, og du kan aflevere telefonen i Vejle eller Slagelse eller sende den efter aftale.",
    wizardPreset: PRESET,
    bodyHeading: "Stadig en god telefon at give videre",
    body: [
      "iPhone 12-serien kom i 2020 med 5G, OLED-skærm på alle modeller og MagSafe på bagsiden. Den er stadig en brugbar telefon for en ny ejer, men alderen kan ses, så en ærlig beskrivelse er vigtig. Almindelig 12 og 12 mini findes med 64, 128 og 256 GB, og Pro-modellerne med 128, 256 og 512 GB.",
      "Modellerne har kanter, der er flade og lette at slå skår i. Se særligt efter hjørnerne og bagsiden, og fortæl om buler i rammen. Ramme og bagside på 12 Pro er stål og glas, hvor små ridser i stålet er meget almindelige og ikke noget, du behøver bekymre dig om.",
      "Efter fem-seks års brug er det normalt, at batteriet er slidt. Har du fået det skiftet, så skriv hvornår. Tjek også højttaleren ved at afspille lyd, og ring til nogen for at høre, om mikrofonen virker. Markér det i formularen, hvis noget lyder dårligt.",
    ],
    coverageHeading: "Hvilke modeller dækker siden",
    coverage: "Siden dækker iPhone 12, iPhone 12 mini, iPhone 12 Pro og iPhone 12 Pro Max. Alle fire står i formularens modelliste.",
    faqHeading: "Spørgsmål om at sælge iPhone 12",
    faq: [
      worthFaq("iPhone 12", "Lagerplads tæller her, for mange ejer en 64 GB, som er for lille til de fleste nye købere."),
      {
        question: "Er min iPhone 12 for gammel til, at I vil købe den?",
        answer:
          "Nej. Vi køber iPhone 11 og nyere, så iPhone 12 er med. Hvor meget den er værd, afhænger af stand, batteri og lagerplads, og det får du svar på i vores tilbud.",
      },
      {
        question: "Hvad betyder det, at min iPhone 12 kun har 64 GB?",
        answer:
          "Telefonen kan stadig sælges, men den er mindre attraktiv for en ny ejer end samme model med 128 GB. Vælg den rigtige størrelse i formularen, så passer tilbuddet.",
      },
      defectFaq("iPhone 12"),
    ],
    blogSlugs: BLOGS,
    linkLabel: "iPhone 12",
  },
  {
    slug: "iphone-11",
    name: "iPhone 11",
    title: "Sælg iPhone 11, 11 Pro eller 11 Pro Max | PhoneSpot",
    metaDescription:
      "Sælg din iPhone 11, 11 Pro eller 11 Pro Max til PhoneSpot. iPhone 11 er den ældste model, vi køber. Beskriv standen, og få et tilbud efter vores gennemgang.",
    eyebrow: "Sælg iPhone 11",
    h1: "Sælg din iPhone 11",
    answer:
      "iPhone 11 er den ældste iPhone, vi køber. Du vælger model, lagerplads og stand i formularen, og vi vender tilbage med et tilbud efter vores gennemgang. Aflever telefonen i Vejle eller Slagelse, eller send den efter aftale.",
    wizardPreset: PRESET,
    bodyHeading: "Det kigger vi på, når telefonen er fra 2019",
    body: [
      "iPhone 11, 11 Pro og 11 Pro Max kom i 2019. De er de ældste iPhones, vi køber, og på en telefon i den alder er stand og batteri afgørende. Almindelig 11 har LCD-skærm og findes med 64, 128 og 256 GB. Pro-modellerne har OLED-skærm og findes med 64, 256 og 512 GB.",
      "Hvis skærmen er skiftet på et tidspunkt, kan det ses under Indstillinger, Generelt, Om, hvor iPhone viser oplysninger om dele og service. Mange telefoner fra 2019 har fået ny skærm eller nyt batteri, så det er ikke et problem i sig selv. Skriv blot, hvad du ved, så stemmer tilbuddet bedre.",
      "Tjek opladning, højttalere, kamera og Face ID, før du udfylder formularen. Lightning-porten kan blive slidt med årene, og et løst kabel er ofte tegn på fnug i porten. Tænder telefonen slet ikke, kan du stadig sende den til vurdering. Markér Tænder ikke, og skriv, hvad der skete.",
    ],
    coverageHeading: "Hvilke modeller dækker siden",
    coverage: "Siden dækker iPhone 11, iPhone 11 Pro og iPhone 11 Pro Max. Ældre modeller som iPhone X, XR og XS køber vi ikke.",
    faqHeading: "Spørgsmål om at sælge iPhone 11",
    faq: [
      worthFaq("iPhone 11", "På en model fra 2019 betyder batteri, skærm og lagerplads særligt meget."),
      {
        question: "Køber I ældre iPhones end iPhone 11?",
        answer:
          "Nej, iPhone 11 er grænsen. iPhone X, XS og XR køber vi ikke. Vil du af med en ældre telefon, så husk at slette dine data og aflevere den til genbrug i din kommune.",
      },
      {
        question: "Min iPhone 11 tænder ikke. Kan I stadig bruge den?",
        answer:
          "Det kan vi ofte vurdere. Vælg Nej ved Fungerer alt? og markér Tænder ikke. Fortæl, hvad der skete, fx om den har været tabt eller våd, og om den er låst til en Apple-konto.",
      },
      defectFaq("iPhone 11"),
    ],
    blogSlugs: BLOGS,
    linkLabel: "iPhone 11",
  },
  {
    slug: "defekt",
    name: "Defekt iPhone",
    title: "Sælg defekt iPhone: oplys fejlen, få et tilbud | PhoneSpot",
    metaDescription:
      "Sælg din defekte iPhone 11 eller nyere til PhoneSpot. Revnet skærm, dårligt batteri eller en telefon, der ikke tænder: oplys fejlen, og få et tilbud.",
    eyebrow: "Sælg defekt iPhone",
    h1: "Sælg din defekte iPhone",
    answer:
      "Vi køber defekte iPhones fra iPhone 11 og nyere, så længe vi kender fejlen på forhånd. Markér, hvad der ikke virker, i formularen. Vi gennemgår oplysningerne og vender tilbage med et tilbud, eller et afslag, hvis telefonen ikke kan bruges.",
    wizardPreset: PRESET,
    bodyHeading: "Sådan beskriver du fejlen",
    body: [
      "Jo mere vi ved, jo mere præcist bliver tilbuddet. Vælg først skærmens og bagsidens stand. Svar derefter Nej ved Fungerer alt?, og markér det, der ikke virker: kamera, højttaler, mikrofon, WiFi, Bluetooth, opladning, knapper, Face ID, eller at telefonen slet ikke tænder. Passer intet, vælger du Andet og forklarer det i kommentarfeltet.",
      "Fortæl også, hvad der skete. En telefon, der er tabt, en telefon, der har været i vand, og en telefon, som gradvist er blevet dårligere, er tre forskellige sager, selv om fejlen ser ens ud. Er telefonen repareret før, så skriv hvor, og hvad der blev skiftet.",
      "En aktiveringslåst iPhone kan vi ikke købe. Log ud af din Apple-konto, hvis du kan. Virker skærmen ikke, kan du i stedet fjerne telefonen fra din konto på icloud.com/find. Tænder den ikke, så skriv det, så ser vi på det sammen med dig, når du har sendt formularen.",
    ],
    coverageHeading: "Hvilke defekte iPhones køber vi",
    coverage:
      "Vi vurderer defekte iPhones fra iPhone 11 og nyere samt SE (2. og 3. gen). Vi kan ikke love at købe alle: er skaden for stor, eller er telefonen låst, får du et afslag og et forslag til, hvad du kan gøre. Stemmer telefonen ikke med din beskrivelse, får du et nyt tilbud eller får den gratis retur.",
    faqHeading: "Spørgsmål om at sælge en defekt iPhone",
    faq: [
      {
        question: "Kan det betale sig at reparere min iPhone, før jeg sælger den?",
        answer:
          "Det afhænger af model og fejl. Sammenlign, hvad telefonen er værd i god stand med prisen for at reparere den. Ofte er det bedre at sælge telefonen, som den er. Vores indlæg nedenfor viser regnestykket.",
      },
      {
        question: "Køber I en iPhone med vandskade?",
        answer:
          "Skriv, hvad der skete, og hvad der virker nu, så vurderer vi den konkrete telefon. Vandskader kan gemme sig og vise sig senere, så vi kan ikke love at købe alle. Sluk telefonen, og lad være med at oplade den, hvis den stadig er våd.",
      },
      {
        question: "Min iPhone tænder ikke. Hvordan sletter jeg mine data?",
        answer:
          "Log ind på icloud.com/find, vælg telefonen, og slet den, hvis du kan. Sørg for, at den også er fjernet fra din konto. Står du fast, så skriv det i formularen, så tager vi det med dig, før du sender telefonen.",
      },
      {
        question: "Hvad sker der, hvis der er flere fejl, end jeg troede?",
        answer:
          "Finder vi noget, der afviger fra din beskrivelse, får du et nyt tilbud, før vi køber telefonen. Siger du nej, sender vi den gratis retur.",
      },
    ],
    blogSlugs: ["saelg-iphone-med-oedelagt-skaerm", "iphone-faldt-i-vand"],
    linkLabel: "Defekt iPhone",
  },
];

type ModelVariant = {
  family: string;
  slug: string;
  name: string;
  /** Faktaafsnit, der er særligt for netop denne model. */
  intro: string;
};

const VARIANTS: ModelVariant[] = [
  { family: "iphone-11", slug: "iphone-11-pro", name: "iPhone 11 Pro", intro: "iPhone 11 Pro har 5,8 tommer OLED-skærm, tre kameraer og findes med 64, 256 og 512 GB." },
  { family: "iphone-11", slug: "iphone-11-pro-max", name: "iPhone 11 Pro Max", intro: "iPhone 11 Pro Max har 6,5 tommer OLED-skærm, tre kameraer og findes med 64, 256 og 512 GB." },
  { family: "iphone-12", slug: "iphone-12-mini", name: "iPhone 12 mini", intro: "iPhone 12 mini har 5,4 tommer OLED-skærm, to kameraer og findes med 64, 128 og 256 GB." },
  { family: "iphone-12", slug: "iphone-12-pro", name: "iPhone 12 Pro", intro: "iPhone 12 Pro har 6,1 tommer OLED-skærm, tre kameraer, ramme i stål og findes med 128, 256 og 512 GB." },
  { family: "iphone-12", slug: "iphone-12-pro-max", name: "iPhone 12 Pro Max", intro: "iPhone 12 Pro Max har 6,7 tommer OLED-skærm, tre kameraer, ramme i stål og findes med 128, 256 og 512 GB." },
  { family: "iphone-13", slug: "iphone-13-mini", name: "iPhone 13 mini", intro: "iPhone 13 mini har 5,4 tommer skærm, to kameraer og findes med 128, 256 og 512 GB." },
  { family: "iphone-13", slug: "iphone-13-pro", name: "iPhone 13 Pro", intro: "iPhone 13 Pro har 6,1 tommer skærm med 120 Hz, tre kameraer og findes med 128, 256 og 512 GB samt 1 TB." },
  { family: "iphone-13", slug: "iphone-13-pro-max", name: "iPhone 13 Pro Max", intro: "iPhone 13 Pro Max har 6,7 tommer skærm med 120 Hz, tre kameraer og findes med 128, 256 og 512 GB samt 1 TB." },
  { family: "iphone-14", slug: "iphone-14-plus", name: "iPhone 14 Plus", intro: "iPhone 14 Plus har 6,7 tommer skærm, to kameraer og findes med 128, 256 og 512 GB." },
  { family: "iphone-14", slug: "iphone-14-pro", name: "iPhone 14 Pro", intro: "iPhone 14 Pro har 6,1 tommer skærm med Dynamic Island, 48 megapixel kamera og findes med 128, 256 og 512 GB samt 1 TB." },
  { family: "iphone-14", slug: "iphone-14-pro-max", name: "iPhone 14 Pro Max", intro: "iPhone 14 Pro Max har 6,7 tommer skærm med Dynamic Island, 48 megapixel kamera og findes med 128, 256 og 512 GB samt 1 TB." },
  { family: "iphone-15", slug: "iphone-15-plus", name: "iPhone 15 Plus", intro: "iPhone 15 Plus har 6,7 tommer skærm, USB-C og findes med 128, 256 og 512 GB." },
  { family: "iphone-15", slug: "iphone-15-pro", name: "iPhone 15 Pro", intro: "iPhone 15 Pro har 6,1 tommer skærm, ramme i titanium og findes med 128, 256 og 512 GB samt 1 TB." },
  { family: "iphone-15", slug: "iphone-15-pro-max", name: "iPhone 15 Pro Max", intro: "iPhone 15 Pro Max har 6,7 tommer skærm, ramme i titanium og findes med 256 og 512 GB samt 1 TB." },
  { family: "iphone-16", slug: "iphone-16-plus", name: "iPhone 16 Plus", intro: "iPhone 16 Plus har 6,7 tommer skærm, Kamerakontrol og findes med 128, 256 og 512 GB." },
  { family: "iphone-16", slug: "iphone-16e", name: "iPhone 16e", intro: "iPhone 16e har 6,1 tommer skærm, ét kamera bagpå og findes med 128, 256 og 512 GB." },
  { family: "iphone-16", slug: "iphone-16-pro", name: "iPhone 16 Pro", intro: "iPhone 16 Pro har 6,3 tommer skærm, ramme i titanium og findes med 128, 256 og 512 GB samt 1 TB." },
  { family: "iphone-16", slug: "iphone-16-pro-max", name: "iPhone 16 Pro Max", intro: "iPhone 16 Pro Max har 6,9 tommer skærm, ramme i titanium og findes med 256 og 512 GB samt 1 TB." },
  { family: "iphone-17", slug: "iphone-17e", name: "iPhone 17e", intro: "iPhone 17e er den billigste model i 17-serien, så vælg den og ikke almindelig iPhone 17 i formularen." },
  { family: "iphone-17", slug: "iphone-air", name: "iPhone Air", intro: "iPhone Air er den tynde model med ét kamera bagpå, kun eSIM og findes med 256 og 512 GB samt 1 TB." },
  { family: "iphone-17", slug: "iphone-17-pro", name: "iPhone 17 Pro", intro: "iPhone 17 Pro har 6,3 tommer skærm, aluminiumsramme og findes med 256 og 512 GB samt 1 TB." },
  { family: "iphone-17", slug: "iphone-17-pro-max", name: "iPhone 17 Pro Max", intro: "iPhone 17 Pro Max har 6,9 tommer skærm, aluminiumsramme og findes med 256 og 512 GB samt 1 og 2 TB." },
  { family: "iphone-18", slug: "iphone-18-pro", name: "iPhone 18 Pro", intro: "iPhone 18 Pro har 6,3 tommer skærm og kom i handlen i september 2026." },
  { family: "iphone-18", slug: "iphone-18-pro-max", name: "iPhone 18 Pro Max", intro: "iPhone 18 Pro Max har 6,9 tommer skærm og kom i handlen i september 2026." },
  { family: "iphone-18", slug: "iphone-duo", name: "iPhone Duo", intro: "iPhone Duo er den foldbare iPhone med 5,4 tommer ydre og 7,6 tommer indre skærm." },
];

function variantPage(variant: ModelVariant): IphoneSellPage {
  const family = FAMILY_PAGES.find((page) => page.slug === variant.family);
  if (!family) throw new Error(`Ukendt iPhone-familie: ${variant.family}`);
  const { name } = variant;
  const title = `Sælg ${name}: fast pris | PhoneSpot`;
  return {
    ...family,
    slug: variant.slug,
    name,
    title,
    metaDescription: `Sælg din ${name} til PhoneSpot. Vælg lagerplads og stand, og få et tilbud efter vores gennemgang. Aflever i Vejle eller Slagelse, eller send gratis.`,
    eyebrow: `Sælg ${name}`,
    h1: `Sælg din ${name}`,
    answer: `Du sælger din ${name} ved at vælge den i formularen og oplyse lagerplads og stand. Vi gennemgår oplysningerne og vender tilbage med et tilbud. Du kan aflevere telefonen i Vejle eller Slagelse eller sende den efter aftale.`,
    bodyHeading: `Det afgør, hvad din ${name} er værd`,
    body: [variant.intro, ...family.body],
    coverageHeading: `Find din ${name} i formularen`,
    coverage: `Vælg Telefon, Apple og ${name}. Vælg derefter lagerplads, og beskriv skærm, bagside og batteri. Fejler noget, markerer du det, så vi kender fejlen på forhånd.`,
    faqHeading: `Spørgsmål om at sælge ${name}`,
    faq: [
      worthFaq(name, "Den største forskel ligger i lagerplads og batteri."),
      ...family.faq.slice(1, -1),
      defectFaq(name),
    ],
    linkLabel: name,
  };
}

export const IPHONE_SELL_PAGES: IphoneSellPage[] = [...FAMILY_PAGES, ...VARIANTS.map(variantPage)];

/** Søskende til en side: de andre modeller i samme iPhone-generation. */
export function getIphoneSiblings(slug: string): IphoneSellPage[] {
  const family = VARIANTS.find((variant) => variant.slug === slug)?.family ?? slug;
  const members = new Set([family, ...VARIANTS.filter((variant) => variant.family === family).map((variant) => variant.slug)]);
  return IPHONE_SELL_PAGES.filter((page) => members.has(page.slug) && page.slug !== slug);
}

/** Generationssiderne, brugt som links fra hub og iPhone-siden. */
export const IPHONE_FAMILY_PAGES = FAMILY_PAGES;

export function getIphoneSellPage(slug: string): IphoneSellPage | undefined {
  return IPHONE_SELL_PAGES.find((page) => page.slug === slug);
}
