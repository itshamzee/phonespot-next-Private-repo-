import { storeForId } from "@/lib/store-config";

interface SmsTemplateData {
  customerName: string;
  deviceName: string;
  ticketId: string;
  /** Sagsnummer som PS-2026-0001. Falder tilbage til kort uuid. */
  ticketNumber?: string | null;
  /** Sagens butik — beskeden underskrives og peger på den rigtige adresse/telefon. */
  storeId?: string | null;
  trackingUrl?: string;
  price?: number;
  estimatedDate?: string;
  /** Indlevering af flere enheder: "modtaget" nævner alle sagsnumre i én besked. */
  group?: { ticketNumber: string; deviceName: string }[];
}

export function getSmsTemplate(
  status: string,
  data: SmsTemplateData,
): string | null {
  const { customerName, deviceName, ticketId, ticketNumber, storeId, trackingUrl, price, estimatedDate, group } = data;
  const caseNumber = ticketNumber?.trim() || ticketId.slice(0, 8);
  const store = storeForId(storeId);

  switch (status) {
    case "modtaget":
      if (group && group.length > 1) {
        const list = group.map((g) => `${g.deviceName} (${g.ticketNumber})`).join(", ");
        return `Hej ${customerName}, vi har modtaget dine ${group.length} enheder: ${list}. Vi vender tilbage med et tilbud. - ${store.name}`;
      }
      return `Hej ${customerName}, vi har modtaget din ${deviceName}. Sagsnummer: ${caseNumber}.${trackingUrl ? ` Følg din reparation her: ${trackingUrl}` : ""} Vi vender tilbage med et tilbud. - ${store.name}`;
    case "tilbud_sendt":
      // Uden en pris ville kunden læse "undefined DKK".
      if (price == null) return null;
      return `Hej ${customerName}, dit tilbud på ${deviceName} er klar: ${price} DKK. Ring til os på ${store.phone} for at godkende. - ${store.name}`;
    case "godkendt":
      return `Tak ${customerName}! Vi går i gang med din ${deviceName}.${estimatedDate ? ` Forventet færdig: ${estimatedDate}.` : ""}${trackingUrl ? ` Følg status: ${trackingUrl}` : ""} - ${store.name}`;
    case "faerdig":
      return `Hej ${customerName}, din ${deviceName} er klar til afhentning i ${store.mall ?? store.city}. Åbent: Hverdage ${store.hours.weekdays}, Lørdag ${store.hours.saturday}. - ${store.name}`;
    default:
      return null;
  }
}
