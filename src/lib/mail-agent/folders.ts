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
 * A contact-form message from the website that a person has to answer
 * (support, questions). It stays unread in INBOX until someone replies, and is
 * never sent to the model: the form already created the inquiry. "Sælg enhed"
 * is excluded because those are handled as offers in the buyback admin.
 *
 * The form mails a copy to info@ and to the store. With `ctx`, the copy only
 * counts in the mailbox that owns it: the store's own mailbox when the agent
 * polls it, otherwise info@. The other copy is filed as an ordinary notification.
 */
export function isContactNotice(mail: { fromEmail: string; subject: string }, ctx?: MailboxContext): boolean {
  const from = mail.fromEmail.toLowerCase();
  if (from !== "noreply@phonespot.dk" && from !== "ordre@phonespot.dk") return false;
  const subject = mail.subject ?? "";
  if (!/^kontakt\b/i.test(subject) || /sælg enhed/i.test(subject)) return false;
  if (!ctx) return true;
  const store = /^kontakt\s*\(([^)]+)\)/i.exec(subject)?.[1]?.trim().toLowerCase();
  const storeBox = store ? `${store}@phonespot.dk` : null;
  const owner = storeBox && ctx.polled.includes(storeBox) ? storeBox : "info@phonespot.dk";
  return ctx.mailbox.toLowerCase() === owner;
}

export interface MailboxContext {
  mailbox: string;
  polled: readonly string[];
}

/** Folders that are pure noise once filed: marked read so only real work shows as unread. */
export function isReadOnFiling(key: FolderKey): boolean {
  return key === "nyhedsbreve" || key.startsWith("notifikationer_");
}

/** One INBOX message, as much as the answered-sweep needs. */
export interface InboxEntry {
  uid: number;
  messageId: string;
  /** The person on the other end: Reply-To when set (contact form), else From. */
  counterpart: string;
  fromEmail: string;
  subject: string;
  date: Date;
  answered: boolean;
  /** Read by a person (or filed as noise). Unread customer mail is what is still waiting. */
  seen: boolean;
}

/**
 * INBOX mail that can be filed because the conversation is answered: the
 * newest mail from that person carries the Answered flag and has rested for
 * `minAgeMs`. A person with a newer unanswered mail keeps the whole thread in INBOX.
 */
export function pickAnswered(entries: InboxEntry[], now: number, minAgeMs = 24 * 3600 * 1000): InboxEntry[] {
  const groups = new Map<string, InboxEntry[]>();
  for (const e of entries) groups.set(e.counterpart, [...(groups.get(e.counterpart) ?? []), e]);
  const out: InboxEntry[] = [];
  for (const list of groups.values()) {
    const latest = list.reduce((a, b) => (b.date.getTime() > a.date.getTime() ? b : a));
    if (latest.answered && now - latest.date.getTime() >= minAgeMs) out.push(...list);
  }
  return out;
}

/** Where an answered INBOX mail goes: contact notices to their folder, the rest by the agent's category. */
export function folderForAnswered(entry: { fromEmail: string; subject: string }, category: string | null): FolderKey {
  if (isContactNotice(entry)) return "notifikationer_kontakt";
  return category ? folderForCategory(category as MailCategory) : "kunder_andet";
}

/**
 * Cheap, deterministic filing for mail that is not a customer conversation.
 * Returns null when only the agent's category can decide (customer mail).
 */
export function folderByRules(mail: { fromEmail: string; subject: string; listUnsubscribe?: boolean }, ctx?: MailboxContext): FolderKey | null {
  const from = mail.fromEmail.toLowerCase();
  const domain = domainOf(from);
  const subject = mail.subject ?? "";

  if (isContactNotice(mail, ctx)) return null;
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
