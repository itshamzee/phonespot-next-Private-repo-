import type { InquiryChannel, InquiryStatus } from "@/lib/supabase/types";
import { escapeLike } from "@/lib/mail-agent/like";

/**
 * Ren visningslogik for Kundecenter (fælles indbakke): tilstande, visninger,
 * tællere og ventetid. Ingen I/O, så alt kan testes uden database.
 */

export type InboxView =
  | "mine"
  | "unassigned"
  | "need"
  | "waiting"
  | "snoozed"
  | "fiks"
  | "done"
  | "ch-mail"
  | "ch-chat"
  | "ch-messenger"
  | "ch-sms"
  | "ch-form"
  | "ch-reviews"
  | "opkoeb"
  | "mb-info"
  | "mb-slagelse"
  | "mb-ha";

export const INBOX_VIEWS: readonly InboxView[] = [
  "mine",
  "unassigned",
  "need",
  "waiting",
  "snoozed",
  "fiks",
  "done",
  "ch-mail",
  "ch-chat",
  "ch-messenger",
  "ch-sms",
  "ch-form",
  "ch-reviews",
  "opkoeb",
  "mb-info",
  "mb-slagelse",
  "mb-ha",
];

/**
 * Mapper: alt der ikke er færdigt (både "skal besvares" og "venter på kunden"),
 * afgrænset på kilde, postkasse eller kanal. Sager der skal besvares ligger øverst.
 */
export interface FolderFilter {
  source?: string;
  mailbox?: string;
  channel?: string;
}

export const FOLDER_FILTERS: Partial<Record<InboxView, FolderFilter>> = {
  opkoeb: { source: "saelg-enhed" },
  "mb-info": { mailbox: "info@phonespot.dk" },
  "mb-slagelse": { mailbox: "slagelse@phonespot.dk" },
  "mb-ha": { mailbox: "ha@phonespot.dk" },
  "ch-chat": { channel: "chat" },
};

export function folderFilter(view: InboxView): FolderFilter | null {
  return FOLDER_FILTERS[view] ?? null;
}

function inFolder(row: InboxRow, f: FolderFilter): boolean {
  if (f.source && row.source !== f.source) return false;
  if (f.mailbox && (row.mailbox ?? "").toLowerCase() !== f.mailbox) return false;
  if (f.channel && (row.channel as string) !== f.channel) return false;
  return true;
}

/** Skal sagen besvares? Åben, eller "besvaret" hvor kunden har skrevet sidst. */
export function needsAnswer(row: InboxRow, now: Date): boolean {
  const state = inboxState(row, now);
  return state === "open" || (state === "waiting" && !!row.customerLast);
}

/** Mappernes rækkefølge: skal besvares først, derefter nyeste aktivitet øverst. */
export function sortFolderRows(rows: InboxRow[], now: Date): InboxRow[] {
  return [...rows].sort((a, b) => {
    const na = needsAnswer(a, now) ? 0 : 1;
    const nb = needsAnswer(b, now) ? 0 : 1;
    if (na !== nb) return na - nb;
    return (b.lastInboundAt ?? "").localeCompare(a.lastInboundAt ?? "");
  });
}

export function isInboxView(v: unknown): v is InboxView {
  return typeof v === "string" && (INBOX_VIEWS as readonly string[]).includes(v);
}

export interface InboxRow {
  id: string;
  name: string;
  subject: string | null;
  preview: string;
  channel: InquiryChannel;
  mailbox: string | null;
  store: "vejle" | "slagelse" | null;
  status: InquiryStatus;
  assignedTo: string | null;
  assignedName: string | null;
  snoozedUntil: string | null;
  lastInboundAt: string | null;
  needsHuman: boolean;
  needsHumanReason: string | null;
  hasDraft: boolean;
  fiksAnswered: boolean;
  isPublic: boolean;
  source: string;
  /** Seneste besked i tråden er fra kunden (kan være et overset svar på en besvaret sag). */
  customerLast?: boolean;
}

export type InboxState = "open" | "waiting" | "snoozed" | "done";

export function inboxState(row: InboxRow, now: Date): InboxState {
  if (row.status === "lukket") return "done";
  if (row.snoozedUntil) {
    const until = Date.parse(row.snoozedUntil);
    if (Number.isFinite(until) && until > now.getTime()) return "snoozed";
  }
  return row.status === "besvaret" ? "waiting" : "open";
}

export function matchesView(view: InboxView, row: InboxRow, meId: string, now: Date): boolean {
  const state = inboxState(row, now);
  const folder = folderFilter(view);
  if (folder) return state !== "done" && inFolder(row, folder);
  switch (view) {
    case "mine":
      return state === "open" && row.assignedTo === meId;
    case "unassigned":
      return state === "open" && !row.assignedTo && !row.fiksAnswered;
    case "need":
      return state === "open" && row.needsHuman;
    case "waiting":
      return state === "waiting";
    case "snoozed":
      return state === "snoozed";
    case "fiks":
      return row.fiksAnswered && state !== "done";
    case "done":
      return state === "done";
    case "ch-mail":
      return state !== "done" && row.channel === "email";
    case "ch-sms":
      return state !== "done" && row.channel === "sms";
    case "ch-messenger":
      return state !== "done" && row.channel === "messenger";
    case "ch-form":
      return state !== "done" && row.channel === "form";
    case "ch-reviews":
      return state !== "done" && row.isPublic;
    default:
      return false;
  }
}

export function viewCounts(
  rows: InboxRow[],
  meId: string,
  now: Date,
): Record<"mine" | "unassigned" | "need", number> {
  const out = { mine: 0, unassigned: 0, need: 0 };
  for (const r of rows) {
    if (matchesView("mine", r, meId, now)) out.mine += 1;
    if (matchesView("unassigned", r, meId, now)) out.unassigned += 1;
    if (matchesView("need", r, meId, now)) out.need += 1;
  }
  return out;
}

const TZ = "Europe/Copenhagen";

function copenhagenDay(d: Date): number {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const [y, m, day] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

export function waitingLabel(lastInboundAt: string | null, now: Date): { text: string; long: boolean } {
  if (!lastInboundAt) return { text: "–", long: false };
  const at = new Date(lastInboundAt);
  if (Number.isNaN(at.getTime())) return { text: "–", long: false };
  const ms = Math.max(0, now.getTime() - at.getTime());
  const minutes = Math.floor(ms / 60_000);
  const long = ms > 4 * 3_600_000;

  if (minutes < 60) return { text: `${minutes} min`, long };
  const hours = Math.floor(minutes / 60);
  if (minutes < 6 * 60) {
    const rest = minutes % 60;
    return { text: rest ? `${hours} t ${rest} min` : `${hours} t`, long };
  }
  if (minutes < 24 * 60) return { text: `${hours} t`, long };

  const days = copenhagenDay(now) - copenhagenDay(at);
  if (days <= 1) return { text: "i går", long };
  if (days < 7) return { text: new Intl.DateTimeFormat("da-DK", { timeZone: TZ, weekday: "long" }).format(at), long };
  return { text: new Intl.DateTimeFormat("da-DK", { timeZone: TZ, day: "numeric", month: "short" }).format(at), long };
}

/* ---------------------- rækker ud fra databasen ---------------------- */

export interface InboxInquiryInput {
  id: string;
  name: string | null;
  subject: string | null;
  message: string | null;
  channel: InquiryChannel | null;
  mailbox: string | null;
  store_id: string | null;
  status: InquiryStatus;
  assigned_to: string | null;
  assigned_name: string | null;
  snoozed_until: string | null;
  last_inbound_at: string | null;
  source: string | null;
}

export interface InboxMessageInput {
  inquiry_id: string;
  sender: "staff" | "customer";
  body: string | null;
  is_internal?: boolean | null;
  created_at: string;
}

export interface InboxDraftInput {
  inquiry_id: string;
  status: "pending" | "sent" | "auto_sent" | "discarded";
  needs_human: boolean;
  reason: string | null;
  draft_body?: string | null;
  review_verdict?: "correct" | "wrong" | null;
  created_at: string;
}

const PREVIEW_LENGTH = 160;

function previewOf(body: string | null | undefined): string {
  const flat = (body ?? "").replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…` : flat;
}

const byCreatedDesc = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

/**
 * Sætter rækker sammen af henvendelser, deres beskeder og udkast. Rene data ind,
 * ingen forespørgsler: kalderen henter alle tre i ét hug hver (ingen N+1).
 */
export function buildInboxRows(
  inquiries: InboxInquiryInput[],
  messages: InboxMessageInput[],
  drafts: InboxDraftInput[],
): InboxRow[] {
  const msgsBy = new Map<string, InboxMessageInput[]>();
  for (const m of messages) {
    if (m.is_internal) continue;
    const list = msgsBy.get(m.inquiry_id) ?? [];
    list.push(m);
    msgsBy.set(m.inquiry_id, list);
  }
  const draftsBy = new Map<string, InboxDraftInput[]>();
  for (const d of drafts) {
    const list = draftsBy.get(d.inquiry_id) ?? [];
    list.push(d);
    draftsBy.set(d.inquiry_id, list);
  }

  return inquiries.map((q): InboxRow => {
    const msgs = (msgsBy.get(q.id) ?? []).sort(byCreatedDesc);
    const ds = (draftsBy.get(q.id) ?? []).sort(byCreatedDesc);
    const channel: InquiryChannel = q.channel ?? "email";

    const pending = ds.find((d) => d.status === "pending");
    const latestDraft = ds[0];
    let fiksAnswered = false;
    if (latestDraft && latestDraft.status === "auto_sent" && !latestDraft.review_verdict) {
      const newerMessage = msgs.some((m) => m.sender === "customer" && m.created_at > latestDraft.created_at);
      const newerInbound = !!q.last_inbound_at && q.last_inbound_at > latestDraft.created_at;
      fiksAnswered = !newerMessage && !newerInbound;
    }

    const store = q.store_id === "vejle" || q.store_id === "slagelse" ? q.store_id : null;
    return {
      id: q.id,
      name: q.name ?? "",
      subject: q.subject ?? null,
      preview: previewOf(msgs[0]?.body ?? q.message),
      channel,
      mailbox: q.mailbox ?? null,
      store,
      status: q.status,
      assignedTo: q.assigned_to ?? null,
      assignedName: q.assigned_name ?? null,
      snoozedUntil: q.snoozed_until ?? null,
      lastInboundAt: q.last_inbound_at ?? null,
      needsHuman: !!pending?.needs_human,
      needsHumanReason: pending?.needs_human ? pending.reason || null : null,
      hasDraft: !!pending && !!pending.draft_body,
      fiksAnswered,
      isPublic: channel === "google_review" || channel === "trustpilot_review",
      source: q.source ?? "",
      customerLast: msgs[0]?.sender === "customer",
    };
  });
}

/* ---------------------- hjælpere til ruterne ---------------------- */

/** Navn der vises og gemmes for en medarbejder. */
export function staffDisplayName(staff: { name: string | null }): string {
  return staff.name?.trim() || "Admin";
}

/**
 * Søgeudtryk til PostgREST `or(...)`: `*` fjernes (alias for %), LIKE-tegn escapes,
 * og værdien citeres, så komma og parenteser i søgningen ikke bryder filteret.
 * Returnerer null, hvis der intet er at søge efter.
 */
export function buildSearchFilter(q: string): string | null {
  const term = q.replace(/\*/g, "").trim().slice(0, 100);
  if (!term) return null;
  const pattern = `%${escapeLike(term)}%`;
  const quoted = `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return ["name", "email", "phone", "subject", "message"].map((c) => `${c}.ilike.${quoted}`).join(",");
}

/** Validerer et udsættelsestidspunkt: gyldigt, i fremtiden og højst 30 dage frem. */
export function parseSnoozeUntil(until: unknown, now: Date): string | null {
  if (typeof until !== "string") return null;
  const t = Date.parse(until);
  if (!Number.isFinite(t)) return null;
  if (t <= now.getTime()) return null;
  if (t > now.getTime() + 30 * 86_400_000) return null;
  return new Date(t).toISOString();
}
