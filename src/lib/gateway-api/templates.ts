import { STORE } from "@/lib/store-config";

interface SmsTemplateData {
  customerName: string;
  deviceName: string;
  ticketId: string;
  price?: number;
  estimatedDate?: string;
}

export function getSmsTemplate(
  status: string,
  data: SmsTemplateData,
): string | null {
  const { customerName, deviceName, ticketId, price, estimatedDate } = data;
  const shortId = ticketId.slice(0, 8);

  switch (status) {
    case "modtaget":
      return `Hej ${customerName}, vi har modtaget din ${deviceName}. Sags-ID: ${shortId}. Vi vender tilbage med et tilbud. - ${STORE.name}`;
    case "tilbud_sendt":
      return `Hej ${customerName}, dit tilbud paa ${deviceName} er klar: ${price} DKK. Ring til os paa ${STORE.phone} for at godkende. - ${STORE.name}`;
    case "godkendt":
      return `Tak ${customerName}! Vi gaar i gang med din ${deviceName}.${estimatedDate ? ` Forventet faerdig: ${estimatedDate}.` : ""} - ${STORE.name}`;
    case "faerdig":
      return `Hej ${customerName}, din ${deviceName} er klar til afhentning i ${STORE.mall}. Aabent: Hverdage ${STORE.hours.weekdays}, Loerdag ${STORE.hours.saturday}. - ${STORE.name}`;
    default:
      return null;
  }
}
