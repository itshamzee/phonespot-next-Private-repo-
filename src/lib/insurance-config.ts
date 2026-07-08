// ---------------------------------------------------------------------------
// Elektronikforsikring — single source of truth
//
// Shared product facts for the Storstrøm elektronikforsikring. Both the
// /forsikring page and the cart / product-page add-on read from here so the
// name, price and description never drift apart.
//
// Note: the insurance is a monthly Storstrøm product that is activated in
// store in PhoneSpot Slagelse (1 kr. the first month, then a low monthly rate
// via Betalingsservice). It is therefore NOT a one-time cart purchase — the
// add-on captures interest as a lead rather than adding a priced line.
// ---------------------------------------------------------------------------

export const INSURANCE = {
  name: "Elektronikforsikring",
  /** Short one-liner used on the add-on cards. */
  shortLine: "Beskyt din enhed mod skader og uheld",
  partner: "Storstrøm Forsikring",
  /** Headline price shown on the add-on. */
  firstMonthLabel: "1 kr.",
  firstMonthSub: "første måned, derefter lav månedlig rate",
  /** Link to the full insurance page. */
  learnMorePath: "/forsikring",
  /** Value stored in contact_inquiries.source for insurance leads. */
  leadSource: "elektronikforsikring",
} as const;

// Storstrøm currently only writes offers for customers in postnumre 2500-4990.
// Leads outside this range are still captured (Storstrøm is finding a solution
// for wider coverage in aug/sept 2026) but flagged so staff know not to create
// an offer yet.
export const STORSTROM_COVERAGE = { min: 2500, max: 4990 } as const;

export function isInStorstromCoverage(postnummer: string): boolean {
  const n = Number(postnummer);
  return (
    Number.isInteger(n) &&
    n >= STORSTROM_COVERAGE.min &&
    n <= STORSTROM_COVERAGE.max
  );
}

export const DOC_TERMS_URL =
  "https://storstrom.dk/media/betingelser-7201-elektronikforsikring-maj-2026.pdf";
export const DOC_IPID_URL =
  "https://storstrom.dk/media/produktinfo-7201-elektronikforsikring-maj-2026.pdf";
export const STORSTROM_PRODUCT_URL =
  "https://storstrom.dk/forsikringer/enkeltstaaende-elektronikforsikring/";

export const INSURANCE_HIGHLIGHTS = [
  { value: "1 kr.", label: "Første måned", sub: "Derefter lav månedlig rate" },
  { value: "Uheld", label: "+ funktionsfejl", sub: "Pludselig skade dækkes" },
  { value: "60 mdr.", label: "Dækning", sub: "36 mdr. for smartphones" },
];

export const INSURANCE_COVERED = [
  {
    title: "Pludselig skade",
    description:
      "Uheld med øjeblikkelig virkning — fald, slag og andre udefrakommende skader på enheden.",
  },
  {
    title: "Funktionsfejl",
    description:
      "Mekaniske og elektriske svigt, så enheden ikke længere kan bruges til sit formål.",
  },
  {
    title: "Batteri under 70 %",
    description:
      "Skade på mobiltelefonbatteriet, hvis kapaciteten falder til under 70 % af det oprindelige.",
  },
  {
    title: "Pixelfejl",
    description:
      "Pixelfejl på fladskærme ud over producentens accepterede grænse.",
  },
  {
    title: "Dækning i og uden for Danmark",
    description:
      "Gælder i Danmark og i hele verden i op til 60 dage for hver 12-måneders periode.",
  },
  {
    title: "Reparation eller erstatning",
    description:
      "Vi reparerer enheden eller erstatter den med et tilsvarende nyt eller istandsat produkt.",
  },
];

export const INSURANCE_NOT_COVERED = [
  "Almindelig slid, ælde og gradvis forringelse",
  "Skader der alene er kosmetiske og ikke påvirker funktionen",
  "Skader dækket af garanti eller reklamationsret",
  "Skader forårsaget af dyr",
  "Fejl i data, software, virus og hacking",
  "Skader fra oversvømmelse og naturkatastrofer",
];
