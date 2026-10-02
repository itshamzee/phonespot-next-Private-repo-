import { POS_TIME_ZONE } from "./constants";

/**
 * Day boundaries in Europe/Copenhagen. A "day" for the cash-up is the local
 * calendar day, which is 23, 24 or 25 hours long around daylight saving. The
 * range is half-open: [startIso, endIso).
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: POS_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function localParts(utcMs: number) {
  const out: Record<string, number> = {};
  for (const p of partsFormatter.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset of Copenhagen from UTC at the given instant, in ms (positive east). */
function offsetMs(utcMs: number): number {
  const p = localParts(utcMs);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** UTC instant of 00:00 local Copenhagen time on the given calendar date. */
function localMidnightUtc(year: number, month: number, day: number): number {
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0);
  const first = naive - offsetMs(naive);
  return naive - offsetMs(first);
}

export function isValidDateString(dateStr: string): boolean {
  const m = DATE_RE.exec(dateStr);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

export type DayBounds = { startIso: string; endIso: string };

/** Half-open UTC range [start, end) covering the Copenhagen calendar day `dateStr` (YYYY-MM-DD). */
export function copenhagenDayBounds(dateStr: string): DayBounds {
  if (!isValidDateString(dateStr)) throw new Error(`Ugyldig dato: ${dateStr}`);
  const m = DATE_RE.exec(dateStr)!;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const start = localMidnightUtc(y, mo, d);
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  const end = localMidnightUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  return { startIso: new Date(start).toISOString(), endIso: new Date(end).toISOString() };
}

/** The Copenhagen calendar date (YYYY-MM-DD) of an instant. */
export function copenhagenDateString(at: Date | string = new Date()): string {
  const p = localParts(new Date(at).getTime());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
