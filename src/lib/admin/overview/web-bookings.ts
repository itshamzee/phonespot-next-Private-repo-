import { normalizeStoreId, storeLabel } from "@/lib/stores";
import { addDays } from "./period";
import { formatTimeWindow, ticketLabel } from "./format";

/**
 * Nye reparationsanmodninger fra hjemmesiden: sager med booking, som ingen har
 * modtaget endnu. Grupperes efter den dag kunden kommer, så en booking til i
 * morgen eller næste uge er synlig fra det øjeblik den lander, og en booking
 * hvor dagen er gået uden at nogen trykkede Modtag, står øverst som overskredet.
 * Rent modul uden I/O, så reglerne kan testes.
 */

export type WebBookingRaw = {
  id: string;
  ticket_number: string | null;
  customer_name: string | null;
  device_model: string | null;
  service_type: string | null;
  store_id: string | null;
  created_at: string;
  booking_details: {
    preferred_date?: string | null;
    preferred_time?: string | null;
    selected_services?: { name: string; price_dkk?: number | null }[] | null;
    total_price_dkk?: number | null;
  } | null;
};

export type WebBookingItem = {
  id: string;
  label: string;
  customer: string;
  title: string;
  /** "899 kr." eller null uden pris. */
  price: string | null;
  store: string;
  /** "10.00–12.00" eller null uden valgt tid. */
  time: string | null;
  /** Booket inden for det seneste døgn. */
  isNew: boolean;
};

/** En booking hvis dag ligger mere end så mange dage tilbage, er ikke "ny" længere, men en glemt sag. */
export const STALE_AFTER_DAYS = 14;

/** Første dato der stadig tæller som ny; ældre bookinger samles i ét tal. */
export function staleCutoff(today: string): string {
  return addDays(today, -STALE_AFTER_DAYS);
}

/** Bookingens dag, eller oprettelsesdagen når kunden ikke valgte en dato. */
export function bookingDay(t: Pick<WebBookingRaw, "booking_details" | "created_at">): string {
  return bookingDate(t as WebBookingRaw) ?? t.created_at.slice(0, 10);
}

export type WebBookings = { groups: WebBookingGroup[]; stale: number };

export type WebBookingGroupKind = "overskredet" | "idag" | "imorgen" | "senere" | "udendato";

export type WebBookingGroup = {
  key: string;
  kind: WebBookingGroupKind;
  label: string;
  items: WebBookingItem[];
};

const WEEKDAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const MONTHS = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];
const NEW_MS = 24 * 60 * 60 * 1000;
const kr = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });

/** "2026-10-29" -> "Torsdag 29. okt." */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d}. ${MONTHS[m - 1]}`;
}

function bookingDate(t: WebBookingRaw): string | null {
  const d = t.booking_details?.preferred_date;
  return d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null;
}

function toItem(t: WebBookingRaw, now: Date): WebBookingItem {
  const services = t.booking_details?.selected_services ?? [];
  const task = services.length ? services.map((s) => s.name).join(", ") : t.service_type;
  const total = t.booking_details?.total_price_dkk ?? services.reduce((n, s) => n + (s.price_dkk ?? 0), 0);
  return {
    id: t.id,
    label: ticketLabel(t.ticket_number),
    customer: t.customer_name?.trim() || "Ukendt kunde",
    title: [t.device_model, task].filter(Boolean).join(" · ") || "Reparation",
    price: total > 0 ? `${kr.format(total)} kr.` : null,
    store: storeLabel(normalizeStoreId(t.store_id)),
    time: formatTimeWindow(t.booking_details?.preferred_time),
    isNew: now.getTime() - Date.parse(t.created_at) < NEW_MS,
  };
}

/** Grupperer efter kundens dag: overskredet, i dag, i morgen, senere dage (én gruppe pr. dag), uden dato. */
export function groupWebBookings(rows: WebBookingRaw[], today: string, now: Date = new Date()): WebBookingGroup[] {
  const tomorrow = addDays(today, 1);
  const sorted = [...rows].sort((a, b) => {
    const da = bookingDate(a) ?? "9999";
    const db = bookingDate(b) ?? "9999";
    if (da !== db) return da.localeCompare(db);
    const ta = a.booking_details?.preferred_time ?? "99";
    const tb = b.booking_details?.preferred_time ?? "99";
    return ta.localeCompare(tb) || a.created_at.localeCompare(b.created_at);
  });

  const groups: WebBookingGroup[] = [];
  const byKey = new Map<string, WebBookingGroup>();
  for (const t of sorted) {
    const date = bookingDate(t);
    let key: string;
    let kind: WebBookingGroupKind;
    let label: string;
    if (!date) {
      key = "udendato";
      kind = "udendato";
      label = "Uden dato";
    } else if (date < today) {
      key = "overskredet";
      kind = "overskredet";
      label = "Overskredet, ikke modtaget";
    } else if (date === today) {
      key = date;
      kind = "idag";
      label = "I dag";
    } else if (date === tomorrow) {
      key = date;
      kind = "imorgen";
      label = `I morgen, ${dayLabel(date).toLowerCase()}`;
    } else {
      key = date;
      kind = "senere";
      label = dayLabel(date);
    }
    let group = byKey.get(key);
    if (!group) {
      group = { key, kind, label, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    const item = toItem(t, now);
    // Overskredne sager viser dagen i stedet for tidsrummet, så man kan se hvor længe de har ligget.
    if (kind === "overskredet" && date) item.time = dayLabel(date);
    group.items.push(item);
  }

  const order: WebBookingGroupKind[] = ["overskredet", "idag", "imorgen", "senere", "udendato"];
  return groups.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.key.localeCompare(b.key));
}

/** Deler i nye (grupperet) og glemte (kun antal), så gamle sager ikke drukner de nye. */
export function splitWebBookings(rows: WebBookingRaw[], today: string, now: Date = new Date()): WebBookings {
  const cutoff = staleCutoff(today);
  const fresh = rows.filter((r) => bookingDay(r) >= cutoff);
  return { groups: groupWebBookings(fresh, today, now), stale: rows.length - fresh.length };
}

export function countWebBookings(groups: WebBookingGroup[]): number {
  return groups.reduce((n, g) => n + g.items.length, 0);
}
