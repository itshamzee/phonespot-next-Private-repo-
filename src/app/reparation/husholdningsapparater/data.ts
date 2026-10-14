import type { HubFaq } from "@/lib/repairs/brand-hub-content";

/** Pris i hele kroner inkl. moms, eller null = fast pris efter tjek/diagnose. */
export type PriceRow = { label: string; price: number | null; fixedText?: string };

export type PriceGroup = { caption?: string; rows: PriceRow[] };

const CHECK = "Fast pris efter tjek";
const DIAG = "Fast pris efter diagnose";

export const DYSON_PRICES: PriceGroup = {
  caption: "Dyson ledningsfri",
  rows: [
    { label: "Dyson V6 batteri", price: 799 },
    { label: "Dyson V7/V8 batteri", price: 949 },
    { label: "Dyson V10/V11 batteri", price: 999 },
    { label: "Dyson V15 batteri", price: 1149 },
    { label: "Dyson V6 motor/hovedenhed", price: 1049 },
    { label: "Dyson V7/V8 motor/hovedenhed", price: 1499 },
    { label: "Dyson V11/V15 motor/hovedenhed", price: 1849 },
    { label: "Dyson filterskift", price: 349 },
    { label: "Tømmelem, ladeport, aftrækker, børstehoved", price: null, fixedText: CHECK },
  ],
};

export const OTHER_VACUUM_PRICES: PriceGroup = {
  caption: "Shark og Samsung Jet",
  rows: [{ label: "Shark / Samsung Jet batteri", price: null, fixedText: CHECK }],
};

export const ROBOT_PRICES: PriceGroup = {
  rows: [
    { label: "Roborock batteri", price: 689 },
    { label: "iRobot Roomba batteri", price: 549 },
    { label: "iRobot Roomba hjulmodul", price: 509 },
  ],
};

export const COFFEE_PRICES: PriceGroup = {
  rows: [
    { label: "Service og afkalkning", price: 259 },
    { label: "Diagnose (trækkes fra ved reparation)", price: 149 },
    { label: "Nespresso: utæt / pakninger", price: 659 },
    { label: "De'Longhi ECAM: termoblok", price: 429 },
    { label: "De'Longhi ECAM: flowmeter", price: 359 },
    { label: "De'Longhi ECAM: bryggeenhed", price: 649 },
    { label: "Pumpe, elektronik og kværn", price: null, fixedText: DIAG },
  ],
};

export const CONTROLLER_PRICES: PriceGroup = {
  rows: [
    { label: "PS5 DualSense stick-drift", price: 349 },
    { label: "DualSense Edge stick-modul", price: 399 },
    { label: "USB-C-port (DualSense / Xbox Series)", price: 429 },
    { label: "DualSense batteri", price: 349 },
  ],
};

export const HERO_ANSWER =
  "Vi reparerer ledningsfri støvsugere som Dyson, robotstøvsugere, kaffemaskiner og spilcontrollere i Vejle og Slagelse. Du får en fast pris, før vi går i gang, og 12 måneders garanti på dele og arbejde. Vi er et uafhængigt værksted. Kom forbi uden tidsbestilling, så tjekker vi den gratis ved disken.";

export const FAQS: HubFaq[] = [
  {
    question: "Er I autoriseret Dyson-værksted?",
    answer:
      "Nej, vi er et uafhængigt værksted og ikke tilknyttet Dyson. Er din støvsuger under Dysons garanti, så kontakt Dyson først.",
  },
  {
    question: "Skal jeg bestille tid?",
    answer:
      "Nej. Du kan komme forbi uden tidsbestilling i Vejle eller Slagelse, eller du kan ringe eller skrive først, hvis du vil være sikker på, at vi har delen.",
  },
  {
    question: "Hvad koster det at få tjekket apparatet?",
    answer:
      "Det hurtige tjek ved disken er gratis. På kaffemaskiner laver vi en diagnose til 149 kr., og de penge trækkes fra, hvis du lader os reparere maskinen.",
  },
  {
    question: "Hvor lang tid tager en reparation?",
    answer:
      "Det afhænger af apparatet og fejlen, og om delen er på lager. Vi oplyser tiden, når vi har set enheden.",
  },
  {
    question: "Får jeg prisen, før I går i gang?",
    answer:
      "Ja. Du får en fast pris, og du siger ja til den, før vi begynder. Hvor listen siger fast pris efter tjek eller diagnose, får du prisen, når vi har kigget på apparatet.",
  },
  {
    question: "Hvilken garanti får jeg?",
    answer: "Du får 12 måneders garanti på dele og arbejde.",
  },
  {
    question: "Kan det betale sig at reparere min kaffemaskine?",
    answer:
      "Det siger vi ærligt. Koster reparationen mere end omkring 40 procent af nyprisen, anbefaler vi en ny maskine. Er maskinen stadig under producentens garanti, så kontakt De'Longhi eller Nespresso først.",
  },
  {
    question: "Hvilke batterier bruger I?",
    answer:
      "Vi bruger kompatible batterier af god kvalitet og skriver altid på tilbuddet, hvilket batteri du får.",
  },
];
