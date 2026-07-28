export type DeclineReasonCode =
  | "ikke_koeb_stand"
  | "vandskade"
  | "skaerm_knust"
  | "icloud_laast"
  | "for_gammel_model"
  | "mangler_info";

export interface DeclineReason {
  code: DeclineReasonCode;
  label: string; // shown in admin
  body: string; // the paragraph the customer reads
}

// One paragraph per reason, in PhoneSpot's tone: direct, no apology theatre, no
// blame. The customer gets a real explanation rather than a form letter.
export const DECLINE_REASONS: DeclineReason[] = [
  {
    code: "ikke_koeb_stand",
    label: "Stand for dårlig",
    body: "Vi har set på oplysningerne om din enhed, og desværre er standen for dårlig til at vi kan købe den. Omkostningen ved at sætte den i stand overstiger det, vi kan sælge den for bagefter.",
  },
  {
    code: "vandskade",
    label: "Vandskade",
    body: "Din enhed har vandskade, og dem køber vi desværre ikke. Vandskader udvikler sig ofte over tid, og vi kan ikke stå inde for enheden med den garanti, vi giver på alt hvad vi sælger.",
  },
  {
    code: "skaerm_knust",
    label: "Skærm knust",
    body: "Skærmen på din enhed er knust, og prisen på en original erstatningsskærm er desværre højere end det, enheden er værd for os bagefter.",
  },
  {
    code: "icloud_laast",
    label: "iCloud-låst",
    body: "Din enhed er låst til en iCloud- eller Google-konto. Vi kan hverken slette den eller sælge den videre, så længe låsen sidder på. Får du slået låsen fra, er du meget velkommen til at sende enheden ind igen.",
  },
  {
    code: "for_gammel_model",
    label: "For gammel model",
    body: "Din enhed er af en ældre model, som vi ikke længere køber. Der er desværre ikke efterspørgsel nok på den til, at vi kan give en fair pris.",
  },
  {
    code: "mangler_info",
    label: "Mangler oplysninger",
    body: "Vi mangler oplysninger om din enhed for at kunne give en pris. Skriv gerne til os med model, lagerplads og stand, så kigger vi på den igen.",
  },
];

export function isDeclineReasonCode(value: unknown): value is DeclineReasonCode {
  return typeof value === "string" && DECLINE_REASONS.some((r) => r.code === value);
}

export function declineReason(code: DeclineReasonCode): DeclineReason {
  const found = DECLINE_REASONS.find((r) => r.code === code);
  if (!found) throw new Error(`Unknown decline reason: ${code}`);
  return found;
}
