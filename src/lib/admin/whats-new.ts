/** Poster til "Nyt i admin"-dialogen. Nyeste først. Nyt id = vises igen for alle. */
export interface WhatsNewEntry {
  id: string;
  /** ISO-dato (ÅÅÅÅ-MM-DD). */
  date: string;
  title: string;
  items: { text: string; href?: string }[];
  ownerOnly?: boolean;
  /** Primært link i dialogen; uden den vises kun "Forstået". */
  cta?: { label: string; href: string };
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: "2026-11-19-mapper-fiks",
    date: "2026-11-19",
    title: "Mapper, flueben og Fiks på hjemmesiden",
    cta: { label: "Åbn kundecenter", href: "/admin/kundecenter" },
    items: [
      { text: "Kundecenter har fået mapper: Opkøb, info@, slagelse@ og ha@. De viser alt, der ikke er færdigt, med det der skal besvares øverst." },
      { text: "Fluebenet på hver række lukker sagen med ét klik, uden at du åbner den. Du kan fortryde i 10 sekunder." },
      { text: "Mærket \"Kunden skrev sidst\" viser besvarede sager, hvor kunden har skrevet igen." },
      {
        text: "Messenger-knappen på hjemmesiden er erstattet af Fiks, en chatassistent der svarer på priser, opkøb, åbningstider og garanti. Samtalerne ligger under Chat på sitet.",
      },
      { text: "Beder en kunde om at blive kontaktet, lander chatten i Ikke tildelt med navn og mail eller telefon. Svar som på enhver anden sag." },
    ],
  },
  {
    id: "2026-11-19-kundecenter",
    date: "2026-11-19",
    title: "Nyt kundecenter og en klogere assistent",
    cta: { label: "Åbn kundecenter", href: "/admin/kundecenter" },
    items: [
      {
        text: "Kundecenter: alle henvendelser samlet som en indbakke med visninger, tråd og kundekort. Den gamle side Henvendelser findes stadig.",
      },
      { text: "Tag en sag, udsæt den, eller skriv en intern note til en kollega. Kunden ser ikke noterne." },
      {
        text: "Assistenten slår nu reparationspriser og vejledende opkøbspriser op og kobler en beskrevet fejl til den rigtige reparation. Du godkender stadig hvert svar.",
      },
      { text: "Et udkast med et beløb, der ikke kommer fra et opslag, bliver altid sendt til en medarbejder." },
      { text: "SMS-svar: et svar gemmes først, når sms'en er sendt, og fejl vises tydeligt." },
      {
        text: "Når en kunde svarer på en besvaret sag, dukker den nu op igen. Før blev den stående som Besvaret.",
      },
    ],
  },
  {
    id: "2026-11-19-ejer",
    date: "2026-11-19",
    ownerOnly: true,
    title: "Til dig som ejer",
    items: [
      { text: "Automatisk afsendelse er ikke tændt. Alle svar til kunder kræver stadig et ja." },
      { text: "Næste skridt står i docs/MORGENSTATUS-2026-11-19.md." },
    ],
  },
];

/** Poster, medarbejderen ikke har set, og må se. Rækkefølgen bevares. */
export function unseenEntries(entries: WhatsNewEntry[], seenIds: string[], isOwner: boolean): WhatsNewEntry[] {
  const seen = new Set(seenIds);
  return entries.filter((x) => !seen.has(x.id) && (isOwner || !x.ownerOnly));
}
