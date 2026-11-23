/** Undersider til Black November, rettet mod søgninger på Black Friday pr. kategori. */
export type CampaignOffer = {
  slug: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  body: string[];
  actions: { href: string; label: string }[];
  faq: { q: string; a: string }[];
};

export const CAMPAIGN_OFFERS: CampaignOffer[] = [
  {
    slug: "reparation",
    name: "Reparation",
    title: "Black Friday reparation: 10 % hele november | PhoneSpot",
    description:
      "Black Friday-tilbud på reparation: 10 % på alle reparationer hele november hos PhoneSpot i Vejle og Slagelse. Skærm, batteri og opladerstik. Book online.",
    h1: "Black Friday på reparation: 10 % hele november",
    lead: "Du behøver ikke vente til Black Friday. Hos PhoneSpot får du 10 % på alle reparationer fra 1. til og med 30. november, online og i butikkerne i Vejle og Slagelse.",
    body: [
      "Rabatten gælder skærmskift, batteriskift, opladerstik, kamera og de andre reparationer, vi laver. Den trækkes automatisk, når du booker online eller betaler i butikken, så du skal ikke bruge en kode.",
      "Vælger du tre eller flere reparationer på samme booking, får du 15 % i stedet. De to rabatter lægges ikke sammen. En iPhone 17 Pro-skærm i budgetkvalitet koster normalt 1.899 kr. og koster 1.709 kr. i november.",
      "Har du en revnet skærm eller et batteri, der ikke holder dagen ud, er november et godt tidspunkt at få det ordnet. Garantien på reparationen er den samme som resten af året.",
    ],
    actions: [
      { href: "/reparation", label: "Find din model og book" },
      { href: "/reparation-vejle", label: "Reparation i Vejle" },
      { href: "/reparation-slagelse", label: "Reparation i Slagelse" },
    ],
    faq: [
      {
        q: "Hvornår gælder Black Friday-tilbuddet på reparation?",
        a: "Hele november, fra 1. til og med 30. november 2026. Black Friday er 27. november, men rabatten er den samme hele måneden.",
      },
      {
        q: "Skal jeg bruge en rabatkode?",
        a: "Nej. De 10 % trækkes automatisk i din bestilling eller ved disken.",
      },
      {
        q: "Gælder rabatten også på batteriskift?",
        a: "Ja, rabatten gælder alle reparationer, også batteriskift.",
      },
      {
        q: "Kan jeg kombinere med mængderabat?",
        a: "Nej. Ved tre eller flere reparationer gælder 15 % i stedet for 10 %.",
      },
    ],
  },
  {
    slug: "covers-og-glas",
    name: "Covers og glas",
    title: "Black Friday covers og beskyttelsesglas: 199 kr. | PhoneSpot",
    description:
      "Black Friday på tilbehør: covers og beskyttelsesglas til højst 199 kr. hele november, også privacy-glas. Bookcovers og lagersalg er ikke med. Se udvalget.",
    h1: "Black Friday på covers og beskyttelsesglas: højst 199 kr.",
    lead: "Alle covers og alt beskyttelsesglas koster højst 199 kr. fra 1. til og med 30. november, også privacy-glas, der gør skærmen mørk fra siden.",
    body: [
      "Prisen står direkte på varen, så du skal ikke bruge en kode. Varer, der i forvejen koster mindre, beholder deres pris. Bookcovers (pungcovers) og varer på lagersalg er ikke med, for lagersalget har sine egne priser og 3 for 2.",
      "Køber du beskyttelsesglas sammen med et skærmskift, sætter vi det på for 99 kr. Så er skærmen beskyttet fra dag ét, og du slipper for bobler og skæve kanter.",
      "Husk at vælge cover og glas efter din præcise model. En iPhone 17 og en iPhone 17 Pro har forskelligt kameraområde, så et cover til den ene passer ikke på den anden.",
    ],
    actions: [
      { href: "/tilbehoer/covers", label: "Se covers" },
      { href: "/tilbehoer/beskyttelsesglas", label: "Se beskyttelsesglas" },
    ],
    faq: [
      {
        q: "Er alle covers med i tilbuddet?",
        a: "Alle covers undtagen bookcovers (pungcovers) og varer på lagersalg koster højst 199 kr.",
      },
      {
        q: "Er privacy-glas med?",
        a: "Ja, privacy-glas er også med.",
      },
      {
        q: "Hvad koster det at få sat glas på?",
        a: "Køber du glas sammen med et skærmskift, sætter vi det på for 99 kr.",
      },
      {
        q: "Hvornår slutter tilbuddet?",
        a: "Tilbuddet gælder til og med 30. november 2026.",
      },
    ],
  },
];

/** Undersider, der er taget ned. De sendes videre til kampagnesiden. */
export const RETIRED_OFFER_SLUGS = new Set(["brugt-iphone"]);

export function getCampaignOffer(slug: string): CampaignOffer | undefined {
  return CAMPAIGN_OFFERS.find((offer) => offer.slug === slug);
}
