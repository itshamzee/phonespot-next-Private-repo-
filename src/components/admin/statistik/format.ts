/**
 * Visning af Statistik-tal. Beløb ligger i øre overalt i koden og bliver først
 * hele kroner ved visning (da-DK, tusindtalspunktum). Talformaterne bor i
 * components/admin/ui/format-number.ts, så ui aldrig importerer fra statistik.
 */

import { pct } from "@/components/admin/ui/format-number";

export { int, kr, pct, formatNumber, type NumberFormat } from "@/components/admin/ui/format-number";

export type DeltaTone = "up" | "down" | "none";

/** Farven på en procentændring: grøn op (inkl. 0), rød ned, ingen uden sammenligning. */
export function deltaTone(n: number | null | undefined): DeltaTone {
  if (n == null || !Number.isFinite(n)) return "none";
  return n >= 0 ? "up" : "down";
}

/** "+12,3 %" / "−4,1 %" (ægte minus); tom uden sammenligning. */
export function deltaText(n: number | null | undefined): string {
  const tone = deltaTone(n);
  if (tone === "none") return "";
  return `${tone === "up" ? "+" : "−"}${pct(Math.abs(n as number))}`;
}

const MONTHS = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];

/** "2026-11-09" -> "9. nov. 2026" */
export function longDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Dansk klokkeslæt "14.32" for et ISO-tidspunkt. */
export function clock(iso: string): string {
  const parts = clockFormatter.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}.${get("minute")}`;
}
