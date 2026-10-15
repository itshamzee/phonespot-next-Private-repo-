import type { BrandHubContent, HubFaq } from "./brand-hub-content";

/**
 * Brand-hub-indhold til konsol (Xbox) og husholdningsapparater. Apparater har
 * 12 måneders garanti på dele og arbejde, aldrig livstid. Vi er et uafhængigt
 * værksted: ingen "autoriseret/officiel/certificeret".
 */

export const APPLIANCE_WARRANTY_FAQ: HubFaq = {
  question: "Hvilken garanti får jeg på reparationen?",
  answer:
    "Du får 12 måneders garanti på dele og arbejde. Opstår den samme fejl igen på den del, vi har skiftet, ser vi på den uden beregning. Nye skader som fald, væske og forkert brug er ikke dækket, og et batteris naturlige slid over tid er ikke en fejl.",
};

const mailIn = (device: string): HubFaq => ({
  question: `Kan jeg sende min ${device} ind til reparation?`,
  answer:
    "Ja. Bor du uden for Vejle og Slagelse, kan du sende enheden ind med en gratis fragtlabel. Garantien er den samme som i butikken.",
});

const batteryFaq = (device: string): HubFaq => ({
  question: `Hvilke batterier bruger I til ${device}?`,
  answer:
    "Vi bruger kompatible batterier af god kvalitet. Prisen på batteriskift står ved din model, og du kender den, før vi går i gang.",
});

const notAffiliated = (name: string): HubFaq => ({
  question: `Er I tilknyttet ${name}?`,
  answer: `Nej, vi er et uafhængigt værksted og ikke tilknyttet ${name}. Har du stadig producentgaranti, bør du kontakte producenten først.`,
});

const producerWarranty: HubFaq = {
  question: "Min maskine er under producentgaranti. Kan I reparere den?",
  answer:
    "Kontakt producenten først. Åbner eller reparerer andre maskinen, kan det få betydning for garantien.",
};

const diagnosticFaq: HubFaq = {
  question: "Hvad koster fejlsøgning?",
  answer:
    "Prisen på fejlsøgning står ved din model. Vælger du reparation bagefter, oplyser vi prisen, før vi går i gang.",
};

export const APPLIANCE_HUB_CONTENT: Record<string, BrandHubContent> = {
  xbox: {
    label: "Xbox",
    answer: (p) =>
      `Vi reparerer Xbox i Vejle og Slagelse: fejlsøgning, HDMI-port, strømproblemer, overophedning og controllere${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang. Kom forbi med konsollen eller controlleren, så tjekker vi fejlen ved disken, eller send den ind med gratis fragtlabel.`,
    body: [
      "De mest almindelige fejl på Xbox er en defekt HDMI-port, en konsol der slukker af sig selv eller bliver meget varm, og controllere med stickdrift eller knapper, der ikke svarer. Find din model nedenfor for at se prisen.",
      "Står din konsol eller controller ikke på listen, så ring til os, så hører vi, om vi kan hjælpe. Vilkår aftales ved den enkelte reparation.",
    ],
    categoryNotes: {},
    cityNote:
      "Kom forbi med din Xbox eller controller, så tjekker vi fejlen ved disken og giver dig en fast pris.",
    faqs: [
      {
        question: "Kan I reparere en Xbox med defekt HDMI-port?",
        answer:
          "Ja, det er en af de mest almindelige reparationer på konsoller. Find din model for at se prisen, eller kom forbi, så tjekker vi fejlen.",
      },
      {
        question: "Min Xbox bliver meget varm og slukker. Kan det repareres?",
        answer:
          "Ofte er årsagen støv, tør termisk pasta eller en defekt blæser. Vi finder fejlen og oplyser prisen, før vi går i gang.",
      },
      {
        question: "Kan I reparere en Xbox-controller med stickdrift?",
        answer:
          "Ja. Find Xbox Wireless Controller på siden for at se prisen på reparationen.",
      },
      {
        question: "Hvilken garanti får jeg på reparationen?",
        answer:
          "Vilkårene aftales ved den enkelte reparation, og du får dem, før vi går i gang.",
      },
      mailIn("Xbox"),
    ],
  },
  dyson: {
    label: "Dyson",
    answer: (p) =>
      `Vi reparerer Dyson-støvsugere i Vejle og Slagelse: batteriskift, sugeeffekt, børstehoved, motor og fejlsøgning${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og 12 måneders garanti på dele og arbejde. Kom forbi, eller send støvsugeren ind med gratis fragtlabel.`,
    body: [
      "En Dyson, der taber sugekraft, blinker med rødt lys eller kun kører et par minutter, har oftest et slidt batteri, tilstoppede filtre eller et defekt børstehoved. Mange fejl kan løses uden at købe en ny støvsuger.",
      "Find din model nedenfor for at se priser. Er du i tvivl om, hvad der er galt, så kom forbi, så tjekker vi den ved disken.",
    ],
    categoryNotes: {
      batteriskift:
        "Kører støvsugeren kun kort tid, eller lukker den ned under brug, er et nyt batteri ofte løsningen. Vi bruger kompatible batterier af god kvalitet.",
    },
    cityNote:
      "Kom forbi med din Dyson, så tjekker vi fejlen ved disken og giver dig en fast pris.",
    faqs: [
      {
        question: "Hvad koster et batteriskift på en Dyson?",
        answer:
          "Prisen afhænger af modellen. Find din Dyson for at se den faste pris. Vi bruger kompatible batterier af god kvalitet.",
      },
      {
        question: "Min Dyson mister sugekraft. Hvad kan der være galt?",
        answer:
          "Det skyldes ofte tilstoppede filtre, en blokeret slange eller et slidt batteri. Kom forbi, så finder vi årsagen og oplyser prisen, før vi går i gang.",
      },
      {
        question: "Er I tilknyttet Dyson?",
        answer:
          "Vi er et uafhængigt værksted og ikke tilknyttet Dyson. Har du stadig producentgaranti, bør du kontakte Dyson først, så du ikke risikerer at miste den.",
      },
      APPLIANCE_WARRANTY_FAQ,
      mailIn("Dyson"),
    ],
  },
  roborock: {
    label: "Roborock",
    answer: (p) =>
      `Vi reparerer Roborock robotstøvsugere i Vejle og Slagelse: batteriskift, hjul, børster, sensorer og fejlsøgning${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og 12 måneders garanti på dele og arbejde. Kom forbi, eller send robotten ind med gratis fragtlabel.`,
    body: [
      "En robotstøvsuger, der stopper midt i rummet, kører i ring eller ikke vender hjem til opladeren, har ofte et slidt batteri, snavsede sensorer eller et hjul, der sidder fast.",
      "Find din model nedenfor for at se priser. Står den ikke på listen, så ring til os, så hører vi, om vi kan hjælpe.",
    ],
    categoryNotes: {
      batteriskift:
        "Holder robotten ikke en hel rengøring, er batteriet slidt. Vi bruger kompatible batterier af god kvalitet.",
    },
    cityNote:
      "Kom forbi med din Roborock, så tjekker vi fejlen ved disken og giver dig en fast pris.",
    faqs: [
      {
        question: "Min Roborock stopper midt i rengøringen. Kan det repareres?",
        answer:
          "Ofte er det et slidt batteri eller en sensor, der er dækket af støv. Vi finder fejlen og oplyser prisen, før vi går i gang.",
      },
      batteryFaq("Roborock"),
      notAffiliated("Roborock"),
      APPLIANCE_WARRANTY_FAQ,
      mailIn("robotstøvsuger"),
    ],
  },
  irobot: {
    label: "iRobot",
    answer: (p) =>
      `Vi reparerer iRobot Roomba i Vejle og Slagelse: batteriskift, hjul, børster, sensorer og fejlsøgning${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og 12 måneders garanti på dele og arbejde. Kom forbi, eller send robotten ind med gratis fragtlabel.`,
    body: [
      "En Roomba, der giver fejlbeskeder, ikke oplader eller kører kort tid, har ofte brug for et nyt batteri eller en rengøring af sensorer og hjul.",
      "Find din model nedenfor for at se priser. Står den ikke på listen, så ring til os, så hører vi, om vi kan hjælpe.",
    ],
    categoryNotes: {
      batteriskift:
        "Holder Roomba'en kun kort tid, er batteriet sandsynligvis slidt. Vi bruger kompatible batterier af god kvalitet.",
    },
    cityNote:
      "Kom forbi med din Roomba, så tjekker vi fejlen ved disken og giver dig en fast pris.",
    faqs: [
      {
        question: "Min Roomba oplader ikke. Hvad kan der være galt?",
        answer:
          "Det kan være batteriet, ladekontakterne eller opladeren. Vi tjekker den og oplyser prisen, før vi går i gang.",
      },
      batteryFaq("iRobot"),
      notAffiliated("iRobot"),
      APPLIANCE_WARRANTY_FAQ,
      mailIn("Roomba"),
    ],
  },
  nespresso: {
    label: "Nespresso",
    answer: (p) =>
      `Vi reparerer Nespresso-maskiner i Vejle og Slagelse: fejlsøgning, pumpe, lækage og afkalkning${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og 12 måneders garanti på dele og arbejde. Er maskinen stadig under producentens garanti, skal du kontakte producenten først.`,
    body: [
      "En kaffemaskine, der ikke pumper vand, løber over eller blinker med fejl, kan ofte repareres, så du undgår at købe en ny. Typiske årsager er kalk, en slidt pumpe eller en utæt pakning.",
      "Find din model nedenfor for at se prisen på fejlsøgning. Er maskinen under garanti hos producenten, så kontakt dem først, så du ikke mister garantien.",
    ],
    categoryNotes: {
      diagnostik:
        "Vi finder fejlen og oplyser prisen på reparationen, før vi går videre.",
    },
    cityNote:
      "Kom forbi med maskinen, så finder vi fejlen og giver dig en fast pris på reparationen.",
    faqs: [
      {
        question: "Min Nespresso pumper ikke vand. Kan den repareres?",
        answer:
          "Ofte er det kalk eller en slidt pumpe. Vi finder årsagen og oplyser prisen, før vi går i gang.",
      },
      diagnosticFaq,
      producerWarranty,
      APPLIANCE_WARRANTY_FAQ,
      mailIn("kaffemaskine"),
    ],
  },
  delonghi: {
    label: "De'Longhi",
    answer: (p) =>
      `Vi reparerer De'Longhi kaffemaskiner i Vejle og Slagelse: fejlsøgning, pumpe, bryggeenhed, lækage og afkalkning${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og 12 måneders garanti på dele og arbejde. Er maskinen under producentgaranti, skal du kontakte producenten først.`,
    body: [
      "Fuldautomatiske kaffemaskiner har mange bevægelige dele. Fejlbeskeder, svag kaffe, støj eller vand under maskinen skyldes ofte kalk, en tilstoppet bryggeenhed eller en slidt pumpe.",
      "Find din model nedenfor for at se prisen på fejlsøgning. Er maskinen under garanti hos producenten, så kontakt dem først.",
    ],
    categoryNotes: {
      diagnostik:
        "Vi finder fejlen og oplyser prisen på reparationen, før vi går videre.",
    },
    cityNote:
      "Kom forbi med maskinen, så finder vi fejlen og giver dig en fast pris på reparationen.",
    faqs: [
      {
        question: "Min De'Longhi lækker vand. Kan den repareres?",
        answer:
          "Ofte er det en pakning, en slange eller bryggeenheden. Vi finder årsagen og oplyser prisen, før vi går i gang.",
      },
      diagnosticFaq,
      producerWarranty,
      APPLIANCE_WARRANTY_FAQ,
      mailIn("kaffemaskine"),
    ],
  },
};
