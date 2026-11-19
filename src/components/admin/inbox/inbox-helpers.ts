import { inboxState, type InboxRow } from "@/lib/inquiries/inbox";

export { INQUIRY_STATUS_LABELS, OFFER_STATUS_LABELS, ORDER_STATUS_LABELS, statusLabel } from "./status-labels";

/**
 * Ren visningslogik til Kundecenterets klient: tråd, kanaler, ulæst, udsættelse.
 * Ingen I/O og ingen React, så alt kan testes direkte.
 */

/* ---------------------- typer fra /api/admin/inbox/[id] ---------------------- */

export interface ThreadMessage {
  id: string;
  sender: "staff" | "customer";
  channel: string;
  body: string | null;
  staff_name: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface ThreadDraft {
  id: string;
  status: "pending" | "sent" | "auto_sent" | "discarded";
  needs_human: boolean;
  reason: string | null;
  summary?: string | null;
  draft_body: string | null;
  final_body?: string | null;
  lookups: unknown;
  review_verdict?: string | null;
  created_at: string;
}

export interface ThreadInquiry {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  status: InboxRow["status"];
  channel: InboxRow["channel"] | null;
  mailbox?: string | null;
  store_id?: string | null;
  assigned_to: string | null;
  assigned_name?: string | null;
  snoozed_until?: string | null;
  last_inbound_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface InboxDetail {
  inquiry: ThreadInquiry;
  messages: ThreadMessage[];
  drafts: ThreadDraft[];
}

interface Linked {
  id: string;
  href: string;
  createdAt: string;
  status: string | null;
}

export interface CustomerInfo {
  known: boolean;
  matchedBy?: "email" | "phone" | "both" | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  repairs: (Linked & { ticketNumber: string | number | null; device: string | null; issue: string | null })[];
  orders: (Linked & { orderNumber: string | number | null; total: number | null })[];
  buyback: (Linked & { subject: string | null; offerStatus: string | null; offerAmount: number | null })[];
  previous: (Linked & { subject: string | null; channel: string | null })[];
}

/* ---------------------- Fiks' opslag ---------------------- */

const LOOKUP_LABELS: Record<string, string> = {
  quote_repair: "prisopslag reparation",
  diagnose: "symptomtabel",
  quote_buyback: "vejledende opkøbspris",
  lookup_orders: "ordreopslag",
  lookup_repairs: "sagsopslag",
  lookup_buyback: "opkøbsopslag",
  lookup_customer: "kundeopslag",
  get_knowledge: "faktabasen",
};

/** Danske etiketter for de opslag, Fiks lavede, i rækkefølge og uden dubletter. */
export function lookupLabels(lookups: unknown): string[] {
  if (!Array.isArray(lookups)) return [];
  const out: string[] = [];
  for (const l of lookups) {
    const tool = l && typeof l === "object" ? (l as { tool?: unknown }).tool : null;
    const label = typeof tool === "string" ? LOOKUP_LABELS[tool] : undefined;
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

/** "Bygger på: a, b og c", eller null uden opslag. */
export function basedOnLine(lookups: unknown): string | null {
  const labels = lookupLabels(lookups);
  if (labels.length === 0) return null;
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} og ${labels[labels.length - 1]}`;
  return `Bygger på: ${list}`;
}

/* ---------------------- tråden ---------------------- */

/** Navnet, Fiks' automatiske svar gemmes under (lib/mail-agent/run.ts). */
export const FIKS_STAFF_NAME = "PhoneSpot assistent";

export type ThreadItem =
  | { kind: "customer"; id: string; message: ThreadMessage }
  | { kind: "staff"; id: string; message: ThreadMessage }
  | { kind: "note"; id: string; message: ThreadMessage }
  | { kind: "fiks"; id: string; message: ThreadMessage; basedOn: string | null }
  | { kind: "system"; id: string; text: string };

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export function buildThreadItems(messages: ThreadMessage[], drafts: ThreadDraft[]): ThreadItem[] {
  const autoDrafts = drafts.filter((d) => d.status === "auto_sent");
  const items: ThreadItem[] = messages.map((m) => {
    if (m.is_internal) return { kind: "note", id: m.id, message: m };
    if (m.sender === "customer") return { kind: "customer", id: m.id, message: m };
    if (m.staff_name === FIKS_STAFF_NAME) {
      const body = norm(m.body);
      const draft = autoDrafts.find((d) => body && (norm(d.final_body) === body || norm(d.draft_body) === body));
      return { kind: "fiks", id: m.id, message: m, basedOn: draft ? basedOnLine(draft.lookups) : null };
    }
    return { kind: "staff", id: m.id, message: m };
  });
  const pending = drafts.find((d) => d.status === "pending");
  if (pending?.needs_human) {
    const reason = norm(pending.reason);
    items.push({ kind: "system", id: `needs-${pending.id}`, text: reason ? `Fiks gav sagen videre. Grund: ${reason}` : "Fiks gav sagen videre." });
  }
  return items;
}

/** Ventende udkast med tekst, som svarfeltet kan forudfyldes med. */
export function pendingDraft(drafts: ThreadDraft[]): ThreadDraft | null {
  return drafts.find((d) => d.status === "pending" && norm(d.draft_body)) ?? null;
}

/** Fiks' automatiske svar, der endnu ikke er bedømt, hvis kunden ikke har skrevet siden. */
export function unreviewedAutoReply(detail: InboxDetail): ThreadDraft | null {
  const auto = detail.drafts.find((d) => d.status === "auto_sent");
  if (!auto || auto.review_verdict) return null;
  const newer = detail.messages.some((m) => m.sender === "customer" && !m.is_internal && m.created_at > auto.created_at);
  return newer ? null : auto;
}

/* ---------------------- liste og kanaler ---------------------- */

/** Sagen, der skal vises, når den aktuelle forsvinder fra listen. */
export function nextAfter(rows: Pick<InboxRow, "id">[], currentId: string | null): string | null {
  const i = currentId ? rows.findIndex((r) => r.id === currentId) : -1;
  if (i < 0) return rows[0]?.id ?? null;
  return rows[i + 1]?.id ?? rows[i - 1]?.id ?? null;
}

export type ReplyChannel = "email" | "sms";

const usableEmail = (e: string | null | undefined) => !!e && /^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/.test(e.trim());
const usablePhone = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "").length >= 8;

/** Kanaler, sagen kan besvares på: mail kræver mail, SMS kræver telefon. Anmeldelser: ingen. */
export function availableChannels(inq: { channel: string | null; email: string | null; phone: string | null }): ReplyChannel[] {
  if (inq.channel === "google_review" || inq.channel === "trustpilot_review") return [];
  const order: ReplyChannel[] = inq.channel === "sms" ? ["sms", "email"] : ["email", "sms"];
  return order.filter((c) => (c === "email" ? usableEmail(inq.email) : usablePhone(inq.phone)));
}

/**
 * Kun kendte anmeldelsesadresser, forankret på vært og sti: g.page; google.com,
 * www.google.com og maps.google.com under /maps; search.google.com under /local/;
 * business.google.com; trustpilot.com og *.trustpilot.com under /review eller /reviews.
 * Alt andet (docs.google.com, google.com/url?q=..., fremmede domæner) afvises.
 */
export function isReviewUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  if (host === "g.page" || host === "business.google.com") return true;
  if (host === "google.com" || host === "www.google.com" || host === "maps.google.com") return /^\/maps(\/|$)/.test(path);
  if (host === "search.google.com") return path.startsWith("/local/");
  if (host === "trustpilot.com" || host.endsWith(".trustpilot.com")) return /^\/reviews?(\/|$)/.test(path);
  return false;
}

/** Første godkendte anmeldelseslink (https) i trådens første besked. */
export function reviewLink(messages: ThreadMessage[]): string | null {
  const body = messages[0]?.body ?? "";
  for (const match of body.matchAll(/https:\/\/[^\s<>"')\]]+/g)) {
    const raw = match[0].replace(/[.,;:!?]+$/, "");
    if (isReviewUrl(raw)) return raw;
  }
  return null;
}

/* ---------------------- ulæst (kun lokalt) ---------------------- */

export const READ_KEY = "kundecenter.read";
const READ_MAX = 500;

export function parseReadIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addReadId(list: string[], id: string, max = READ_MAX): string[] {
  return [...list.filter((x) => x !== id), id].slice(-max);
}

/** Ulæst: åben, ikke min, og ikke åbnet i denne browser. Kun en bekvemmelighed. */
export function isUnread(row: InboxRow, meId: string | null, read: Set<string>, now: Date): boolean {
  return inboxState(row, now) === "open" && row.assignedTo !== meId && !read.has(row.id);
}

/* ---------------------- udsættelse ---------------------- */

const TZ = "Europe/Copenhagen";

function cphParts(t: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date(t));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { y: +get("year"), m: +get("month"), d: +get("day"), h: +get("hour") % 24, min: +get("minute"), wd: get("weekday") };
}

/** Tidspunktet kl. `hour` dansk tid på datoen y-m-d (dage ud over måneden ruller videre). */
function copenhagenAt(y: number, m: number, d: number, hour: number): number {
  const guess = Date.UTC(y, m - 1, d, hour);
  const p = cphParts(guess);
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess;
  return guess - offset;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function snoozePresets(now: Date): { label: string; until: string }[] {
  const p = cphParts(now.getTime());
  const at = (days: number) => new Date(copenhagenAt(p.y, p.m, p.d + days, 9)).toISOString();
  const dow = WEEKDAYS.indexOf(p.wd); // 0 = mandag
  const toMonday = dow < 0 ? 7 : 7 - dow;
  return [
    { label: "I morgen kl. 9", until: at(1) },
    { label: "Om 3 dage", until: at(3) },
    { label: "Næste mandag", until: at(toMonday) },
  ];
}

/** "Udsat til fredag kl. 9" (inden for en uge), ellers "Udsat til 3. dec. kl. 9.30". */
export function snoozeText(iso: string | null | undefined, now: Date): string | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t) || t <= now.getTime()) return null;
  const p = cphParts(t);
  const time = p.min ? `${p.h}.${String(p.min).padStart(2, "0")}` : `${p.h}`;
  const n = cphParts(now.getTime());
  const days = Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(n.y, n.m - 1, n.d)) / 86_400_000);
  const day =
    days === 0
      ? "i dag"
      : days === 1
        ? "i morgen"
        : days < 7
          ? new Intl.DateTimeFormat("da-DK", { timeZone: TZ, weekday: "long" }).format(new Date(t))
          : new Intl.DateTimeFormat("da-DK", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(t));
  return `Udsat til ${day} kl. ${time}`;
}

/* ---------------------- små formateringer ---------------------- */

export function matchedByLabel(m: CustomerInfo["matchedBy"] | undefined): string | null {
  if (m === "email") return "Fundet på mail";
  if (m === "phone") return "Fundet på telefonnummer";
  if (m === "both") return "Fundet på mail og telefon";
  return null;
}

/** Beløb i øre som hele kroner. */
export function formatKr(ore: number | null | undefined): string | null {
  if (typeof ore !== "number" || !Number.isFinite(ore)) return null;
  return `${Math.round(ore / 100).toLocaleString("da-DK")} kr.`;
}

const GSM =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/** Tegn og antal SMS'er (GSM 160/153, ellers 70/67). */
export function smsInfo(text: string): { chars: number; parts: number } {
  const chars = [...text].length;
  if (chars === 0) return { chars: 0, parts: 0 };
  const gsm = [...text].every((c) => GSM.includes(c));
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  return { chars, parts: chars <= single ? 1 : Math.ceil(chars / multi) };
}

export const CHANNEL_LABELS: Record<string, string> = {
  email: "Mail",
  form: "Formular",
  sms: "SMS",
  messenger: "Messenger",
  google_review: "Google",
  trustpilot_review: "Trustpilot",
};

/** Kort postkasse-etiket: "info@phonespot.dk" bliver "info@". */
export function mailboxLabel(mailbox: string | null | undefined): string | null {
  if (!mailbox) return null;
  const at = mailbox.indexOf("@");
  return at > 0 ? mailbox.slice(0, at + 1) : mailbox;
}
