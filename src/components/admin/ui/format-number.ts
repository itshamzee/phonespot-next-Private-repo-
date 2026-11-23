/**
 * Tal til visning i admin. Beløb ligger i øre overalt i koden og bliver først
 * hele kroner her (da-DK, tusindtalspunktum). Statistik re-eksporterer dem fra
 * components/admin/statistik/format.ts.
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

/** Talformater, en klient-komponent kan få som streng fra en server-komponent. */
export type NumberFormat = "kr" | "int" | "pct";

export function formatNumber(value: number, format: NumberFormat): string {
  if (format === "kr") return kr(value);
  if (format === "pct") return pct(value);
  return int(value);
}
