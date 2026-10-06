/**
 * Sagsstyring: rene regler til listen (faner, søgning, afhentningsdag,
 * sortering og gruppering). Ingen I/O, så både API-ruten og UI'et bruger
 * præcis de samme regler, og de kan testes uden database.
 */
import { ticketLabel } from "@/lib/repairs/ticket-label";
import type { RepairStatus } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/*  Faner                                                              */
/* ------------------------------------------------------------------ */

export type CaseTab = "igang" | "klar" | "afventer" | "web" | "alle";

export const CASE_TABS: { id: CaseTab; label: string }[] = [
  { id: "igang", label: "Igangværende" },
  { id: "klar", label: "Klar til kunde" },
  { id: "afventer", label: "Afventer del" },
  { id: "web", label: "Web-bookinger" },
  { id: "alle", label: "Alle" },
];

export type CaseCounts = Record<CaseTab, number>;

export function isCaseTab(v: unknown): v is CaseTab {
  return typeof v === "string" && CASE_TABS.some((t) => t.id === v);
}

/** Det minimum af en sag, som listereglerne kigger på. */
export type CaseListTicket = {
  id: string;
  ticket_number?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  device_type?: string | null;
  device_model?: string | null;
  issue_description?: string | null;
  service_type?: string | null;
  status: RepairStatus | string;
  paid?: boolean | null;
  on_hold_reason?: string | null;
  is_urgent?: boolean | null;
  store_id?: string | null;
  created_at: string;
  device_id?: string | null;
  booking_details?: {
    selected_services?: { id?: string; name: string; price_dkk: number }[];
    preferred_date?: string | null;
    preferred_time?: string | null;
  } | null;
  services?: { id?: string; name: string; price_dkk: number }[] | null;
  /** Findes først efter migrationen 2026100420…; ellers undefined. */
  promised_at?: string | null;
  assigned_to?: string | null;
  /** Fælles id for sager fra samme indlevering med flere enheder (migrationen 20261005170000). */
  intake_group_id?: string | null;
  /** Indlejret fra customer_devices (kun til søgning). */
  customer_devices?: { serial_number?: string | null; color?: string | null } | null;
  repair_quotes?: { estimated_days?: number | null; created_at?: string | null }[] | null;
};

const CLOSED: string[] = ["afhentet", "reklamation_loest", "annulleret"];

export function isClosed(status: string): boolean {
  return CLOSED.includes(status);
}

/** En web-booking er en booking fra webshoppen, som ingen har modtaget endnu. */
export function isWebBooking(t: Pick<CaseListTicket, "booking_details" | "status">): boolean {
  return Boolean(t.booking_details) && t.status === "modtaget";
}

/**
 * Hver sag hører til præcis én fane (afsluttede sager kun til "Alle"), så
 * tallene på fanerne altid summer til "Alle".
 */
export function classifyTab(t: Pick<CaseListTicket, "status" | "on_hold_reason" | "booking_details">): CaseTab {
  if (isClosed(t.status)) return "alle";
  if (t.status === "faerdig") return "klar";
  if (t.on_hold_reason?.trim() || t.status === "bero") return "afventer";
  if (isWebBooking(t)) return "web";
  return "igang";
}

export function tabCounts(tickets: Pick<CaseListTicket, "status" | "on_hold_reason" | "booking_details">[]): CaseCounts {
  const counts: CaseCounts = { igang: 0, klar: 0, afventer: 0, web: 0, alle: tickets.length };
  for (const t of tickets) {
    const tab = classifyTab(t);
    if (tab !== "alle") counts[tab] += 1;
  }
  return counts;
}

export function inTab(t: Pick<CaseListTicket, "status" | "on_hold_reason" | "booking_details">, tab: CaseTab): boolean {
  return tab === "alle" || classifyTab(t) === tab;
}

/* ------------------------------------------------------------------ */
/*  Søgning                                                            */
/* ------------------------------------------------------------------ */

/** Kun cifre; dansk landekode (+45 / 0045) fjernes, så "+45 20 12 34 56" matcher "20123456". */
export function normalizePhone(input: string | null | undefined): string {
  let digits = (input ?? "").replace(/\D/g, "");
  if (digits.startsWith("0045")) digits = digits.slice(4);
  else if (digits.length === 10 && digits.startsWith("45")) digits = digits.slice(2);
  return digits;
}

/** "PS-2026-0042" -> { year: 2026, seq: 42 }. Ældre sager uden nummer -> null. */
export function parseTicketNumber(value: string | null | undefined): { year: number | null; seq: number } | null {
  const m = /^\s*ps[-\s]*(?:(\d{4})[-\s]*)?(\d{1,6})\s*$/i.exec(value ?? "");
  if (!m) return null;
  return { year: m[1] ? Number(m[1]) : null, seq: Number(m[2]) };
}

function ticketParts(value: string | null | undefined): { year: number; seq: number } | null {
  const m = /^PS-(\d{4})-(\d+)$/i.exec((value ?? "").trim());
  return m ? { year: Number(m[1]), seq: Number(m[2]) } : null;
}

function digitsOnly(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

function serialKey(s: string | null | undefined): string {
  return (s ?? "").replace(/[\s-]/g, "").toLowerCase();
}

function haystack(t: CaseListTicket): string {
  const services = [...(t.services ?? []), ...(t.booking_details?.selected_services ?? [])].map((s) => s.name);
  return [
    t.customer_name,
    t.customer_email,
    t.device_type,
    t.device_model,
    t.issue_description,
    t.service_type,
    t.on_hold_reason,
    t.ticket_number,
    ...services,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Søgning på navn, telefon (uanset mellemrum og +45), sagsnummer ("PS-2026-0042",
 * "PS-42" eller bare "42"), IMEI/serienummer og beskrivelse.
 * Flere ord skal alle findes (i vilkårlig rækkefølge).
 */
export function matchesSearch(t: CaseListTicket, query: string): boolean {
  const raw = query.trim().toLowerCase().replace(/^#/, "").trim();
  if (!raw) return true;

  // Sagsnummer: PS-2026-0042 / PS-42
  const wanted = parseTicketNumber(raw);
  if (wanted) {
    const have = ticketParts(t.ticket_number);
    if (have && have.seq === wanted.seq && (wanted.year === null || have.year === wanted.year)) return true;
    if (!have && t.id.toLowerCase().startsWith(raw)) return true;
    return false;
  }

  const serial = serialKey(t.customer_devices?.serial_number);
  const phone = normalizePhone(t.customer_phone);

  // Kun tal (og evt. mellemrum, +, -): sagsnummer, telefon eller IMEI.
  if (/^[+\d\s()-]+$/.test(raw)) {
    const digits = normalizePhone(raw);
    if (!digits) return false;
    const seq = ticketParts(t.ticket_number)?.seq;
    if (/^\d{1,6}$/.test(raw.replace(/\s/g, "")) && seq !== undefined && seq === Number(digits)) return true;
    if (digits.length >= 4) {
      if (phone.includes(digits)) return true;
      if (serial && serial.includes(digits)) return true;
    }
    return false;
  }

  // Delvis uuid ("3fa85f64") for ældre sager.
  if (/^[0-9a-f]{8}$/.test(raw) && t.id.toLowerCase().startsWith(raw)) return true;

  const text = haystack(t);
  const tokens = raw.split(/\s+/).filter(Boolean);
  return tokens.every((tok) => {
    if (text.includes(tok)) return true;
    const ps = parseTicketNumber(tok);
    if (ps) return ticketParts(t.ticket_number)?.seq === ps.seq;
    if (serial && serial.includes(serialKey(tok))) return true;
    const d = digitsOnly(tok);
    return d.length >= 4 && (phone.includes(normalizePhone(tok)) || serial.includes(d));
  });
}

/* ------------------------------------------------------------------ */
/*  Tid: København                                                     */
/* ------------------------------------------------------------------ */

const TZ = "Europe/Copenhagen";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "2026-10-04" i dansk tid. */
export function dateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return dateFmt.format(date);
}

/** "16:30" i dansk tid. */
export function timeKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return timeFmt.format(date);
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Lægger hverdage til (lørdag og søndag springes over). */
export function addBusinessDays(key: string, days: number): string {
  let out = key;
  let left = days;
  while (left > 0) {
    out = addDays(out, 1);
    const [y, m, d] = out.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dow !== 0 && dow !== 6) left -= 1;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Afhentning                                                         */
/* ------------------------------------------------------------------ */

export type Pickup = { date: string; time: string | null; source: "promised" | "booking" | "estimate" | "created" };

/**
 * Hvornår afhentes sagen? 1) lovet tidspunkt (kolonnen promised_at, når den findes),
 * 2) kundens ønskede dag fra webbookingen, 3) oprettet + det seneste tilbuds estimat
 * i hverdage, 4) oprettelsesdagen.
 */
export function pickupFor(t: CaseListTicket): Pickup {
  if (t.promised_at) {
    return { date: dateKey(t.promised_at), time: timeKey(t.promised_at), source: "promised" };
  }
  const preferred = t.booking_details?.preferred_date;
  if (preferred && /^\d{4}-\d{2}-\d{2}/.test(preferred)) {
    const time = t.booking_details?.preferred_time;
    return {
      date: preferred.slice(0, 10),
      time: time && /^\d{1,2}:\d{2}/.test(time) ? time.slice(0, 5).padStart(5, "0") : null,
      source: "booking",
    };
  }
  const created = dateKey(t.created_at);
  const quote = [...(t.repair_quotes ?? [])]
    .filter((q) => q.estimated_days && q.estimated_days > 0)
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0];
  if (quote?.estimated_days) {
    return { date: addBusinessDays(created, quote.estimated_days), time: null, source: "estimate" };
  }
  return { date: created, time: null, source: "created" };
}

/* ------------------------------------------------------------------ */
/*  Række til listen                                                   */
/* ------------------------------------------------------------------ */

export type CaseRow = {
  id: string;
  label: string;
  status: string;
  tab: CaseTab;
  customer_name: string;
  customer_phone: string;
  device: string;
  task: string;
  title: string;
  pickup: Pickup;
  is_urgent: boolean;
  on_hold_reason: string | null;
  paid: boolean;
  store_id: string | null;
  assigned_to: string | null;
  is_web_booking: boolean;
  created_at: string;
  /** Sagsnumre på de andre sager fra samme indlevering ("Del af indlevering med ..."). */
  group_with?: { id: string; label: string }[];
};

/** "Batteriskift, Skærmskift" ud fra ydelserne; ellers service_type eller fejlbeskrivelsen. */
export function taskLabel(t: CaseListTicket): string {
  const lines = (t.services?.length ? t.services : t.booking_details?.selected_services) ?? [];
  const names = lines.map((s) => s.name?.trim()).filter(Boolean);
  if (names.length) return names.join(", ");
  if (t.service_type?.trim()) return t.service_type.trim();
  const issue = t.issue_description?.trim() ?? "";
  return issue.length > 60 ? `${issue.slice(0, 57)}...` : issue;
}

export function deviceLabel(t: Pick<CaseListTicket, "device_model" | "device_type">): string {
  return t.device_model?.trim() || t.device_type?.trim() || "Enhed";
}

export function toCaseRow(t: CaseListTicket): CaseRow {
  const device = deviceLabel(t);
  const task = taskLabel(t);
  return {
    id: t.id,
    label: ticketLabel(t),
    status: t.status,
    tab: classifyTab(t),
    customer_name: t.customer_name,
    customer_phone: t.customer_phone ?? "",
    device,
    task,
    title: task ? `${device} · ${task}` : device,
    pickup: pickupFor(t),
    is_urgent: Boolean(t.is_urgent),
    on_hold_reason: t.on_hold_reason?.trim() || null,
    paid: Boolean(t.paid),
    store_id: t.store_id ?? null,
    assigned_to: t.assigned_to?.trim() || null,
    is_web_booking: isWebBooking(t),
    created_at: t.created_at,
  };
}

/**
 * Tilføjer `group_with` til rækker, hvis sag er del af en indlevering med flere enheder.
 * Søskende slås op i ALLE hentede sager (ikke kun den aktuelle fane/søgning).
 */
export function attachGroups(rows: CaseRow[], tickets: Pick<CaseListTicket, "id" | "ticket_number" | "intake_group_id">[]): CaseRow[] {
  const groups = new Map<string, { id: string; label: string }[]>();
  const groupOf = new Map<string, string>();
  for (const t of tickets) {
    if (!t.intake_group_id) continue;
    groupOf.set(t.id, t.intake_group_id);
    const list = groups.get(t.intake_group_id) ?? [];
    list.push({ id: t.id, label: ticketLabel(t) });
    groups.set(t.intake_group_id, list);
  }
  if (groups.size === 0) return rows;
  return rows.map((r) => {
    const g = groupOf.get(r.id);
    const others = g ? (groups.get(g) ?? []).filter((x) => x.id !== r.id).sort((a, b) => a.label.localeCompare(b.label)) : [];
    return others.length > 0 ? { ...r, group_with: others } : r;
  });
}

/** Åbne sager først (nærmeste afhentning øverst); afsluttede til sidst, nyeste først. */
export function compareRows(a: CaseRow, b: CaseRow): number {
  const aClosed = isClosed(a.status);
  const bClosed = isClosed(b.status);
  if (aClosed !== bClosed) return aClosed ? 1 : -1;
  const aKey = `${a.pickup.date} ${a.pickup.time ?? "99:99"}`;
  const bKey = `${b.pickup.date} ${b.pickup.time ?? "99:99"}`;
  if (aKey !== bKey) return aClosed ? (aKey < bKey ? 1 : -1) : aKey < bKey ? -1 : 1;
  return b.created_at < a.created_at ? 1 : b.created_at > a.created_at ? -1 : a.id < b.id ? -1 : 1;
}

/* ------------------------------------------------------------------ */
/*  Gruppering efter afhentningsdag                                    */
/* ------------------------------------------------------------------ */

export type CaseGroup = { key: string; label: string; rows: CaseRow[] };

const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
const MONTHS = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

function longDate(key: string, withYear = false): string {
  const [y, m, d] = key.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[dow]} ${d}. ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Overskrift for en dag: "I dag, lørdag 4. oktober", "I morgen, …", ellers "Mandag 6. oktober". */
export function dayLabel(key: string, todayKey: string): string {
  const withYear = key.slice(0, 4) !== todayKey.slice(0, 4);
  if (key === todayKey) return `I dag, ${longDate(key)}`;
  if (key === addDays(todayKey, 1)) return `I morgen, ${longDate(key)}`;
  return capitalize(longDate(key, withYear));
}

/** Er en åben, ikke-færdigmeldt sag forbi sin afhentningsdag? */
export function isOverdue(row: Pick<CaseRow, "status" | "pickup">, todayKey: string): boolean {
  return !isClosed(row.status) && row.status !== "faerdig" && row.pickup.date < todayKey;
}

/**
 * Deler rækker (allerede sorteret med compareRows) i grupper efter afhentningsdag.
 * Forfaldne sager samles øverst; afsluttede sager får egne grupper nederst.
 */
export function groupRows(rows: CaseRow[], todayKey: string): CaseGroup[] {
  const groups: CaseGroup[] = [];
  for (const row of rows) {
    let key: string;
    let label: string;
    if (isClosed(row.status)) {
      key = `closed:${row.pickup.date}`;
      label = `Afsluttet, ${longDate(row.pickup.date, row.pickup.date.slice(0, 4) !== todayKey.slice(0, 4))}`;
    } else if (isOverdue(row, todayKey)) {
      key = "overdue";
      label = "Forfaldne";
    } else {
      key = `open:${row.pickup.date}`;
      label = dayLabel(row.pickup.date, todayKey);
    }
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, label, rows: [row] });
  }
  return groups;
}

/** "16.00" i dag; "6. okt. 16.00" andre dage; tom, hvis tidspunktet ikke kendes. */
export function pickupCell(row: Pick<CaseRow, "pickup">, groupKey: string): string {
  const { date, time } = row.pickup;
  const clock = time ? time.replace(":", ".") : null;
  if (groupKey.startsWith("open:")) return clock ?? "Hele dagen";
  const [, m, d] = date.split("-").map(Number);
  const short = `${d}. ${MONTHS[m - 1].slice(0, 3)}.`;
  return clock ? `${short} ${clock}` : short;
}

/** "20123456" -> "20 12 34 56"; andre formater vises som de er. */
export function formatPhone(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  const digits = normalizePhone(raw);
  if (digits.length === 8) {
    const grouped = digits.replace(/(\d{2})(?=\d)/g, "$1 ");
    return /^(\+|00)45/.test(raw.replace(/\s/g, "")) ? `+45 ${grouped}` : grouped;
  }
  return raw;
}
