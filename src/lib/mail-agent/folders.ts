import type { MailCategory } from "./types";

/**
 * Folder structure the agent keeps in every one.com mailbox, as IMAP paths
 * under INBOX (one.com nests user folders under INBOX with "." as delimiter;
 * imapflow takes the path as an array so the delimiter is handled for us).
 */
export const FOLDERS = {
  kunder_ordrer: ["INBOX", "Kunder", "Ordrer"],
  kunder_reparation: ["INBOX", "Kunder", "Reparation"],
  kunder_opkoeb: ["INBOX", "Kunder", "Opkøb"],
  kunder_reklamation: ["INBOX", "Kunder", "Reklamation"],
  kunder_andet: ["INBOX", "Kunder", "Andet"],
  leverandoerer: ["INBOX", "Leverandører"],
  fragt: ["INBOX", "Fragt"],
  platforme: ["INBOX", "Platforme"],
  oekonomi: ["INBOX", "Økonomi"],
  ansoegninger: ["INBOX", "Ansøgninger"],
  notifikationer_kontakt: ["INBOX", "Notifikationer", "Kontaktformular"],
  notifikationer_ordrer: ["INBOX", "Notifikationer", "Ordrer"],
  notifikationer_opkoeb: ["INBOX", "Notifikationer", "Opkøb"],
  notifikationer_reparation: ["INBOX", "Notifikationer", "Reparation"],
  notifikationer_andet: ["INBOX", "Notifikationer", "Andet"],
  nyhedsbreve: ["INBOX", "Nyhedsbreve"],
} as const;

export type FolderKey = keyof typeof FOLDERS;

export function folderPath(key: FolderKey): string[] {
  return [...FOLDERS[key]];
}

const SUPPLIER_DOMAINS = ["capida.dk", "batteriekspert.dk", "foneday.nl", "foneday.com", "mytrendyphone.dk", "laptops.dk", "foxway.com", "relatel.dk", "one.com", "shipmondo.com"];
const SHIPPING_DOMAINS = ["dao.as", "postnord.com", "postnord.dk", "sendcloud.com", "fedex.com", "gls-group.eu", "gls.dk", "bring.com", "ups.com", "dhl.com"];
const PLATFORM_DOMAINS = ["fruugo.com", "pricerunner.com", "shopify.com", "service.tiktok.com", "tiktok.com", "facebookmail.com", "meta.com", "google.com", "trustpilot.com", "stripe.com", "klarna.com", "vercel.com", "supabase.com", "resend.com"];
const FINANCE_SUBJECT = /\b(faktura\w*|invoice\w*|bill payment|betaling\w*|kreditnota\w*|rykker\w*|forfaldne)\b/i;
const APPLICATION_SUBJECT = /\b(ansøgning|ansoegning|jobansøgning|praktik|elevplads|cv)\b/i;

function domainOf(email: string): string {
  return email.toLowerCase().split("@")[1] ?? "";
}

function matchesDomain(domain: string, list: readonly string[]): boolean {
  return list.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/**
 * Cheap, deterministic filing for mail that is not a customer conversation.
 * Returns null when only the agent's category can decide (customer mail).
 */
export function folderByRules(mail: { fromEmail: string; subject: string; listUnsubscribe?: boolean }): FolderKey | null {
  const from = mail.fromEmail.toLowerCase();
  const domain = domainOf(from);
  const subject = mail.subject ?? "";

  if (from === "noreply@phonespot.dk" || from === "ordre@phonespot.dk") {
    if (/^kontakt\b/i.test(subject)) return "notifikationer_kontakt";
    if (/^ny ordre\b/i.test(subject)) return "notifikationer_ordrer";
    if (/tilbud (accepteret|afvist)|sælg enhed|opkøb/i.test(subject)) return "notifikationer_opkoeb";
    if (/reparation/i.test(subject)) return "notifikationer_reparation";
    return "notifikationer_andet";
  }
  if (from.endsWith("@phonespot.dk")) return "notifikationer_andet";

  if (APPLICATION_SUBJECT.test(subject)) return "ansoegninger";
  if (matchesDomain(domain, SHIPPING_DOMAINS)) return "fragt";
  if (matchesDomain(domain, SUPPLIER_DOMAINS)) return FINANCE_SUBJECT.test(subject) ? "oekonomi" : "leverandoerer";
  if (matchesDomain(domain, PLATFORM_DOMAINS)) return FINANCE_SUBJECT.test(subject) ? "oekonomi" : "platforme";
  if (mail.listUnsubscribe) return "nyhedsbreve";
  return null;
}

/** Where a customer mail goes once the agent has classified it. */
export function folderForCategory(category: MailCategory): FolderKey {
  switch (category) {
    case "ordre":
      return "kunder_ordrer";
    case "reparation":
      return "kunder_reparation";
    case "opkoeb":
      return "kunder_opkoeb";
    case "retur_reklamation":
      return "kunder_reklamation";
    case "leverandoer_b2b":
      return "leverandoerer";
    case "nyhedsbrev_spam":
      return "nyhedsbreve";
    case "system_notifikation":
      return "notifikationer_andet";
    default:
      return "kunder_andet";
  }
}
