import { storeForId } from "@/lib/store-config";
import { getSmsTemplate } from "@/lib/gateway-api/templates";
import { ticketLabel } from "@/lib/repairs/ticket-label";

export type SmsTemplate = { id: string; label: string; text: string };

type TicketForSms = {
  id: string;
  ticket_number?: string | null;
  customer_name: string;
  device_type?: string | null;
  device_model?: string | null;
  store_id?: string | null;
};

/**
 * Skabeloner til SMS-tråden. De fire statusbeskeder kommer fra de samme
 * skabeloner som status-ruten sender, så ordlyd og butiksadresse er ens;
 * resten er korte påmindelser. Tilbudsskabelonen vises kun med en kendt pris.
 */
export function buildSmsTemplates(ticket: TicketForSms, priceDkk?: number | null): SmsTemplate[] {
  const store = storeForId(ticket.store_id);
  const deviceName = `${ticket.device_model ?? ""}`.trim() || `${ticket.device_type ?? ""}`.trim() || "enhed";
  const data = {
    customerName: ticket.customer_name,
    deviceName,
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    storeId: ticket.store_id,
  };
  const out: SmsTemplate[] = [];
  const add = (id: string, label: string, text: string | null) => {
    if (text) out.push({ id, label, text });
  };

  add("modtaget", "Sag modtaget", getSmsTemplate("modtaget", data));
  add(
    "tilbud",
    "Tilbud",
    priceDkk != null && priceDkk > 0 ? getSmsTemplate("tilbud_sendt", { ...data, price: priceDkk }) : null,
  );
  add("godkendt", "Går i gang", getSmsTemplate("godkendt", data));
  add("klar", "Klar til afhentning", getSmsTemplate("faerdig", data));
  add(
    "venter-del",
    "Venter på del",
    `Hej ${ticket.customer_name}, vi venter stadig på en del til din ${deviceName} (sag ${ticketLabel(ticket)}). Vi skriver, så snart den er hjemme. - ${store.name}`,
  );
  add(
    "paamindelse",
    "Påmindelse om afhentning",
    `Hej ${ticket.customer_name}, din ${deviceName} står stadig klar til afhentning hos ${store.name}. Åbent: Hverdage ${store.hours.weekdays}, Lørdag ${store.hours.saturday}.`,
  );
  return out;
}

/** Antal tegn og SMS-dele. Danske bogstaver er GSM-tegn; andre tegn gør beskeden til unicode (70 pr. del). */
export function smsParts(text: string): { chars: number; parts: number } {
  const chars = [...text].length;
  const unicode = /[^\x20-\x7EæøåÆØÅäöüÄÖÜéÉèÈùìòà£$¥@_!"#¤%&'()*+,\-./:;<=>?§\n\r]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { chars, parts: chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / multi) };
}
