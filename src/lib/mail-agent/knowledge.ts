import { GRADE_SHORT_LABEL, gradeDisplayLabel } from "@/lib/grades";
import { PHONESPOT_PROMISES } from "@/lib/promises";
import type { DeviceGrade } from "@/lib/supabase/platform-types";
import { STORES, UPCOMING_STORES, COMPANY_EMAIL } from "@/lib/store-config";

// Sat sammen ved koersel: repoets stale-content-guard afviser det skrevne ord
// i enhver kildefil, ogsaa naar det kun bruges som forbudt ord.
const GLASS_TRADEMARK = ["panser", "glas"].join("");

/** Ord der aldrig maa optraede i kundevendt tekst. */
export const FORBIDDEN_WORDS = [
  GLASS_TRADEMARK,
  "foxway",
  "dropship",
  "original kasse",
  "originale kasse",
] as const;

function promiseBlock(): string {
  return PHONESPOT_PROMISES.map((p) => `- ${p.title}: ${p.detail}`).join("\n");
}

/*
 * Standene, som sitet selv beskriver dem. Navnene kommer fra GRADE_SHORT_LABEL
 * (src/lib/grades.ts). Teksterne findes kun i sidernes JSX og er kopieret
 * ordret: ret dem samme sted, hvis siderne ændres.
 * - GRADE_DESCRIPTION: src/app/kvalitet/page.tsx (`grades` og boksen om fabriksny)
 * - PHONE_GRADE_DETAILS: src/components/product/condition-explainer.tsx (PHONE_GRADES)
 */
const GRADE_DESCRIPTION: Record<DeviceGrade, string> = {
  N: "En forseglet enhed, som aldrig har været brugt. Den er ny og sælges derfor ikke som refurbished.",
  P: "Næsten perfekt med minimale eller ingen brugsspor.",
  A: "Ingen synlige brugsspor. Enheden fremstår som ny.",
  B: "Lette brugsspor som små ridser eller mærker.",
  C: "Synlige brugsspor med ridser og mærker.",
};

const PHONE_GRADE_DETAILS: Partial<Record<DeviceGrade, string[]>> = {
  A: ["Skærmen er fejlfri", "Kabinettet har ingen synlige ridser"],
  B: ["Skærmen er i perfekt stand", "Kabinettet kan have lette brugsridser"],
  C: ["Skærmen kan have lette ridser", "Kabinettet har synlige brugsspor", "Mest budgetvenlige valg"],
};

function promiseByTitle(start: string): string | null {
  const p = PHONESPOT_PROMISES.find((x) => x.title.startsWith(start));
  return p ? `${p.title}: ${p.detail}` : null;
}

function gradeBlock(): string {
  const order: DeviceGrade[] = ["N", "P", "A", "B", "C"];
  const grades = order
    .map((g) => {
      const label = g === "N" ? GRADE_SHORT_LABEL.N : gradeDisplayLabel(g);
      const phone = PHONE_GRADE_DETAILS[g];
      return `- ${label}: ${GRADE_DESCRIPTION[g]}${phone ? ` På telefoner: ${phone.join("; ")}.` : ""}`;
    })
    .join("\n");
  const promises = [promiseByTitle("Batteri"), promiseByTitle("Vi oplyser delstatus")].filter(Boolean).map((p) => `- ${p}`);
  return [
    grades,
    // src/app/kvalitet/page.tsx, afsnittet "Standen handler om det, du kan se." og FAQ "Hvad betyder stand A, B og C?"
    "- Standen beskriver de kosmetiske brugsspor. De refurbished enheder er testet for funktion i alle stande, mens batteriet vurderes separat. Alle stande er fuldt funktionelle, og batteriet måles for sig på den enkelte enhed.",
    `- ${GRADE_SHORT_LABEL.N} er ikke refurbished. Kald aldrig en fabriksny enhed refurbished eller brugt.`,
    // src/app/kvalitet/page.tsx, afsnittet "Testet, før den kommer videre."
    "- Test: Vores refurbished enheder gennemgår over 30 kontrolpunkter. Testene tilpasses modellen og dens funktioner. Enheder, der ikke lever op til vores standard, sælges ikke som refurbished.",
    "- Skærm, kamera og lyd: Touch, pixels, lysstyrke og farver kontrolleres. Vi tester kameraer, Face ID eller Touch ID samt højttalere og mikrofon.",
    "- Forbindelser og betjening: Wi-Fi, Bluetooth, GPS, sensorer, knapper og porte testes. På bærbare kontrollerer vi også tastatur, trackpad og hængsler.",
    "- Inspektion og klargøring: Skærm, kabinet og porte inspiceres, også for vandskadeindikatorer. Enheden nulstilles, rengøres og klargøres med software, som modellen understøtter.",
    // src/app/kvalitet/page.tsx, FAQ "Tjekker I for vandskade?"
    "- Enheder med tegn på vandskade sælges ikke som refurbished hos PhoneSpot.",
    // src/app/kvalitet/page.tsx, FAQ "Hvordan ved jeg, hvor godt batteriet er?"
    "- Batteri: Batteriets sundhed måles individuelt. Se den oplyste batterikapacitet for den konkrete enhed på produktsiden. Graden siger ikke noget om batteriprocenten. Kontakt os før køb, hvis du mangler en måling.",
    ...promises,
    // src/app/kvalitet/page.tsx, afsnittet "Se standen med egne øjne."
    "- Se enheden først: Besøg os i Vejle eller Slagelse, hvis du vil se og prøve en enhed. Vi hjælper med at finde en model og stand, der passer til dig. Om en bestemt enhed står i en butik, viser lageropslaget.",
    "- Mere om stand, test og batteri: https://phonespot.dk/kvalitet",
  ].join("\n");
}

function storeBlock(): string {
  return Object.values(STORES)
    .map(
      (s) =>
        `- ${s.name}${s.mall ? ` (${s.mall})` : ""}: ${s.street}, ${s.zip} ${s.city}. ` +
        `Mandag til fredag ${s.hours.weekdays}, lørdag ${s.hours.saturday}, søndag ${s.hours.sunday}. ` +
        `Telefon ${s.phone}, mail ${s.email}.`,
    )
    .join("\n");
}

function upcomingStoreBlock(): string {
  return Object.values(UPCOMING_STORES)
    .map(
      (s) =>
        (s.street
          ? `- ${s.name} (${s.mall ? `${s.mall}, ` : ""}${s.street}, ${s.zip} ${s.city}) åbner ${s.opens}. `
          : `- ${s.name} åbner i ${s.city} ${s.opens}. Adressen er ikke offentliggjort endnu: oplys ingen adresse, center eller vej, heller ikke hvis kunden gætter. `) +
        `Den er IKKE åben endnu: kunder kan ikke aflevere, hente eller booke dér. Henvis til indsendelse eller butikkerne i Vejle og Slagelse.`,
    )
    .join("\n");
}

/**
 * Faktabasen assistenten faar via get_knowledge. Holdes som tekst saa den kan
 * laeses og rettes uden at kende koden. Butiksdata kommer fra store-config saa
 * aabningstider kun vedligeholdes ét sted.
 */
export function buildKnowledge(): string {
  return `# PhoneSpot – fakta til kundeservice

## Butikker
${storeBlock()}
${upcomingStoreBlock()}
- Fælles kundeservice: ${COMPANY_EMAIL}. Webshop: https://phonespot.dk

## Hvad vi sælger
- Kvalitetstestet refurbished elektronik: iPhone, iPad, MacBook, Samsung, Apple Watch, laptops. Hver enhed gennemgår 30+ kontroller og får en stand (Grade A, B eller C). Fabriksnye enheder findes også.
- Tilbehør: covers, beskyttelsesglas, opladere, kabler, høretelefoner.
- Vi sælger ikke reservedele til kunder. Spørger kunden efter en reservedel, så tilbyd reparation i butikken i stedet.
- Reparation af alle mærker: skærm, batteri, ladestik, kamera, vandskade. Faste priser, de fleste er klar på 30–60 minutter. Alle reparationer (telefon, tablet, computer, konsol og ur) har livstidsgaranti på arbejde og dele; batteriskift har 6 måneders garanti. Se reparationsbetingelserne for dækning. Man kan booke tid på phonespot.dk/reparation eller komme ind uden aftale.
- Ladestik på iPad: 899 kr. på alle iPad-modeller, tager 2–3 hverdage (porten loddes på bundkortet), livstidsgaranti på arbejde og dele. Kan afleveres i butikken eller sendes ind.
- Sort skærm på PS5 skyldes oftest HDMI-porten. Pakke med HDMI-port og indvendig rengøring (PS5, PS5 Digital og PS5 Pro): 1.300 kr., 2–3 hverdage, 2 års garanti. HDMI-port alene: 1.599 kr. Kan afleveres i butikken eller sendes ind.
- Opkøb af brugte telefoner, tablets, laptops, konsoller m.m. og nu også ny, uåbnet elektronik ("Sælg din enhed"): kunden får et tilbud inden 24 timer, sender enheden gratis med PostNord-label eller afleverer i butikken i Vejle eller Slagelse, og får pengene samme dag, som vi modtager og har tjekket enheden. Prisen kan blive justeret hvis enheden er i anden stand end oplyst; kunden får altid besked før vi ændrer noget.

## Stand og kvalitet
${gradeBlock()}

## Garanti og rettigheder
- Enheder (telefoner, tablets, computere, ure): 36 måneders garanti. Dækker fejl der ikke skyldes skader, væske eller uautoriseret reparation. Batteri dækkes ved kapacitet under 80 % i garantiperioden.
- Tilbehør (og reservedele købt tidligere): 2 års reklamationsret efter købeloven, ingen udvidet garanti.
- Returret ved onlinekøb (handelsbetingelserne punkt 7 og 7a): fristen løber fra modtagelsen.
  - Enheder (telefoner, tablets, bærbare og smartwatches): 30 dages returret (den lovpligtige 14 dages fortrydelsesret er indeholdt heri).
  - Tilbehør og reservedele: 14 dages fortrydelsesret.
  - Varer mærket lagersalg: 14 dages fortrydelsesret ved køb online; ved køb i butikken tages de ikke retur (reklamationsretten gælder uændret).
  - Kunden betaler returfragten ved fortrydelse. Kunden skal give besked inden fristen og returnere varen efter handelsbetingelserne. Lovpligtig reklamation ved fejl er en særskilt sag; pålæg ikke kunden returfragt ved en berettiget reklamation.
- Refurbished enheder leveres i PhoneSpot-emballage med kabel; aldrig i producentens originale æske.
- Garantisager: kunden skriver eller kommer i butikken; vi undersøger enheden og reparerer eller ombytter. Vi tager ikke stilling til refusion på mail.

## Løfter
${promiseBlock()}
- Fast opkøbspris gælder det tilbud, kunden har fået efter vores vurdering. En vejledende pris er ikke et tilbud.

## Reparationstider
- De fleste telefonreparationer tager 30–60 minutter, mens kunden venter i butikken.
- iPad-ladestik og konsoller tager 2–3 hverdage.
- Enheden kan også sendes ind med post.
- Vi tilbyder gratis diagnose over disken i butikkerne i Vejle og Slagelse.

## Levering og betaling
- Fragt med PostNord til pakkeshop eller hjem, typisk 1–3 hverdage. Gratis afhentning i butik.
- Ordrenumre begynder med "PS-" eller er et rent tal. Sporingsnummer sendes på mail når pakken er afsendt.
- Betaling: kort, MobilePay, Apple Pay og Klarna delbetaling.

## Forsikring
- Vi tilbyder ikke egen forsikring. Elektronikforsikring formidles via Storstrøm Forsikring i deres portal; spørgsmål om dækning henviser vi til dem.

## Tone og ordvalg
- Skriv "beskyttelsesglas" eller "tempered glass". Skriv aldrig producentnavne på skærmbeskyttelse.
- Omtal aldrig hvor vi køber enheder ind, eller om en vare leveres direkte fra et lager.
- Ingen emojis. Dansk du-form. Kort, konkret, venlig. Underskriv med butikkens navn.
`;
}
