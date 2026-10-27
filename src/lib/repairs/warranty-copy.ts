/**
 * Én formulering af reparationsgarantien til de lokale SEO-sider (bysider,
 * /reparation-hubben og llms.txt), så de ikke glider fra hinanden.
 *
 * Ejerbeslutning 2026-10-16: livstidsgaranti på arbejde og dele, 6 måneder på
 * batteriskift. Samme ordlyd som mail-agentens viden (src/lib/mail-agent/knowledge.ts).
 * Husholdningsapparater har egne vilkår (12 mdr.) og nævnes derfor ikke her.
 *
 * Bland det aldrig sammen med 36 mdr. på enheder, vi sælger, eller 2 års
 * reklamationsret på tilbehør.
 */

/** Kort version til hero-linjer og svar-først-afsnit. */
export const REPAIR_WARRANTY_SHORT =
  "livstidsgaranti på arbejde og dele (6 måneder på batteriskift)";

/** Fuld version til FAQ og JSON-LD. */
export const REPAIR_WARRANTY_ANSWER =
  "Reparation af telefon, tablet, computer og konsol har livstidsgaranti på arbejde og dele: opstår den samme fejl igen på den del, vi har skiftet, reparerer vi den uden beregning, så længe du ejer enheden. Batteriskift har 6 måneders garanti, og behandling af vandskade har 3 måneders garanti. Garantien dækker ikke nye skader som fald, tryk eller væske.";

/** Kortene i garanti-sektionen på bysiderne. */
export const REPAIR_WARRANTY_TERMS = [
  {
    title: "Det dækker",
    text: "Fejl på den del, vi har skiftet, og på vores arbejde. Opstår den samme fejl igen, reparerer vi den uden beregning, så længe du ejer enheden.",
  },
  {
    title: "Det dækker ikke",
    text: "Nye skader som fald, slag, tryk og væske, eller hvis enheden efterfølgende er åbnet af andre. Et batteris naturlige kapacitetsfald over tid er ikke en fejl.",
  },
  {
    title: "Batteri og vandskade",
    text: "Batteriskift har 6 måneders garanti. Behandling af vandskade har 3 måneders garanti.",
  },
  {
    title: "Ved indsendelse",
    text: "Garantien er den samme, uanset om du afleverer enheden i butikken eller sender den ind med en gratis fragtlabel.",
  },
] as const;
