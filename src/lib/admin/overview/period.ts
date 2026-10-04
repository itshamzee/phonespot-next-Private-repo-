import { copenhagenDateString, copenhagenDayBounds } from "@/lib/pos/copenhagen";

/**
 * Perioder på Overblik og Økonomi. Alle grænser er danske kalenderdage
 * (Europe/Copenhagen), halv-åbne: [start, slut). Ugen starter mandag.
 */

export type PeriodKey = "dag" | "uge" | "maaned" | "kvartal" | "aar";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  dag: "I dag",
  uge: "Denne uge",
  maaned: "Denne måned",
  kvartal: "Dette kvartal",
  aar: "I år",
};

/** Til overskrifter som "Moms denne uge". */
export const PERIOD_PHRASE: Record<PeriodKey, string> = {
  dag: "i dag",
  uge: "denne uge",
  maaned: "denne måned",
  kvartal: "dette kvartal",
  aar: "i år",
};

export const OVERBLIK_PERIODS: PeriodKey[] = ["dag", "uge", "maaned"];
export const OKONOMI_PERIODS: PeriodKey[] = ["maaned", "kvartal", "aar"];

export function parsePeriod(value: unknown, allowed: PeriodKey[], fallback: PeriodKey): PeriodKey {
  return typeof value === "string" && (allowed as string[]).includes(value) ? (value as PeriodKey) : fallback;
}

export type PeriodRange = {
  key: PeriodKey;
  /** Dansk kalenderdato for "nu" (YYYY-MM-DD). */
  today: string;
  startIso: string;
  endIso: string;
  /** Samme forløb i forrige periode (afkortet til det antal timer, der er gået i denne). */
  prevStartIso: string;
  prevEndIso: string;
  /** "mod sidste torsdag", "mod sidste uge" ... */
  compareLabel: string;
};

const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];

function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function fmt(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

export function addDays(dateStr: string, n: number): string {
  const { y, m, d } = parseDate(dateStr);
  return fmt(y, m, d + n);
}

export function addMonths(dateStr: string, n: number): string {
  const { y, m } = parseDate(dateStr);
  return fmt(y, m + n, 1);
}

/** Ugedag (0 = søndag) for en kalenderdato, uafhængig af tidszone. */
function weekday(dateStr: string): number {
  const { y, m, d } = parseDate(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function startOf(key: PeriodKey, today: string): string {
  const { y, m } = parseDate(today);
  switch (key) {
    case "dag":
      return today;
    case "uge":
      return addDays(today, -((weekday(today) + 6) % 7));
    case "maaned":
      return fmt(y, m, 1);
    case "kvartal":
      return fmt(y, Math.floor((m - 1) / 3) * 3 + 1, 1);
    case "aar":
      return fmt(y, 1, 1);
  }
}

function nextStart(key: PeriodKey, start: string): string {
  switch (key) {
    case "dag":
      return addDays(start, 1);
    case "uge":
      return addDays(start, 7);
    case "maaned":
      return addMonths(start, 1);
    case "kvartal":
      return addMonths(start, 3);
    case "aar":
      return addMonths(start, 12);
  }
}

function previousStart(key: PeriodKey, start: string): string {
  switch (key) {
    case "dag":
    case "uge":
      return addDays(start, -7); // dag: samme ugedag i sidste uge
    case "maaned":
      return addMonths(start, -1);
    case "kvartal":
      return addMonths(start, -3);
    case "aar":
      return addMonths(start, -12);
  }
}

export function periodRange(key: PeriodKey, now: Date = new Date()): PeriodRange {
  const today = copenhagenDateString(now);
  const start = startOf(key, today);
  const end = nextStart(key, start);
  const prevStart = previousStart(key, start);
  const prevFullEnd = nextStart(key, prevStart);

  const startIso = copenhagenDayBounds(start).startIso;
  const endIso = copenhagenDayBounds(end).startIso;
  const prevStartIso = copenhagenDayBounds(prevStart).startIso;
  const prevFullEndIso = copenhagenDayBounds(prevFullEnd).startIso;

  const elapsed = Math.max(0, now.getTime() - new Date(startIso).getTime());
  const prevEndMs = Math.min(new Date(prevStartIso).getTime() + elapsed, new Date(prevFullEndIso).getTime());

  const compareLabel =
    key === "dag"
      ? `mod sidste ${WEEKDAYS[weekday(today)]}`
      : key === "uge"
        ? "mod sidste uge"
        : key === "maaned"
          ? "mod sidste måned"
          : key === "kvartal"
            ? "mod sidste kvartal"
            : "mod sidste år";

  return {
    key,
    today,
    startIso,
    endIso,
    prevStartIso,
    prevEndIso: new Date(prevEndMs).toISOString(),
    compareLabel,
  };
}
