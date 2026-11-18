/**
 * Visning af Statistik-tal. Beløb ligger i øre overalt i koden og bliver først
 * hele kroner her (da-DK, tusindtalspunktum).
 */

const intFormatter = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });

/** Et helt tal med dansk tusindtalsseparator, aldrig "-0". */
export function int(n: number): string {
  const r = Math.round(n);
  if (r === 0) return "0";
  return (r < 0 ? "-" : "") + intFormatter.format(Math.abs(r));
}

/** Øre til hele kroner: 2748500 -> "27.485 kr." */
export function kr(oere: number): string {
  return `${int(oere / 100)} kr.`;
}

/** Procent med én decimal: 36.4 -> "36,4 %"; null -> "–". */
export function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return `${n.toFixed(1).replace(".", ",")} %`;
}

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

/** Talformater, en klient-komponent kan få som streng fra en server-komponent. */
export type NumberFormat = "kr" | "int" | "pct";

export function formatNumber(value: number, format: NumberFormat): string {
  if (format === "kr") return kr(value);
  if (format === "pct") return pct(value);
  return int(value);
}
