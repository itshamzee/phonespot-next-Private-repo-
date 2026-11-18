import { fitTitle } from "@/lib/repairs/hub-meta";

/**
 * Egen tekst til konsollernes modelsider (/reparation/playstation/playstation-5 osv.).
 *
 * Search Console 21/10-14/11 2026: PS5-siden ligger på plads 8 for "ps5 reparation",
 * mens PS5 Digital (14,5) og PS5 Pro (23,9) ligger langt nede. De tre sider var
 * næsten ens: samme skabelontitel (Digital og Pro mistede "Vejle og Slagelse",
 * fordi titlen blev for lang), H1 = modelnavnet og en generisk intro. Her får
 * hver model sin egen titel, H1, svar-først-afsnit, modelviden og FAQ.
 *
 * Priser kommer fra databasen (repair_services) via slug, så teksten aldrig
 * lover en pris, der ikke står i prislisten. Mangler en ydelse på modellen,
 * udelades sætningen.
 *
 * Fakta: konsolreparation har 2 års garanti. PS5 (alle udgaver) har flydende
 * metal mellem chippen og køleprofilen fra fabrikken; PS5 Pro har derudover
 * riller i køleprofilen, der holder metallet på plads (Sonys egen teardown,
 * april 2025). PS4 og Xbox har almindelig kølepasta.
 */

export type ConsoleServiceLike = { slug: string; price_dkk: number };

export type ConsolePrices = {
  /** Rens + ny kølepasta (slug rens-koelepasta). */
  clean: number | null;
  /** HDMI-port + rengøring (pakke). */
  bundle: number | null;
  hdmi: number | null;
  fan: number | null;
  controller: number | null;
};

const SLUGS: Record<keyof ConsolePrices, string> = {
  clean: "rens-koelepasta",
  bundle: "hdmi-port-rengoering",
  hdmi: "hdmi-port",
  fan: "blaeser",
  controller: "controller-reparation",
};

export function consolePricesFrom(services: ConsoleServiceLike[]): ConsolePrices {
  const price = (slug: string) => {
    const s = services.find((x) => x.slug === slug && x.price_dkk > 0);
    return s ? s.price_dkk : null;
  };
  return {
    clean: price(SLUGS.clean),
    bundle: price(SLUGS.bundle),
    hdmi: price(SLUGS.hdmi),
    fan: price(SLUGS.fan),
    controller: price(SLUGS.controller),
  };
}

export const kr = (n: number) => `${n.toLocaleString("da-DK")} kr.`;

export type ConsoleFaq = { question: string; answer: string };
export type ConsoleLink = { href: string; label: string };

export type ConsoleModelPage = {
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  /** Svar først: 40-60 ord med butikker, fra-priser, ventetid og garanti. */
  answer: string;
  /** Overskrift + afsnit med viden, der kun gælder denne model. */
  aboutHeading: string;
  about: string[];
  /** Prisankre i heroen, fx "Rens + ny køling 899 kr.". */
  anchors: { label: string; price: number }[];
  faqs: ConsoleFaq[];
  links: ConsoleLink[];
};

type Definition = {
  /** Søgeordet i titlen, fx "PS5 Digital reparation". */
  keyword: string;
  h1: string;
  /** Hvad konsollen kaldes i løbende tekst, fx "PS5 Digital". */
  short: string;
  /** Det fulde navn, så "PlayStation 5" også står på siden. */
  fullName: string;
  liquidMetal: boolean;
  /** Ekstra fejl, der er typisk for netop denne model. */
  about: (p: ConsolePrices) => string[];
  extraFaqs: (p: ConsolePrices) => ConsoleFaq[];
  extraLinks?: ConsoleLink[];
};

const CLEAN_BLOG: ConsoleLink = {
  href: "/blog/gta-6-klar-ps5-rens-koelepasta",
  label: "Gør konsollen klar til GTA 6: rens og ny køling",
};
const HDMI_BLOG: ConsoleLink = {
  href: "/blog/ps5-sort-skaerm-hdmi-reparation",
  label: "Sort skærm på PS5? Så er det ofte HDMI-porten",
};
const LOCAL_LINKS: ConsoleLink[] = [
  { href: "/reparation-vejle/playstation", label: "Konsolreparation i Vejle" },
  { href: "/reparation-slagelse/playstation", label: "Konsolreparation i Slagelse" },
  { href: "/reparation/indsend", label: "Send konsollen ind" },
];

const LIQUID_METAL_NOTE =
  "fra fabrikken sidder der flydende metal mellem chippen og køleprofilen i stedet for almindelig kølepasta. Ved en rens skifter vi termopuderne, tjekker det flydende metal og fornyer det kun, hvis det har flyttet sig.";

const DEFINITIONS: Record<string, Definition> = {
  "playstation-5": {
    keyword: "PS5 reparation",
    h1: "PS5-reparation: HDMI-port, rens og ny køling",
    short: "PS5",
    fullName: "PlayStation 5",
    liquidMetal: true,
    about: (p) => [
      "Den almindelige PlayStation 5 med diskdrev er den konsol, vi oftest har på bordet. To fejl går igen: sort skærm, fordi HDMI-porten er knækket indvendigt, og en konsol, der larmer og bliver varm, fordi blæser og køleprofil er fyldt med støv.",
      `HDMI-porten sidder loddet på bundkortet og skiftes med mikrolodning.${p.bundle ? ` Når konsollen alligevel er åben, renser vi den indvendigt, og pakken med port og rengøring koster ${kr(p.bundle)}${p.hdmi && p.hdmi > p.bundle ? `, mindre end porten alene til ${kr(p.hdmi)}` : ""}.` : ""}`,
      `Både den første PS5 og den slanke udgave (Slim) har flydende metal på chippen: ${LIQUID_METAL_NOTE}`,
    ],
    extraFaqs: () => [
      {
        question: "Reparerer I også PS5 Slim?",
        answer:
          "Ja. PS5 Slim får de samme fejl som den første PS5: knækket HDMI-port og støv i køleren. Vælg PlayStation 5, hvis din Slim har diskdrev, og PS5 Digital, hvis den ikke har. Vi bekræfter prisen, før vi går i gang.",
      },
    ],
  },
  "playstation-5-digital": {
    keyword: "PS5 Digital reparation",
    h1: "PS5 Digital-reparation: HDMI-port, rens og ny køling",
    short: "PS5 Digital",
    fullName: "PlayStation 5 Digital Edition",
    liquidMetal: true,
    about: (p) => [
      "PS5 Digital Edition er bygget som den almindelige PS5, bare uden diskdrev. Bundkort, HDMI-port, blæser og køling er de samme, så fejlene er også de samme: sort skærm efter et HDMI-kabel, der er blevet revet i, og en konsol, der larmer, når støvet har sat sig.",
      `Fordi der ikke er noget diskdrev, er Digital lidt smallere, men den skilles ad på samme måde.${p.bundle ? ` HDMI-port og indvendig rengøring koster ${kr(p.bundle)} i én pakke.` : ""}${p.clean ? ` Larmer den bare, er en rens med ny køling til ${kr(p.clean)} ofte nok.` : ""}`,
      `Også på Digital ${LIQUID_METAL_NOTE}`,
    ],
    extraFaqs: () => [
      {
        question: "Hvordan ved jeg, om jeg har en PS5 Digital?",
        answer:
          "Digital Edition har ingen diskskuffe og ingen udløserknap til disken. Er du i tvivl, så kig på mærkaten bag på konsollen, hvor modelnummeret står. Det starter med CFI-.",
      },
      {
        question: "Mister jeg mine downloadede spil?",
        answer:
          "Nej. På en Digital ligger alle spil på den interne lagring, og den rører vi ikke ved HDMI-port, rens eller blæser. Har du PS Plus, ligger gemte spil desuden i skyen.",
      },
    ],
  },
  "playstation-5-pro": {
    keyword: "PS5 Pro reparation",
    h1: "PS5 Pro-reparation: HDMI-port, rens og ny køling",
    short: "PS5 Pro",
    fullName: "PlayStation 5 Pro",
    liquidMetal: true,
    about: (p) => [
      "PS5 Pro kom i november 2024 og er den mest kraftfulde PlayStation. Den kører tunge spil længe ad gangen, og derfor betyder køling og luftgennemstrømning meget. Larmer blæseren mere end før, eller bliver konsollen varm bag på, er det tid til en rens.",
      `PS5 Pro har også flydende metal på chippen, og køleprofilen har fine riller, der skal holde metallet på plads. Ved en rens skifter vi termopuderne, tjekker det flydende metal og fornyer det kun, hvis det har flyttet sig.${p.clean ? ` Rens og ny køling koster ${kr(p.clean)}.` : ""}`,
      `HDMI-porten på Pro kan knække på samme måde som på de andre PS5-modeller, hvis kablet bliver trukket skævt ud.${p.bundle ? ` Vi skifter den med mikrolodning og renser konsollen i samme omgang for ${kr(p.bundle)}.` : ""}`,
    ],
    extraFaqs: () => [
      {
        question: "Kan jeg få en PS5 Pro repareret, selvom den er ny?",
        answer:
          "Er konsollen stadig dækket af producentens garanti, og er fejlen ikke opstået ved et uheld, så kontakt først forhandleren. Er garantien udløbet, eller er porten knækket ved et uheld, reparerer vi den til fast pris.",
      },
    ],
  },
  "playstation-4": {
    keyword: "PlayStation 4 reparation",
    h1: "PS4-reparation: rens, blæser og HDMI-port",
    short: "PS4",
    fullName: "PlayStation 4",
    liquidMetal: false,
    about: (p) => [
      "En PlayStation 4 har typisk mange år på bagen, og det hører man. Den hyppigste fejl er en blæser, der larmer som en støvsuger, fordi køleprofilen er fyldt med støv, og kølepastaen på chippen er tørret ud.",
      `PS4 har almindelig kølepasta, så ved en rens skiller vi konsollen ad, renser blæser og køleprofil og lægger ny pasta på.${p.clean ? ` Det koster ${kr(p.clean)} og tager 1-2 hverdage.` : ""} Vi skifter også HDMI-porten, hvis tv'et ikke længere får billede.`,
      "GTA 6 udkommer ikke til PS4. Vil du hellere skifte til en PS5, kan du sælge din PS4 til os og få pengene samme dag i butikken.",
    ],
    extraFaqs: () => [
      {
        question: "Kan det betale sig at reparere en PS4?",
        answer:
          "Ofte ja, hvis det er støv og varme. En rens får den til at køre roligere igen. Er reparationen dyr i forhold til konsollens værdi, siger vi det, og så kan du i stedet sælge den til os.",
      },
    ],
    extraLinks: [{ href: "/saelg-din-enhed/spillekonsol/playstation-4", label: "Sælg din PS4" }],
  },
  "playstation-4-pro": {
    keyword: "PS4 Pro reparation",
    h1: "PS4 Pro-reparation: rens, blæser og HDMI-port",
    short: "PS4 Pro",
    fullName: "PlayStation 4 Pro",
    liquidMetal: false,
    about: (p) => [
      "PS4 Pro er kendt for at larme, især i krævende spil. Det skyldes oftest støv i blæser og køleprofil og udtørret kølepasta, der får blæseren til at køre på fuld kraft.",
      `Vi skiller konsollen ad, renser blæser og køleprofil og lægger ny kølepasta på chippen.${p.clean ? ` Rens og ny kølepasta koster ${kr(p.clean)}.` : ""} Får tv'et intet billede, skifter vi også HDMI-porten.`,
    ],
    extraFaqs: () => [
      {
        question: "Hvorfor larmer min PS4 Pro så meget?",
        answer:
          "Næsten altid støv og udtørret kølepasta. Konsollen bliver varmere, og blæseren skruer op for at følge med. En rens med ny kølepasta løser det i de fleste tilfælde.",
      },
    ],
  },
  "xbox-series-x": {
    keyword: "Xbox Series X reparation",
    h1: "Xbox Series X-reparation: HDMI-port, rens og blæser",
    short: "Xbox Series X",
    fullName: "Xbox Series X",
    liquidMetal: false,
    about: (p) => [
      "Xbox Series X trækker luft ind i bunden og blæser den ud gennem toppen med én stor blæser. Står den på et tæppe eller tæt inde i et tv-møbel, samler den støv, og så stiger både temperatur og støj.",
      `Vi renser blæser og køleprofil og lægger ny kølepasta på.${p.clean ? ` Det koster ${kr(p.clean)}.` : ""} Får tv'et intet signal, skifter vi HDMI-porten med mikrolodning.`,
    ],
    extraFaqs: () => [],
  },
  "xbox-series-s": {
    keyword: "Xbox Series S reparation",
    h1: "Xbox Series S-reparation: HDMI-port, rens og blæser",
    short: "Xbox Series S",
    fullName: "Xbox Series S",
    liquidMetal: false,
    about: (p) => [
      "Xbox Series S er lille og har ikke meget plads til luft. Når støv sætter sig i blæseren og ved udblæsningen bag på, bliver den hurtigt varm og larmende.",
      `En rens med ny kølepasta får den til at køre roligt igen.${p.clean ? ` Det koster ${kr(p.clean)} og tager 1-2 hverdage.` : ""} Vi skifter også HDMI-porten, hvis billedet er forsvundet.`,
    ],
    extraFaqs: () => [],
  },
};

export function hasConsoleModelContent(modelSlug: string): boolean {
  return modelSlug in DEFINITIONS;
}

export function getConsoleModelPage(
  modelSlug: string,
  prices: ConsolePrices,
): ConsoleModelPage | null {
  const d = DEFINITIONS[modelSlug];
  if (!d) return null;

  const title = fitTitle([
    ...(prices.clean
      ? [
          `${d.keyword}: rens ${kr(prices.clean)} og HDMI-port | PhoneSpot`,
          `${d.keyword}: rens ${kr(prices.clean)} og HDMI-port`,
        ]
      : []),
    `${d.keyword} i Vejle og Slagelse | PhoneSpot`,
    `${d.keyword} | PhoneSpot`,
  ]);

  // Uden punktum efter "kr", så sætningen ikke ender med "kr..".
  const krShort = (n: number) => `${n.toLocaleString("da-DK")} kr`;
  const priceBits = [
    prices.clean && `rens og ny køling ${krShort(prices.clean)}`,
    prices.bundle && `HDMI-port + rengøring ${krShort(prices.bundle)}`,
  ].filter(Boolean) as string[];

  const lead = `${d.keyword} i Vejle og Slagelse${priceBits.length ? `: ${priceBits.join(", ")}` : ""}`;
  const descriptionVariants = [
    `${lead}. 2 års garanti. Aflever i butikken, eller send din ${d.short} ind.`,
    `${lead}. 2 års garanti. Aflever i butikken, eller send den ind.`,
    `${lead}. 2 års garanti.`,
  ];
  const description =
    descriptionVariants.find((v) => v.length <= 160) ?? descriptionVariants[descriptionVariants.length - 1];

  const answerParts = [
    `Vi reparerer ${d.fullName} hos PhoneSpot på Løversysselvej 3B i Vejle og i VestsjællandsCentret i Slagelse.`,
    prices.clean
      ? `Rens og ny køling koster ${kr(prices.clean)} og tager 1-2 hverdage.`
      : "",
    prices.bundle
      ? `HDMI-port og indvendig rengøring koster ${kr(prices.bundle)} og tager 2-3 hverdage.`
      : prices.hdmi
        ? `En ny HDMI-port koster ${kr(prices.hdmi)}.`
        : "",
    "Du får 2 års garanti, og du kan også sende konsollen ind.",
  ].filter(Boolean);

  const anchors = [
    prices.clean && { label: "Rens + ny køling", price: prices.clean },
    prices.bundle
      ? { label: "HDMI-port + rengøring", price: prices.bundle }
      : prices.hdmi && { label: "HDMI-port", price: prices.hdmi },
  ].filter(Boolean) as { label: string; price: number }[];

  const faqs: ConsoleFaq[] = [
    {
      question: `Hvor kan jeg få repareret min ${d.short}?`,
      answer: `I begge vores butikker: Løversysselvej 3B, 7100 Vejle, og VestsjællandsCentret 10A, 103, 4200 Slagelse. Bor du længere væk, kan du sende konsollen ind, så sender vi den retur, når den er klar.`,
    },
    ...(prices.clean
      ? [
          {
            question: `Hvad koster det at rense en ${d.short}?`,
            answer: `Rens og ny køling koster ${kr(prices.clean)}. Vi renser blæser, køleprofil og luftkanaler${d.liquidMetal ? ", skifter termopuderne og tjekker det flydende metal på chippen" : ", lægger ny kølepasta på chippen og skifter termopuder"}. Til sidst tester vi konsollen under belastning. Det tager 1-2 hverdage.`,
          },
        ]
      : []),
    ...(prices.bundle || prices.hdmi
      ? [
          {
            question: `Hvad koster en ny HDMI-port på ${d.short}?`,
            answer: prices.bundle
              ? `HDMI-port og indvendig rengøring koster ${kr(prices.bundle)} i én pakke${prices.hdmi ? `. Porten alene koster ${kr(prices.hdmi)}` : ""}. Porten skiftes med mikrolodning, og det tager 2-3 hverdage.`
              : `En ny HDMI-port koster ${kr(prices.hdmi!)}. Porten skiftes med mikrolodning.`,
          },
        ]
      : []),
    ...d.extraFaqs(prices),
    {
      question: "Hvilken garanti får jeg?",
      answer:
        "Konsolreparation har 2 års garanti. Garantien dækker ikke nye skader, fx hvis HDMI-kablet bliver revet ud igen.",
    },
  ];

  return {
    title,
    description,
    h1: d.h1,
    eyebrow: `Konsolreparation · ${d.fullName}`,
    answer: answerParts.join(" "),
    aboutHeading: `Det reparerer vi oftest på ${d.short}`,
    about: d.about(prices).filter(Boolean),
    anchors,
    faqs,
    links: [
      CLEAN_BLOG,
      ...(d.short.startsWith("PS5") ? [HDMI_BLOG] : []),
      ...LOCAL_LINKS,
      ...(d.extraLinks ?? []),
    ],
  };
}
