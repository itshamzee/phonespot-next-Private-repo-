import { addDays, dateKey, timeKey, type Pickup } from "@/lib/repairs/case-list";

const WD_SHORT = ["søn.", "man.", "tir.", "ons.", "tor.", "fre.", "lør."];
const MONTH_SHORT = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];

function parts(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "i dag 09.41", "i går 16.02" eller "18. sep. 16.47". */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const key = dateKey(iso);
  const today = dateKey(now);
  const clock = timeKey(iso).replace(":", ".");
  if (key === today) return `i dag ${clock}`;
  if (key === addDays(today, -1)) return `i går ${clock}`;
  const p = parts(key);
  return `${p.d}. ${MONTH_SHORT[p.m - 1]} ${clock}`;
}

/** "Tor. 18. sep., 16.47" */
export function formatLong(iso: string): string {
  const key = dateKey(iso);
  const p = parts(key);
  return `${cap(WD_SHORT[p.dow])} ${p.d}. ${MONTH_SHORT[p.m - 1]}, ${timeKey(iso).replace(":", ".")}`;
}

/** "18. sep." */
export function formatDay(iso: string): string {
  const p = parts(dateKey(iso));
  return `${p.d}. ${MONTH_SHORT[p.m - 1]}`;
}

/** "I dag 16.00", "Man. 6. okt. 16.00" */
export function formatPickup(pickup: Pickup, now: Date = new Date()): string {
  const today = dateKey(now);
  const clock = pickup.time ? ` ${pickup.time.replace(":", ".")}` : "";
  if (pickup.date === today) return `I dag${clock}`;
  const p = parts(pickup.date);
  return `${cap(WD_SHORT[p.dow])} ${p.d}. ${MONTH_SHORT[p.m - 1]}${clock}`;
}
