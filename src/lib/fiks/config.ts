import { COMPANY_EMAIL, STORES } from "@/lib/store-config";

/** Model for the public chat. One place to change it. */
export const FIKS_MODEL = "claude-sonnet-5-5";
/** Bruges kun, hvis FIKS_MODEL afvises som ukendt (404). Samme model som mailassistenten. */
export const FIKS_FALLBACK_MODEL = "claude-opus-5";

export const FIKS_CHANNEL = "chat" as const;
export const FIKS_SOURCE = "fiks-chat" as const;
export const FIKS_STAFF_NAME = "Fiks";
export const FIKS_VISITOR_NAME = "Besøgende på sitet";

/** Characters per visitor message, after trim. */
export const MIN_MESSAGE_CHARS = 1;
export const MAX_MESSAGE_CHARS = 1000;
/** Visitor messages per session before the chat stops answering. */
export const MAX_MESSAGES_PER_SESSION = 30;
/** Visitor chat messages across all sessions in the rolling hour. */
export const MAX_MESSAGES_PER_HOUR = 300;
/** New chat sessions in the rolling hour. */
export const MAX_NEW_SESSIONS_PER_HOUR = 80;
/** Nye sessioner pr. besøgende (IP) i en rullende time. */
export const MAX_NEW_SESSIONS_PER_IP_PER_HOUR = 5;
/** Beskeder pr. besøgende (IP) pr. 10 minutter, talt i funktionens hukommelse. */
export const MAX_MESSAGES_PER_IP_PER_WINDOW = 20;
export const IP_WINDOW_MS = 10 * 60_000;
/** Messages (both sides) sent to the model, including the new one. */
export const HISTORY_FOR_MODEL = 20;
/** Messages loaded from the database per turn (history plus amount backing). */
export const HISTORY_LOAD_LIMIT = 60;

export const SUBJECT_CHARS = 80;

/** Kill switch: FIKS_CHAT_DISABLED=1 makes the API answer 503 and the widget hide itself. */
export function isFiksDisabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.FIKS_CHAT_DISABLED === "1";
}

function storePhones(): string {
  const phones = [...new Set(Object.values(STORES).map((s) => s.phone))];
  return phones.join(" eller ");
}

export const SAFE_PRICE_TEXT =
  "Den pris kan jeg ikke slå op her i chatten. Du kan se priserne på phonespot.dk, eller jeg kan bede en kollega vende tilbage til dig. Hvad foretrækker du?";

export const FALLBACK_TEXT = `Beklager, jeg kan ikke svare lige nu. Prøv igen om lidt, eller skriv til ${COMPANY_EMAIL}.`;

export const OFF_TOPIC_SAFE_TEXT =
  "Det kan jeg desværre ikke svare på her i chatten. Jeg kan bede en kollega vende tilbage til dig, hvis du skriver dit navn og din mail eller dit telefonnummer.";

export const HANDOFF_CONFIRM_TEXT =
  "Tak. En kollega vender tilbage til dig på mail eller telefon inden for vores åbningstid.";

export const SESSION_LIMIT_TEXT = `Denne chat kan ikke tage flere beskeder. Skriv til ${COMPANY_EMAIL} eller ring på ${storePhones()}, så hjælper vi dig videre.`;

export const BUSY_TEXT = `Fiks har travlt lige nu. Prøv igen om lidt, eller skriv til ${COMPANY_EMAIL}.`;

/** What a filled honeypot gets back: looks normal, nothing is stored. */
export const HONEYPOT_TEXT = "Tak for din besked. Hvad kan jeg hjælpe dig med?";
