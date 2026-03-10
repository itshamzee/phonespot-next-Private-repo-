import { STORE } from "@/lib/store-config";

interface SmsTemplateData {
  customerName: string;
  deviceName: string;
  ticketId: string;
  trackingUrl?: string;
  price?: number;
  estimatedDate?: string;
}

export function getSmsTemplate(
  status: string,
  data: SmsTemplateData,
): string | null {
  const { customerName, deviceName, ticketId, trackingUrl, price, estimatedDate } = data;
  const shortId = ticketId.slice(0, 8);

  switch (status) {
    case "modtaget":
      return `Hej ${customerName}, vi har modtaget din ${deviceName}. Sags-ID: ${shortId}.${trackingUrl ? ` Foelg din reparation her: ${trackingUrl}` : ""} Vi vender tilbage med et tilbud. - ${STORE.name}`;
    case "tilbud_sendt":
      return `Hej ${customerName}, dit tilbud paa ${deviceName} er klar: ${price} DKK. Ring til os paa ${STORE.phone} for at godkende. - ${STORE.name}`;
    case "godkendt":
      return `Tak ${customerName}! Vi gaar i gang med din ${deviceName}.${estimatedDate ? ` Forventet faerdig: ${estimatedDate}.` : ""}${trackingUrl ? ` Foelg status: ${trackingUrl}` : ""} - ${STORE.name}`;
    case "faerdig":
      return `Hej ${customerName}, din ${deviceName} er klar til afhentning i ${STORE.mall ?? STORE.city}. Aabent: Hverdage ${STORE.hours.weekdays}, Loerdag ${STORE.hours.saturday}. - ${STORE.name}`;
    default:
      return null;
  }
}
