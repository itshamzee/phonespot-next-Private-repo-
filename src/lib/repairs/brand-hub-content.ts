import type { DeviceType } from "@/lib/supabase/types";

export type HubFaq = { question: string; answer: string };

export type BrandHubContent = {
  /** Kort navn i title/H1, fx "Samsung". */
  label: string;
  /** Svar-først-afsnit (ca. 40-60 ord). Fra-pris indsættes, hvis den findes. */
  answer: (fromPrice: string | null) => string;
  /** Redaktionel intro under svaret: brand-specifik viden. */
  body: string[];
  /** Brand-specifikke noter pr. reparationstype (nøgle = lowercase kategori). */
  categoryNotes: Record<string, string>;
  /** By-sektion: hvad der er særligt for mærket i butikkerne. */
  cityNote: string;
  faqs: HubFaq[];
};

export const WARRANTY_PHONE_TABLET = "livstidsgaranti på arbejde og dele";
export const WARRANTY_OTHER = "vilkår aftales ved den enkelte reparation";

export function hasLifetimeWarranty(deviceType: DeviceType): boolean {
  return deviceType === "smartphone" || deviceType === "tablet";
}

export const NO_PRICE_TEXT = "Fast pris efter gratis hurtigt tjek ved disken";

const LIFETIME_FAQ: HubFaq = {
  question: "Hvilken garanti får jeg på reparationen?",
  answer:
    "Du får livstidsgaranti på arbejde og dele. Opstår den samme fejl igen på den del, vi har skiftet, reparerer vi den uden beregning. Nye skader som fald, tryk og væske er ikke dækket, og et batteris naturlige kapacitetsfald over tid er ikke en fejl. Behandling af vandskade har 3 måneders garanti.",
};

const MAIL_IN_FAQ = (device: string): HubFaq => ({
  question: `Kan jeg sende min ${device} ind til reparation?`,
  answer:
    "Ja. Bor du uden for Vejle og Slagelse, kan du sende enheden ind med en gratis fragtlabel. Garantien er den samme som i butikken.",
});

export const BRAND_HUB_CONTENT: Record<string, BrandHubContent> = {
  samsung: {
    label: "Samsung",
    answer: (p) =>
      `Vi reparerer Samsung Galaxy i Vejle og Slagelse: skærmskift, batteriskift, ladestik og kamera${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og livstidsgaranti på arbejde og dele. Kom forbi uden tid, eller send telefonen ind med gratis fragtlabel, hvis du bor længere væk.`,
    body: [
      "Galaxy S-serien, A-serien, Z Fold og Z Flip er bygget forskelligt, og det afgør både pris og tid. En skærm til en S-model med buede kanter koster mere end skærmen til en A-model, og på Fold og Flip er der to skærme at tage højde for. Find derfor din præcise model nedenfor og se prisen på netop den.",
      "Hvor det er muligt, vælger du selv skærmkvaliteten, og du ser forskellen mellem budget, OEM og original på modelsiden. Skærmskift og batteriskift er ofte klar på 30 minutter, når delen er på lager, så du kan vente i butikken.",
    ],
    categoryNotes: {
      skærmskift:
        "Revner, striber eller sort billede. Vi viser de tilgængelige skærmkvaliteter til din Galaxy-model, så du kan vælge efter budget.",
      batteriskift:
        "Holder din Galaxy ikke en dag, eller lukker den ned ved 20-30 %, er et nyt batteri ofte nok.",
    },
    cityNote:
      "Kom forbi med din Galaxy, så tjekker vi fejlen ved disken og giver dig en fast pris.",
    faqs: [
      {
        question: "Hvad koster et skærmskift på Samsung Galaxy?",
        answer:
          "Prisen afhænger af modellen og den skærmkvalitet, du vælger. En A-model koster typisk mindre end en S-model eller en Z Fold. Find din Galaxy på siden for at se den faste pris på netop din model.",
      },
      {
        question: "Kan I skifte skærm på en Galaxy S23 Ultra eller S24 Ultra?",
        answer:
          "Ja, find modellen på siden og se prisen. Du får en fast pris, før vi går i gang. Kom forbi, så tjekker vi, om det kun er skærmen, der er skadet.",
      },
      {
        question: "Kan I reparere Samsung Galaxy Z Flip og Z Fold?",
        answer:
          "Foldbare modeller har to skærme og kræver mere tid. Ring eller kom forbi med telefonen, så vurderer vi fejlen ved disken og giver en fast pris, før vi begynder.",
      },
      {
        question: "Hvor lang tid tager en Samsung-reparation?",
        answer:
          "Skærmskift og batteriskift er ofte klar på 30 minutter, når delen er på lager. Andre reparationer tager længere tid. Vi oplyser tiden, før du afleverer telefonen.",
      },
      LIFETIME_FAQ,
      MAIL_IN_FAQ("Samsung"),
    ],
  },
  "google-pixel": {
    label: "Google Pixel",
    answer: (p) =>
      `Vi reparerer Google Pixel i Vejle og Slagelse: skærmskift, batteriskift og ladestik${p ? `, fra ${p}` : ""}. Prisen er fast og oplyst, før vi går i gang, og du får livstidsgaranti på arbejde og dele. Skal en reservedel hjem først, oplyser vi tiden, før du afleverer telefonen.`,
    body: [
      "Pixel er ikke så udbredt i Danmark som iPhone og Samsung, så reservedele er ikke altid på hylden. Ring gerne til butikken, hvis du vil vide, om din model kan klares samme dag.",
      "Find din Pixel-model nedenfor for at se priser. Har modellen ingen pris endnu, får du en fast pris efter et gratis hurtigt tjek ved disken.",
    ],
    categoryNotes: {
      skærmskift:
        "Vi gennemgår med dig, hvad der er skadet, og giver en fast pris, før vi åbner telefonen.",
      batteriskift:
        "Holder din Pixel ikke længere en dag, eller lukker den uventet ned, er batteriet et godt sted at starte.",
    },
    cityNote:
      "Har du en Pixel, så ring til butikken først, hvis du vil vide, om reservedelen er på lager.",
    faqs: [
      {
        question: "Reparerer I Google Pixel?",
        answer:
          "Ja, i begge butikker. Find din model på siden for at se, hvilke reparationer vi har priser på.",
      },
      {
        question: "Hvad koster et skærmskift på en Pixel?",
        answer:
          "Prisen afhænger af modellen. Se den faste pris på modellens side. Har modellen ingen pris endnu, får du en fast pris efter et gratis hurtigt tjek ved disken.",
      },
      {
        question: "Kan I reparere en Pixel samme dag?",
        answer:
          "Det afhænger af, om delen er på lager. Ring til butikken før dit besøg, så oplyser vi tiden.",
      },
      {
        question: "Kan en Pixel med batteriproblemer repareres?",
        answer:
          "Ja, batteriet kan skiftes. Er telefonen hævet eller bulet, så stop med at bruge og oplade den, og kom forbi hurtigst muligt.",
      },
      LIFETIME_FAQ,
      MAIL_IN_FAQ("Pixel"),
    ],
  },
  oneplus: {
    label: "OnePlus",
    answer: (p) =>
      `Vi reparerer OnePlus i Vejle og Slagelse: skærmskift, batteriskift og ladestik${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og livstidsgaranti på arbejde og dele. Ring først, hvis du vil vide, om din model kan klares samme dag.`,
    body: [
      "Der findes mange OnePlus-modeller, og delene til de ældre er ikke altid på lager. Find din model nedenfor, se prisen, og kontakt os om tiden, før du kommer.",
      "Har modellen ingen pris endnu, får du en fast pris efter et gratis hurtigt tjek ved disken.",
    ],
    categoryNotes: {
      skærmskift: "Vi viser den faste pris til din OnePlus-model, når den er oplyst.",
      batteriskift:
        "Falder tiden mellem opladninger, kan et nyt batteri give telefonen nyt liv.",
    },
    cityNote:
      "Ring til butikken, hvis du vil vide, om din OnePlus kan repareres samme dag.",
    faqs: [
      {
        question: "Reparerer I OnePlus?",
        answer:
          "Ja, i Vejle og Slagelse. Find din model for at se priser på de reparationer, vi tilbyder.",
      },
      {
        question: "Hvad koster et skærmskift på OnePlus?",
        answer:
          "Prisen afhænger af modellen og står på modelsiden. Ellers får du en fast pris efter et gratis hurtigt tjek ved disken.",
      },
      {
        question: "Kan I skifte batteri på en OnePlus?",
        answer:
          "Ja. Vi aftaler pris og tid med dig, før vi går i gang.",
      },
      {
        question: "Hvor lang tid tager det?",
        answer:
          "Det afhænger af modellen og af, om delen er på lager. Ring til butikken, så oplyser vi tiden, inden du kommer forbi.",
      },
      LIFETIME_FAQ,
      MAIL_IN_FAQ("OnePlus"),
    ],
  },
  iphone: {
    label: "iPhone",
    answer: (p) =>
      `Vi reparerer iPhone i Vejle og Slagelse: skærmskift, batteriskift, ladestik og bagglas${p ? `, fra ${p}` : ""}. 90 % af skærm- og batteriskift er klar på 30 minutter, og du får livstidsgaranti på arbejde og dele. Kom forbi uden tid, eller send ind med gratis fragtlabel.`,
    body: [
      "Du vælger selv skærmkvaliteten, fra budget til original, og ser prisen på din præcise iPhone-model nedenfor.",
    ],
    categoryNotes: {},
    cityNote: "Walk-in i begge butikker.",
    faqs: [
      {
        question: "Hvad koster et skærmskift på iPhone?",
        answer:
          "Prisen afhænger af modellen og den skærmkvalitet, du vælger. Find din iPhone for at se den faste pris.",
      },
      {
        question: "Kan jeg vente, mens I reparerer?",
        answer:
          "Ja, 90 % af skærm- og batteriskift er klar på 30 minutter. Andre reparationer kan tage længere tid, og det oplyser vi, før du afleverer.",
      },
      LIFETIME_FAQ,
      {
        question: "Skal jeg bestille tid?",
        answer:
          "Nej, du kan komme forbi uden tid i begge butikker. Du kan også booke online og vælge butik.",
      },
      {
        question: "Hvad hvis telefonen har været i vand?",
        answer:
          "Sluk telefonen og kom forbi hurtigst muligt. Behandling af vandskade har 3 måneders garanti. En fuld diagnose koster 249 kr.",
      },
    ],
  },
  ipad: {
    label: "iPad",
    answer: (p) =>
      `Vi reparerer iPad i Vejle og Slagelse: skærmskift, batteriskift og ladestik${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og livstidsgaranti på arbejde og dele. Tiden afhænger af modellen, og vi oplyser den, før du afleverer iPad'en.`,
    body: [
      "På mange iPad-modeller er skærmen limet fast, så et skærmskift kræver varme, tålmodighed og de rigtige værktøjer. Det er ikke noget, du behøver prøve selv. Find din model nedenfor, og se prisen, før du booker.",
      "iPad, iPad Air, iPad mini og iPad Pro har forskellige skærme og forskellige priser. Vælg derfor den præcise model. Kan du ikke genkende din, så kig bag på iPad'en efter modelnummeret (A-nummeret), eller ring til os.",
    ],
    categoryNotes: {
      skærmskift:
        "Knust glas eller streger i billedet. Prisen afhænger af iPad-modellen.",
      batteriskift:
        "Holder iPad'en kun et par timer, eller lukker den ned ved 30 %? Et nyt batteri er ofte løsningen.",
    },
    cityNote:
      "Kom forbi med iPad'en, så tjekker vi den ved disken. Skærm og batteri er de oftest efterspurgte reparationer.",
    faqs: [
      {
        question: "Hvad koster et skærmskift på iPad?",
        answer:
          "Prisen afhænger af modellen: iPad, iPad Air, iPad mini eller iPad Pro. Find din model på siden og se den faste pris.",
      },
      {
        question: "Kan I skifte batteri på en iPad?",
        answer:
          "Ja. Batteriet sidder limet fast og kræver forsigtighed. Se prisen på din model, og kom forbi, så aftaler vi tid.",
      },
      {
        question: "Hvor lang tid tager en iPad-reparation?",
        answer:
          "Det afhænger af modellen og af, om delen er på lager. Vi oplyser tiden, før du afleverer, og du kan ringe til butikken inden dit besøg.",
      },
      {
        question: "Hvordan finder jeg min iPad-model?",
        answer:
          "Se modelnummeret (A-nummer) bag på iPad'en, eller gå til Indstillinger > Generelt > Om. Er du i tvivl, så tag den med, så finder vi den.",
      },
      LIFETIME_FAQ,
      MAIL_IN_FAQ("iPad"),
    ],
  },
  macbook: {
    label: "MacBook",
    answer: (p) =>
      `Vi reparerer MacBook Air og MacBook Pro i Vejle og Slagelse: batteri, skærm, tastatur, ladestik og fejlfinding${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang, og vilkår aftales ved den enkelte reparation. Kom forbi med computeren, så kigger vi på den ved disken.`,
    body: [
      "Batteriet er den mest almindelige slidtage: holder maskinen kun et par timer, eller viser macOS Service anbefales, er et nyt batteri ofte billigere end en ny computer.",
      "Skærme, tastaturer og ladestik varierer mellem MacBook Air, MacBook Pro og årgange. Find derfor din model og se prisen. Har modellen ingen pris, får du en fast pris efter et gratis hurtigt tjek ved disken. Tidsforbruget afhænger af fejlen og af, om delen skal bestilles hjem.",
      "Garantien på MacBook-reparation er ikke den samme som på telefon og tablet. Vilkårene aftales ved den enkelte reparation, og du får dem, før vi går i gang.",
    ],
    categoryNotes: {
      batteriskift:
        "Batteriet er limet fast i kabinettet på mange modeller og kræver specialværktøj, så det er ikke noget, de fleste bør forsøge selv.",
      skærmskift:
        "Vi gennemgår skaden med dig og giver en fast pris, før vi går i gang.",
    },
    cityNote:
      "Kom forbi med MacBook'en, så kigger vi på den ved disken. Vilkår og pris aftaler vi med dig, før vi begynder.",
    faqs: [
      {
        question: "Hvad koster et batteriskift på MacBook?",
        answer:
          "Prisen afhænger af modellen og årgangen. Find din model på siden for at se prisen, ellers får du en fast pris efter et gratis hurtigt tjek ved disken.",
      },
      {
        question: "Hvad koster en ny skærm til MacBook?",
        answer:
          "Skærmen er en af de dyreste dele og afhænger meget af modellen. Se prisen på din model, eller kom forbi, så får du en fast pris efter et gratis hurtigt tjek ved disken.",
      },
      {
        question: "Hvilken garanti får jeg på MacBook-reparation?",
        answer:
          "Vilkårene aftales ved den enkelte reparation, og du får dem, før vi går i gang.",
      },
      {
        question: "Hvor lang tid tager en MacBook-reparation?",
        answer:
          "Det afhænger af fejlen og af, om delen er på lager. Vi oplyser tiden, før du afleverer maskinen. En fuld diagnose koster 249 kr.",
      },
      {
        question: "Er reparation bedre end at købe en ny MacBook?",
        answer:
          "Ofte, hvis maskinen er fra de seneste år. Er reparationen dyr i forhold til maskinens værdi, siger vi det. Du får en ærlig vurdering ved disken.",
      },
      {
        question: "Kan jeg sende min MacBook ind?",
        answer:
          "Ja. Bor du uden for Vejle og Slagelse, kan du sende computeren ind. Vi aftaler vilkår og pris med dig, før vi går i gang.",
      },
    ],
  },
};

/** Generisk indhold til mærker uden egen tekst (Huawei, Sony, Xiaomi m.fl.). */
export function genericHubContent(name: string, deviceType: DeviceType): BrandHubContent {
  const lifetime = hasLifetimeWarranty(deviceType);
  return {
    label: name,
    answer: (p) =>
      `Vi reparerer ${name} i Vejle og Slagelse${p ? `, fra ${p}` : ""}. Du får en fast pris, før vi går i gang. ${lifetime ? "Du får livstidsgaranti på arbejde og dele." : "Vilkår aftales ved den enkelte reparation."} Du kan komme forbi uden tid eller sende enheden ind.`,
    body: [
      `Find din ${name}-model nedenfor for at se priser. Står din model ikke på listen, så ring til os, så hører vi, om vi kan hjælpe.`,
    ],
    categoryNotes: {},
    cityNote: `Har du en ${name}, så ring eller kom forbi, så tjekker vi fejlen ved disken.`,
    faqs: [
      {
        question: `Hvad koster ${name}-reparation?`,
        answer:
          "Prisen afhænger af modellen og reparationen. Find din model for at se den faste pris, ellers får du en fast pris efter et gratis hurtigt tjek ved disken.",
      },
      {
        question: "Hvor lang tid tager det?",
        answer:
          "Det afhænger af modellen og af, om delen er på lager. Vi oplyser tiden, før du afleverer enheden.",
      },
      lifetime
        ? LIFETIME_FAQ
        : {
            question: "Hvilken garanti får jeg?",
            answer:
              "Vilkårene aftales ved den enkelte reparation, og du får dem, før vi går i gang.",
          },
      MAIL_IN_FAQ(name),
      {
        question: "Skal jeg bestille tid?",
        answer:
          "Nej, du kan komme forbi uden tid i begge butikker, eller booke online og vælge butik.",
      },
    ],
  };
}

export function getHubContent(slug: string, name: string, deviceType: DeviceType): BrandHubContent {
  return BRAND_HUB_CONTENT[slug] ?? genericHubContent(name, deviceType);
}
