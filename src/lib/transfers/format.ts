import type { TransferLine } from "./types";

const MONTHS = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dayKey(d: Date) {
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
}

/** "i dag 11.20", "i går 16.05", "30. sep." (lokal tid). */
export function formatWhen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = `${pad(d.getHours())}.${pad(d.getMinutes())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return `i dag ${time}`;
  if (dayKey(d) === dayKey(yesterday)) return `i går ${time}`;
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** Overskrift til et kort: "2× USB-C kabel 1 m" eller "iPhone 14 Pro ... + 2 andre varer". */
export function summarizeLines(lines: Pick<TransferLine, "description" | "qty" | "sentQty">[]): string {
  if (lines.length === 0) return "Ingen varer";
  const label = (l: (typeof lines)[number]) => {
    const n = l.sentQty > 0 ? l.sentQty : l.qty;
    return n > 1 ? `${n}× ${l.description}` : l.description;
  };
  if (lines.length === 1) return label(lines[0]);
  const more = lines.length - 1;
  return `${label(lines[0])} + ${more} ${more === 1 ? "anden vare" : "andre varer"}`;
}

/** Øre -> "3.100 kr." (hele kroner, dansk format). */
export function formatKr(oere: number | null | undefined): string {
  if (oere === null || oere === undefined) return "–";
  return `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(oere / 100))} kr.`;
}
