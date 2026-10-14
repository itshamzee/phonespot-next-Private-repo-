import type { StoreLocationConfig } from "@/lib/store-config";

export type OpenStatus = { open: boolean; label: string };

const TZ = "Europe/Copenhagen";

/** "10:00 – 19:00" (config format) -> minutes since midnight. */
function parseSpan(span: string): { opens: number; closes: number; opensText: string; closesText: string } | null {
  const parts = span.split(/[–-]/).map((t) => t.trim());
  if (parts.length !== 2) return null;
  const toMin = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  const opens = toMin(parts[0]);
  const closes = toMin(parts[1]);
  if (Number.isNaN(opens) || Number.isNaN(closes)) return null;
  return { opens, closes, opensText: parts[0].padStart(5, "0"), closesText: parts[1].padStart(5, "0") };
}

function spanForDay(hours: StoreLocationConfig["hours"], weekday: number) {
  // 0 = søndag ... 6 = lørdag
  if (weekday === 0) return parseSpan(hours.sunday);
  if (weekday === 6) return parseSpan(hours.saturday);
  return parseSpan(hours.weekdays);
}

function copenhagenNow(now: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * Åbent/lukket ud fra butikkens faste åbningstider i Europe/Copenhagen.
 * Kender ikke helligdage; det er de ugentlige tider fra store-config.
 */
export function getOpenStatus(hours: StoreLocationConfig["hours"], now: Date = new Date()): OpenStatus | null {
  const { weekday, minutes } = copenhagenNow(now);
  if (weekday < 0) return null;
  const today = spanForDay(hours, weekday);
  if (today && minutes >= today.opens && minutes < today.closes) {
    return { open: true, label: `Åbent nu · lukker kl. ${today.closesText}` };
  }
  if (today && minutes < today.opens) {
    return { open: false, label: `Lukket · åbner i dag kl. ${today.opensText}` };
  }
  const tomorrow = spanForDay(hours, (weekday + 1) % 7);
  if (!tomorrow) return null;
  return { open: false, label: `Lukket · åbner i morgen kl. ${tomorrow.opensText}` };
}
