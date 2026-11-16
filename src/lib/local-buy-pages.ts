/**
 * Lokale købssider: "Brugte iPhones i Vejle", "Brugte bærbare i Slagelse" osv.
 *
 * Siderne viser, hvad der faktisk ligger i butikken lige nu (enhedens
 * lagersted), og resten af udvalget, som sendes fra lageret. De lover derfor
 * ikke et udvalg i butikken, vi ikke har, og ingen afhentning samme dag.
 */
import { STORES, type StoreLocationConfig } from "@/lib/store-config";

export type LocalBuyKind = "iphone" | "laptop";
export type LocalBuyStore = "vejle" | "slagelse";

export type LocalBuyPage = {
  /** URL-sti uden skråstreg, fx "iphones-vejle". */
  path: string;
  store: LocalBuyStore;
  kind: LocalBuyKind;
  /** product_templates.category */
  category: string;
  categoryHref: string;
  title: string;
  description: string;
  h1: string;
  /** "iPhones" / "bærbare" */
  plural: string;
  /** "iPhone" / "bærbar" */
  singular: string;
};

const KIND = {
  iphone: { category: "iphone", categoryHref: "/iphones", plural: "iPhones", singular: "iPhone", slug: "iphones" },
  laptop: { category: "laptop", categoryHref: "/baerbare", plural: "bærbare", singular: "bærbar", slug: "baerbare" },
} as const;

const COPY: Record<LocalBuyStore, Record<LocalBuyKind, { title: string; description: string }>> = {
  vejle: {
    iphone: {
      title: "Brugte iPhones i Vejle – se dem i butikken | PhoneSpot",
      description:
        "Køb en brugt iPhone i Vejle. Se hvilke der ligger i butikken på Løversysselvej 3B lige nu. 36 mdr. garanti, 30 dages returret og gratis parkering ved døren.",
    },
    laptop: {
      title: "Brugte bærbare i Vejle – computer med garanti | PhoneSpot",
      description:
        "Køb en brugt bærbar computer i Vejle. Se hvilke der står i butikken på Løversysselvej 3B lige nu. Testet, med 36 mdr. garanti og 30 dages returret.",
    },
  },
  slagelse: {
    iphone: {
      title: "Brugte iPhones i Slagelse – 36 mdr. garanti | PhoneSpot",
      description:
        "Køb en brugt iPhone i Slagelse. Se hvilke der ligger i butikken i VestsjællandsCentret lige nu. 36 mdr. garanti og 30 dages returret. Åbent alle ugens dage.",
    },
    laptop: {
      title: "Brugte bærbare i Slagelse – computer med garanti | PhoneSpot",
      description:
        "Køb en brugt bærbar computer i Slagelse. Se hvilke der står i butikken i VestsjællandsCentret lige nu. Testet, med 36 mdr. garanti og 30 dages returret.",
    },
  },
};

function build(store: LocalBuyStore, kind: LocalBuyKind): LocalBuyPage {
  const k = KIND[kind];
  const city = STORES[store].city;
  return {
    path: `${k.slug}-${store}`,
    store,
    kind,
    category: k.category,
    categoryHref: k.categoryHref,
    plural: k.plural,
    singular: k.singular,
    h1: `Brugte ${k.plural} i ${city}`,
    ...COPY[store][kind],
  };
}

export const LOCAL_BUY_PAGES: LocalBuyPage[] = [
  build("vejle", "iphone"),
  build("vejle", "laptop"),
  build("slagelse", "iphone"),
  build("slagelse", "laptop"),
];

export function getLocalBuyPage(path: string): LocalBuyPage {
  const page = LOCAL_BUY_PAGES.find((entry) => entry.path === path);
  if (!page) throw new Error(`Ukendt lokal købsside: ${path}`);
  return page;
}

/** Lokale købssider for én butik, til links fra butiks- og reparationssider. */
export function localBuyPagesForStore(store: string): LocalBuyPage[] {
  return LOCAL_BUY_PAGES.filter((entry) => entry.store === store);
}

type Stocked = { locations: { name: string; type: string; count: number }[] };

/** Antal enheder af en model, der ligger i netop denne butik. "Vejle Gågade" tæller ikke som Vejle. */
export function inStoreCount(template: Stocked, store: StoreLocationConfig): number {
  return template.locations
    .filter((location) => location.type === "store" && location.name === store.city)
    .reduce((sum, location) => sum + location.count, 0);
}

export function localBuyFaqs(page: LocalBuyPage): { question: string; answer: string }[] {
  const store = STORES[page.store];
  const where = store.mall ? `i ${store.mall}` : `på ${store.street}`;
  const battery = page.kind === "iphone" ? " Batteriet er mindst 90 % ved levering." : "";
  const sellNoun = page.kind === "iphone" ? "telefon" : "computer";
  return [
    {
      question: `Kan jeg se en brugt ${page.singular} i butikken i ${store.city}?`,
      answer: `Ja. De ${page.plural}, der ligger i butikken ${where} lige nu, står øverst på denne side. Resten af udvalget ligger på vores lager og sendes til dig. Ring på ${store.phone}, før du kører, hvis du vil se en bestemt model.`,
    },
    {
      question: `Hvilken garanti får jeg på en brugt ${page.singular}?`,
      answer: `Du får 36 måneders garanti og 30 dages returret på alle brugte ${page.plural}, uanset om du køber i butikken eller online.${battery}`,
    },
    {
      question: `Køber I min gamle ${sellNoun} i ${store.city}?`,
      answer: `Ja. Tag den med i butikken, så vurderer vi den ud fra model og stand. Du kan også sende oplysningerne online og få et tilbud.`,
    },
    {
      question: `Hvor ligger PhoneSpot i ${store.city}, og hvornår har I åbent?`,
      answer: `Butikken ligger ${where}, ${store.zip} ${store.city}. Vi har åbent mandag til fredag ${store.hours.weekdays}, lørdag ${store.hours.saturday} og søndag ${store.hours.sunday}.${store.slug === "vejle" ? " Der er gratis parkering lige ved døren." : ""}`,
    },
  ];
}
