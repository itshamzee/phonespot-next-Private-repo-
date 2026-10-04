/** Danish number/date formatting for the Kasse. Amounts in, text out. */

/** 129700 -> "1.297,00" */
export function fmt(oere: number): string {
  const sign = oere < 0 ? "−" : "";
  return (
    sign +
    (Math.abs(oere) / 100).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** 129700 -> "1.297,00 kr." */
export function fmtKr(oere: number): string {
  return `${fmt(oere)} kr.`;
}

/** "2026-09-18T10:00:00Z" -> "18. sep." */
export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", day: "numeric", month: "short" }).format(
    new Date(iso),
  );
}

/** "2026-10-04T08:02:00Z" -> "10.02" */
export function clock(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(":", ".");
}
