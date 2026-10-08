import type { Metadata } from "next";

export const SITE_URL = "https://phonespot.dk";

export type LocalRepairFaq = { question: string; answer: string };

export type LocalRepairTown = {
  /** Byen siden handler om (bruges i tekst og som areaServed). */
  name: string;
  /** Hvilken af vores butikker kunden kommer til. */
  storeSlug: "vejle" | "slagelse";
  path: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  heroLead: string;
  /** Byspecifik indledning, 2 afsnit. */
  intro: string[];
  travel: {
    /** Stor typografisk overskrift, fx "Ca. 25 min". */
    headline: string;
    /** Kort undertekst under overskriften. */
    caption: string;
    /** Byspecifikke afsnit om vejen til butikken. */
    paragraphs: string[];
  };
  /** Korte omegnsbyer, der nævnes naturligt på siden. */
  nearbyLine?: string;
  mailIn: { heading: string; text: string };
  faqs: LocalRepairFaq[];
};

export const LOCAL_REPAIR_TOWNS: Record<string, LocalRepairTown> = {
  horsens: {
    name: "Horsens",
    storeSlug: "vejle",
    path: "/reparation-horsens",
    metaTitle: "Mobilreparation Horsens – skærmskift i Vejle | PhoneSpot",
    metaDescription:
      "Fra Horsens er der ca. 25 min ad E45 til PhoneSpot i Vejle. Skærm- og batteriskift mens du venter, livstidsgaranti og gratis parkering.",
    h1: "Mobilreparation til dig i Horsens",
    heroLead:
      "Vores værksted ligger i Vejle, ca. 25 minutter fra Horsens ad E45. Kom forbi uden tidsbestilling, og få 90% af skærm- og batteriskift klar på 30 minutter. Foretrækker du ikke at køre, sender du enheden ind med en gratis fragtlabel.",
    intro: [
      "Har du knust skærmen eller et batteri, der ikke holder dagen, behøver du ikke vente på en tid. PhoneSpot i Vejle tager imod reparationer uden tidsbestilling, og de fleste skærm- og batteriskift er færdige på 30 minutter. Du kan derfor tage turen fra Horsens, få telefonen repareret og køre hjem igen.",
      "Du vælger selv skærmkvaliteten: budget, OEM eller original. Prisen er fast og oplyst, før vi går i gang, og du får livstidsgaranti på arbejde og dele. Her på siden kan du se aktuelle priser for de mest almindelige modeller.",
    ],
    travel: {
      headline: "Ca. 25 min",
      caption: "fra Horsens til Vejle ad E45",
      paragraphs: [
        "Fra Horsens følger du E45 mod Vejle. Turen tager ca. 25 minutter, afhængigt af trafikken. Butikken ligger på Løversysselvej 3B i Vejle.",
        "Der er gratis parkering ved butikken, så du kan stille bilen og gå direkte ind. Mens reparationen står på, kan du vente i butikken.",
      ],
    },
    nearbyLine:
      "Vi tager også imod kunder fra Hedensted, Juelsminde, Give, Jelling, Børkop og Egtved. Fra Hedensted er der ca. 15 minutter til butikken i Vejle.",
    mailIn: {
      heading: "Vil du helst slippe for turen til Vejle?",
      text: "Så send enheden ind. Du booker online og vælger Send ind, og vi mailer dig en gratis fragtlabel. Du afleverer pakken i en pakkeshop i Horsens, og vi reparerer enheden og kontakter dig, når den er færdig.",
    },
    faqs: [
      {
        question: "Hvor langt er der fra Horsens til PhoneSpot i Vejle?",
        answer:
          "Der er ca. 25 minutters kørsel ad E45 fra Horsens til Løversysselvej 3B i Vejle. Tiden afhænger af trafikken.",
      },
      {
        question: "Kan jeg komme forbi fra Horsens uden tidsbestilling?",
        answer:
          "Ja, du kan komme som walk-in. 90% af skærm- og batteriskift er klar på 30 minutter, så du kan vente i butikken og køre hjem med en repareret telefon. Vil du være sikker på, at vi har tid, kan du også booke online og vælge Vejle.",
      },
      {
        question: "Er der gratis parkering ved butikken i Vejle?",
        answer:
          "Ja, der er gratis parkering ved butikken på Løversysselvej 3B.",
      },
      {
        question: "Jeg vil ikke køre til Vejle. Kan jeg sende telefonen ind fra Horsens?",
        answer:
          "Ja. Du booker online og vælger Send ind. Så mailer vi dig en gratis fragtlabel, og du afleverer pakken i en pakkeshop. Vi reparerer enheden og kontakter dig, når den er færdig. Garantien er den samme som ved en reparation i butikken.",
      },
      {
        question: "Hvad koster en skærmreparation, hvis jeg kommer fra Horsens?",
        answer:
          "Prisen er den samme, uanset hvor du bor. Den afhænger af model og den skærmkvalitet, du vælger: budget, OEM eller original. Se prisoversigten på siden eller find din model under reparation. Prisen er fast og inkluderer moms, reservedel og garanti.",
      },
      {
        question: "Skal jeg betale for at få tjekket fejlen?",
        answer:
          "Nej, vi laver en hurtig diagnose gratis ved disken i butikken. Kræver fejlen en fuld diagnose, fx fejl på printet, koster den 249 kr., og det aftaler vi med dig først.",
      },
    ],
  },

  kolding: {
    name: "Kolding",
    storeSlug: "vejle",
    path: "/reparation-kolding",
    metaTitle: "Mobilreparation Kolding – skærmskift i Vejle | PhoneSpot",
    metaDescription:
      "Ca. 25 min ad E45 fra Kolding til PhoneSpot i Vejle. Skærm- og batteriskift mens du venter, livstidsgaranti, gratis parkering eller send ind.",
    h1: "Mobilreparation til dig i Kolding",
    heroLead:
      "Fra Kolding er der ca. 25 minutter ad E45 til vores værksted i Vejle. Kom forbi uden tidsbestilling, eller book en tid online. Vil du ikke køre, kan du sende din telefon ind med en gratis fragtlabel.",
    intro: [
      "En knust skærm eller et træt batteri skal ikke tage en hel dag. Kører du fra Kolding nordpå ad E45, når du PhoneSpot i Vejle på ca. 25 minutter, og 90% af skærm- og batteriskift er klar på 30 minutter. Det gør turen til et ærinde, der kan klares på en formiddag eller i en eftermiddagspause.",
      "Du bestemmer selv, om skærmen skal være budget, OEM eller original, og vi oplyser en fast pris, inden vi begynder. Reparationen følges af livstidsgaranti på arbejde og dele. Se aktuelle priser længere nede på siden.",
    ],
    travel: {
      headline: "Ca. 25 min",
      caption: "fra Kolding til Vejle ad E45",
      paragraphs: [
        "Fra Kolding kører du nordpå ad E45 mod Vejle. Turen tager ca. 25 minutter, afhængigt af trafikken. Vi ligger på Løversysselvej 3B i Vejle.",
        "Parkering ved butikken er gratis. Har du ikke lyst til at køre frem og tilbage, kan du i stedet sende enheden ind.",
      ],
    },
    mailIn: {
      heading: "Kolding til Vejle og retur er ikke nødvendigt",
      text: "Book online, og vælg Send ind. Vi mailer en gratis fragtlabel, du afleverer pakken i en pakkeshop, og vi kontakter dig, når enheden er repareret. Du slipper for turen, men får samme garanti som i butikken.",
    },
    faqs: [
      {
        question: "Hvor lang tid tager det at køre fra Kolding til Vejle?",
        answer:
          "Ca. 25 minutter ad E45 til Løversysselvej 3B i Vejle. Tiden afhænger af trafikken.",
      },
      {
        question: "Kan jeg vente, mens min telefon bliver repareret?",
        answer:
          "Ja. Du kan komme uden tidsbestilling, og 90% af skærm- og batteriskift er klar på 30 minutter. Så kan du vente i butikken og tage telefonen med hjem samme dag.",
      },
      {
        question: "Er der gratis parkering i Vejle?",
        answer:
          "Ja, der er gratis parkering ved butikken på Løversysselvej 3B.",
      },
      {
        question: "Kan jeg sende min telefon ind fra Kolding i stedet for at køre?",
        answer:
          "Ja. Du booker online og vælger Send ind. Vi mailer en gratis fragtlabel, du afleverer pakken i en pakkeshop, og vi reparerer og kontakter dig, når den er færdig. Vi sender enheden tilbage til dig.",
      },
      {
        question: "Gælder garantien også, hvis jeg bor i Kolding?",
        answer:
          "Ja. Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele, uanset hvor du bor eller om enheden er afleveret i butikken eller sendt ind. Garantien dækker ikke nye skader som fald eller væske. Behandling af vandskade har 3 måneders garanti.",
      },
      {
        question: "Kan jeg vælge skærmkvalitet?",
        answer:
          "Ja. Du vælger mellem budget, OEM og original, hvor tilbuddet findes til din model. Prisen er fast og oplyses, før vi går i gang.",
      },
    ],
  },

  fredericia: {
    name: "Fredericia",
    storeSlug: "vejle",
    path: "/reparation-fredericia",
    metaTitle: "Mobilreparation Fredericia – skærmskift i Vejle | PhoneSpot",
    metaDescription:
      "Fra Fredericia er der ca. 25 min til PhoneSpot i Vejle. Skærm- og batteriskift mens du venter, livstidsgaranti og gratis parkering.",
    h1: "Mobilreparation til dig i Fredericia",
    heroLead:
      "Fra Fredericia er der ca. 25 minutter til vores værksted i Vejle via E45 og Vejle Fjordbro. Kom forbi uden tidsbestilling, eller send telefonen ind med en gratis fragtlabel.",
    intro: [
      "Er skærmen revnet, eller holder batteriet ikke længere? Fra Fredericia kører du til PhoneSpot i Vejle på ca. 25 minutter, og 90% af skærm- og batteriskift er klar på 30 minutter. Du kan komme som walk-in og vente, mens vi arbejder.",
      "Prisen er fast og oplyses, før reparationen begynder. Du vælger selv mellem budget, OEM og original skærm, og du får livstidsgaranti på arbejde og dele. Se priser på de mest almindelige modeller længere nede.",
    ],
    travel: {
      headline: "Ca. 25 min",
      caption: "fra Fredericia til Vejle via E45 / Vejle Fjordbro",
      paragraphs: [
        "Fra Fredericia kører du mod Vejle via E45 eller Vejle Fjordbro. Turen tager ca. 25 minutter, afhængigt af trafikken. Butikken ligger på Løversysselvej 3B i Vejle.",
        "Der er gratis parkering ved butikken. Kommer du fra Fredericia med arbejde i Vejle, kan du også aflevere telefonen og hente den igen, når den er klar.",
      ],
    },
    nearbyLine:
      "Vi tager også imod kunder fra Børkop, Egtved, Jelling, Give, Hedensted og Juelsminde.",
    mailIn: {
      heading: "Foretrækker du at blive hjemme i Fredericia?",
      text: "Book online og vælg Send ind. Vi mailer en gratis fragtlabel, du afleverer pakken i en pakkeshop, og vi reparerer enheden og kontakter dig, når den er færdig.",
    },
    faqs: [
      {
        question: "Hvor langt er der fra Fredericia til jeres butik i Vejle?",
        answer:
          "Der er ca. 25 minutters kørsel via E45 eller Vejle Fjordbro til Løversysselvej 3B i Vejle. Tiden afhænger af trafikken.",
      },
      {
        question: "Kan jeg komme forbi uden at bestille tid?",
        answer:
          "Ja, du kan komme som walk-in. 90% af skærm- og batteriskift er klar på 30 minutter. Vil du være sikker på, at vi har tid, kan du booke online og vælge Vejle.",
      },
      {
        question: "Er der parkering ved butikken?",
        answer:
          "Ja, der er gratis parkering ved butikken på Løversysselvej 3B.",
      },
      {
        question: "Kan jeg sende min iPhone eller Samsung ind fra Fredericia?",
        answer:
          "Ja. Du booker online og vælger Send ind. Vi mailer en gratis fragtlabel, du afleverer pakken i en pakkeshop, og vi reparerer og kontakter dig, når den er færdig.",
      },
      {
        question: "Hvad hvis fejlen ikke er en skærm eller et batteri?",
        answer:
          "Kom forbi, så laver vi en hurtig diagnose gratis ved disken. Kræver fejlen en fuld diagnose, fx fejl på printet, koster den 249 kr., og det aftaler vi med dig først.",
      },
      {
        question: "Hvilken garanti får jeg på reparationen?",
        answer:
          "Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele. Garantien dækker ikke nye skader som fald eller væske, og behandling af vandskade har 3 måneders garanti. Garantien gælder både ved reparation i butikken og ved indsendelse.",
      },
    ],
  },

  hedensted: {
    name: "Hedensted",
    storeSlug: "vejle",
    path: "/reparation-hedensted",
    metaTitle: "Mobilreparation Hedensted – skærmskift i Vejle | PhoneSpot",
    metaDescription:
      "Fra Hedensted er der ca. 15 min ad E45 til PhoneSpot i Vejle. Skærm- og batteriskift mens du venter, livstidsgaranti og gratis parkering.",
    h1: "Mobilreparation til dig i Hedensted",
    heroLead:
      "Vores værksted i Vejle ligger ca. 15 minutter fra Hedensted ad E45. Kom forbi uden tidsbestilling, og få 90% af skærm- og batteriskift klar på 30 minutter. Vil du hellere blive hjemme, sender du telefonen ind med en gratis fragtlabel.",
    intro: [
      "Bor du i Hedensted, er PhoneSpot i Vejle det nærmeste værksted med skærm- og batteriskift, mens du venter. Turen tager ca. 15 minutter, og de fleste reparationer er klar på 30 minutter, så du er hjemme igen, før du ville have nået at sende telefonen afsted.",
      "Du vælger selv skærmkvaliteten: budget, OEM eller original. Prisen er fast og oplyst, før vi går i gang, og du får livstidsgaranti på arbejde og dele. Længere nede kan du se aktuelle priser på de mest almindelige modeller.",
    ],
    travel: {
      headline: "Ca. 15 min",
      caption: "fra Hedensted til Vejle ad E45",
      paragraphs: [
        "Fra Hedensted kører du på E45 mod Vejle. Turen tager ca. 15 minutter, afhængigt af trafikken. Butikken ligger på Løversysselvej 3B i Vejle.",
        "Der er gratis parkering ved butikken, så du kan køre direkte hen og vente, mens vi arbejder. Kommer du forbi efter arbejde, kan du også aflevere telefonen og hente den, når den er klar.",
      ],
    },
    nearbyLine:
      "Vi tager også imod kunder fra Juelsminde, Løsning, Daugård, Stouby og Barrit.",
    mailIn: {
      heading: "Vil du hellere blive i Hedensted?",
      text: "Book online og vælg Send ind. Vi mailer dig en gratis fragtlabel, du afleverer pakken i en pakkeshop i Hedensted, og vi reparerer enheden og kontakter dig, når den er færdig.",
    },
    faqs: [
      {
        question: "Hvor langt er der fra Hedensted til PhoneSpot i Vejle?",
        answer:
          "Der er ca. 15 minutters kørsel ad E45 fra Hedensted til Løversysselvej 3B i Vejle. Tiden afhænger af trafikken.",
      },
      {
        question: "Kan jeg komme forbi uden at bestille tid?",
        answer:
          "Ja, du kan komme som walk-in. 90% af skærm- og batteriskift er klar på 30 minutter, så du kan vente i butikken. Vil du være sikker på, at vi har tid, kan du booke online og vælge Vejle.",
      },
      {
        question: "Er der gratis parkering ved butikken?",
        answer:
          "Ja, der er gratis parkering ved butikken på Løversysselvej 3B i Vejle.",
      },
      {
        question: "Kan jeg sende min telefon ind fra Hedensted?",
        answer:
          "Ja. Du booker online og vælger Send ind. Vi mailer en gratis fragtlabel, du afleverer pakken i en pakkeshop, og vi reparerer og kontakter dig, når den er færdig. Garantien er den samme som ved reparation i butikken.",
      },
      {
        question: "Koster det mere, når jeg kommer fra Hedensted?",
        answer:
          "Nej, prisen er den samme, uanset hvor du bor. Den afhænger af model og den skærmkvalitet, du vælger. Prisen er fast og inkluderer moms, reservedel og garanti.",
      },
      {
        question: "Skal jeg betale for at få tjekket fejlen?",
        answer:
          "Nej, vi laver en hurtig diagnose gratis ved disken i butikken. Kræver fejlen en fuld diagnose, fx fejl på printet, koster den 249 kr., og det aftaler vi med dig først.",
      },
    ],
  },

  slagelse: {
    name: "Slagelse",
    storeSlug: "slagelse",
    path: "/reparation-slagelse",
    metaTitle: "Mobilreparation i Slagelse – livstidsgaranti | PhoneSpot",
    metaDescription:
      "iPhone- og Samsung-reparation i Slagelse med livstidsgaranti. 90% af skærm- og batteriskift er klar på 30 min. Walk-in i VestsjællandsCentret.",
    h1: "Mobilreparation i Slagelse — mens du venter",
    heroLead:
      "Kom forbi PhoneSpot i VestsjællandsCentret uden tidsbestilling. 90% af skærm- og batteriskift er klar på 30 minutter, og du får livstidsgaranti på arbejde og dele.",
    intro: [
      "PhoneSpot Slagelse ligger i VestsjællandsCentret. Du kan komme forbi med din iPhone, Samsung eller tablet uden at bestille tid, og vi tjekker fejlen gratis ved disken, før vi giver dig en fast pris.",
      "Vi skifter skærme, batterier og opladerstik, og du vælger selv skærmkvaliteten: budget, OEM eller original. 90% af skærm- og batteriskift er klar på 30 minutter, så du kan gøre andre ærinder i centret, mens du venter.",
    ],
    travel: {
      headline: "I centret",
      caption: "VestsjællandsCentret 10A, 103 i Slagelse",
      paragraphs: [
        "Butikken ligger i VestsjællandsCentret, Slagelse, og har parkering ved centret. Brug Google Maps-linket ovenfor, hvis du vil have rutevejledning.",
        "Bor du længere væk, eller har du ikke tid til at komme forbi, kan du sende enheden ind med en gratis fragtlabel.",
      ],
    },
    mailIn: {
      heading: "Bor du længere væk?",
      text: "Book online og vælg Send ind. Vi mailer en gratis fragtlabel, du afleverer pakken i en pakkeshop, og vi reparerer enheden og kontakter dig, når den er færdig.",
    },
    faqs: [
      {
        question: "Hvor ligger PhoneSpot Slagelse?",
        answer:
          "PhoneSpot Slagelse ligger i VestsjællandsCentret, VestsjællandsCentret 10A, 103, 4200 Slagelse. Der er parkering ved centret.",
      },
      {
        question: "Kan jeg komme forbi uden tidsbestilling?",
        answer:
          "Ja, vi tager imod reparationer uden tidsbestilling. 90% af skærm- og batteriskift er klar på 30 minutter.",
      },
      {
        question: "Hvad er jeres åbningstider i Slagelse?",
        answer:
          "Mandag til fredag kl. 10:00 – 19:00, lørdag kl. 10:00 – 17:00 og søndag kl. 10:00 – 17:00.",
      },
      {
        question: "Hvad koster reparation i Slagelse?",
        answer:
          "Prisen afhænger af model, reparation og den skærmkvalitet, du vælger. Se prisoversigten her på siden. Priserne er faste og inkluderer moms, reservedel og garanti.",
      },
      {
        question: "Hvad er jeres garanti på reparationer?",
        answer:
          "Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele. Garantien dækker ikke nye skader som fald, tryk eller væske. Behandling af vandskade har 3 måneders garanti.",
      },
      {
        question: "Kan jeg sende min telefon ind i stedet?",
        answer:
          "Ja. Du booker online og vælger Send ind. Vi mailer en gratis fragtlabel, du afleverer pakken i en pakkeshop, og vi kontakter dig, når enheden er repareret.",
      },
    ],
  },
};

export function buildTownMetadata(town: LocalRepairTown): Metadata {
  const url = `${SITE_URL}${town.path}`;
  return {
    title: town.metaTitle,
    description: town.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: town.metaTitle,
      description: town.metaDescription,
      url,
      type: "website",
    },
  };
}

/** Byer, der linkes til fra /reparation-vejle ("Kunder fra omegnen"). */
export const SATELLITE_TOWN_KEYS = ["hedensted", "horsens", "kolding", "fredericia"] as const;
