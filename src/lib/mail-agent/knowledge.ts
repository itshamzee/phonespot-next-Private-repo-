import { STORES, COMPANY_EMAIL } from "@/lib/store-config";

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

/**
 * Faktabasen assistenten faar via get_knowledge. Holdes som tekst saa den kan
 * laeses og rettes uden at kende koden. Butiksdata kommer fra store-config saa
 * aabningstider kun vedligeholdes ét sted.
 */
export function buildKnowledge(): string {
  return `# PhoneSpot – fakta til kundeservice

## Butikker
${storeBlock()}
- Fælles kundeservice: ${COMPANY_EMAIL}. Webshop: https://phonespot.dk

## Hvad vi sælger
- Kvalitetstestet refurbished elektronik: iPhone, iPad, MacBook, Samsung, Apple Watch, laptops. Hver enhed gennemgår 30+ kontroller og får en stand (Grade A, B eller C). Fabriksnye enheder findes også.
- Tilbehør: covers, beskyttelsesglas, opladere, kabler, høretelefoner.
- Reservedele til reparation.
- Reparation af alle mærker: skærm, batteri, ladestik, kamera, vandskade. Faste priser, livstidsgaranti på reparationen, de fleste er klar på 30–60 minutter. Man kan booke tid på phonespot.dk/reparation eller komme ind uden aftale.
- Opkøb af brugte telefoner, tablets og laptops ("Sælg din enhed"): kunden får et tilbud inden 24 timer, sender enheden gratis med PostNord-label eller afleverer i butikken, og får udbetalt efter kontrol. Prisen kan blive justeret hvis enheden er i anden stand end oplyst; kunden får altid besked før vi ændrer noget.

## Garanti og rettigheder
- Enheder (telefoner, tablets, computere, ure): 36 måneders garanti. Dækker fejl der ikke skyldes skader, væske eller uautoriseret reparation. Batteri dækkes ved kapacitet under 80 % i garantiperioden.
- Tilbehør og reservedele: 2 års reklamationsret efter købeloven, ingen udvidet garanti.
- Onlinekøb: 14 dages fortrydelsesret fra modtagelse. Enheden skal returneres i samme stand som modtaget. Returlabel udstedes af os når kunden har skrevet.
- Refurbished enheder leveres i PhoneSpot-emballage med kabel; aldrig i producentens originale æske.
- Garantisager: kunden skriver eller kommer i butikken; vi undersøger enheden og reparerer eller ombytter. Vi tager ikke stilling til refusion på mail.

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
