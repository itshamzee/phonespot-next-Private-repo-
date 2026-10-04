import { copenhagenDateString } from "@/lib/pos/copenhagen";
import { POS_TIME_ZONE } from "@/lib/pos/constants";

/** Visning af tal, tider og sagslinjer på Overblik. Alle beløb er i øre. */

const nf = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });

/** 894000 -> "8.940 kr."; negative beløb får et rigtigt minustegn. */
export function formatKr(oere: number): string {
  const kr = Math.round(oere / 100);
  const text = nf.format(Math.abs(kr));
  return `${kr < 0 ? "−" : ""}${text} kr.`;
}

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: POS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "10.02" i dansk tid. */
export function formatClock(iso: string): string {
  const parts = timeFmt.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}.${get("minute")}`;
}

const MONTHS = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];

/** "2. okt." i dansk tid. */
export function formatShortDate(iso: string): string {
  const [, m, d] = copenhagenDateString(iso).split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]}`;
}

/** Hele kalenderdage (dansk tid) fra `fromIso` til `now`; aldrig negativt. */
export function calendarDaysSince(fromIso: string, now: Date = new Date()): number {
  const a = Date.parse(`${copenhagenDateString(fromIso)}T00:00:00Z`);
  const b = Date.parse(`${copenhagenDateString(now)}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function readyLabel(days: number): string {
  if (days <= 0) return "Klar i dag";
  return days === 1 ? "Klar i 1 dag" : `Klar i ${days} dage`;
}

/** "1189" -> "#1189"; sagsnumre med bogstaver vises uændret. */
export function ticketLabel(ticketNumber: string | null | undefined): string {
  if (!ticketNumber) return "Sag";
  return /^\d+$/.test(ticketNumber) ? `#${ticketNumber}` : ticketNumber;
}

/** "12:00-14:00" -> "12.00–14.00". */
export function formatTimeWindow(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\s*[-–]\s*/g, "–").replace(/:/g, ".");
}
