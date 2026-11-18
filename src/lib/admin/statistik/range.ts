import { POS_TIME_ZONE } from "@/lib/pos/constants";
import { copenhagenDateString, copenhagenDayBounds, isValidDateString } from "@/lib/pos/copenhagen";
import { addDays, addMonths } from "@/lib/admin/overview/period";

/**
 * Perioder, sammenligning og tidsinddeling til Statistik. Alle grænser er danske
 * kalenderdage (Europe/Copenhagen), halv-åbne: [start, slut). Ugen starter mandag.
 */

export type StatPreset = "idag" | "igaar" | "7d" | "30d" | "aar";
export type BucketUnit = "time" | "dag" | "uge" | "maaned";
export type StatBucket = { key: string; label: string; startIso: string; endIso: string };
export type StatRange = {
  preset: StatPreset | "valg";
  /** Inklusive danske datoer, YYYY-MM-DD. */
  from: string;
  to: string;
  /** endIso = starten af dagen efter `to`. */
  startIso: string;
  endIso: string;
  prev: { startIso: string; endIso: string } | null;
  compareLabel: string;
  rangeLabel: string;
  unit: BucketUnit;
  buckets: StatBucket[];
};

export const STAT_PRESETS: { value: StatPreset; label: string }[] = [
  { value: "idag", label: "I dag" },
  { value: "igaar", label: "I går" },
  { value: "7d", label: "7 dage" },
  { value: "30d", label: "30 dage" },
  { value: "aar", label: "I år" },
];

const HOUR_MS = 3_600_000;
const MONTHS = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: POS_TIME_ZONE,
  hourCycle: "h23",
  hour: "2-digit",
});

function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function dayNumber(dateStr: string): number {
  const { y, m, d } = parseDate(dateStr);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Antal kalenderdage fra a til b (b minus a). */
function daysBetween(a: string, b: string): number {
  return Math.round(dayNumber(b) - dayNumber(a));
}

function mondayOf(dateStr: string): string {
  const { y, m, d } = parseDate(dateStr);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(dateStr, -((wd + 6) % 7));
}

/** Den 1. i datoens måned. */
function monthStart(dateStr: string): string {
  return addMonths(dateStr, 0);
}

function startOf(dateStr: string): string {
  return copenhagenDayBounds(dateStr).startIso;
}

function shortDate(dateStr: string): string {
  const { m, d } = parseDate(dateStr);
  return `${d}. ${MONTHS[m - 1]}`;
}

const WEEKDAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

function weekdayName(dateStr: string): string {
  const { y, m, d } = parseDate(dateStr);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function rangeLabel(from: string, to: string): string {
  const yFrom = parseDate(from).y;
  const yTo = parseDate(to).y;
  // Én dag læses med ugedagen, så man kan se, hvor man er, når man bladrer.
  if (from === to) return `${weekdayName(to)} ${shortDate(to)} ${yTo}`;
  return yFrom === yTo
    ? `${shortDate(from)} – ${shortDate(to)} ${yTo}`
    : `${shortDate(from)} ${yFrom} – ${shortDate(to)} ${yTo}`;
}

function buildBuckets(unit: BucketUnit, from: string, to: string, startIso: string, endIso: string): StatBucket[] {
  const out: StatBucket[] = [];

  if (unit === "time") {
    // Trin gennem rigtige tidspunkter, så skiftedagene får 23 eller 25 timer.
    const endMs = Date.parse(endIso);
    for (let t = Date.parse(startIso); t < endMs; t += HOUR_MS) {
      const s = new Date(t).toISOString();
      const label = String(Number(hourFormatter.format(new Date(t))));
      out.push({ key: s, label, startIso: s, endIso: new Date(Math.min(t + HOUR_MS, endMs)).toISOString() });
    }
    return out;
  }

  const lastExclusive = addDays(to, 1);
  let cur = from;
  while (cur < lastExclusive) {
    let next: string;
    let key = cur;
    let label = shortDate(cur);
    if (unit === "dag") {
      next = addDays(cur, 1);
    } else if (unit === "uge") {
      next = addDays(mondayOf(cur), 7);
    } else {
      next = addMonths(cur, 1);
      key = cur.slice(0, 7);
      label = MONTHS[parseDate(cur).m - 1];
    }
    if (next > lastExclusive) next = lastExclusive;
    out.push({ key, label, startIso: startOf(cur), endIso: startOf(next) });
    cur = next;
  }
  return out;
}

function unitFor(days: number): BucketUnit {
  if (days <= 1) return "time";
  if (days <= 92) return "dag";
  if (days <= 366) return "uge";
  return "maaned";
}

type BuildArgs = {
  preset: StatRange["preset"];
  from: string;
  to: string;
  /** Hele forrige periode i kalenderdage, eller null. */
  prevFrom: string | null;
  prevTo: string | null;
  compareLabel: string;
  unit?: BucketUnit;
  now: Date;
};

function build(a: BuildArgs): StatRange {
  const startIso = startOf(a.from);
  const endIso = startOf(addDays(a.to, 1));
  const nowMs = a.now.getTime();

  let prev: StatRange["prev"] = null;
  if (a.prevFrom && a.prevTo) {
    const prevStartIso = startOf(a.prevFrom);
    const prevFullEndMs = Date.parse(startOf(addDays(a.prevTo, 1)));
    let prevEndMs = prevFullEndMs;
    // Rummer perioden "nu", sammenlignes kun med det samme forløb i forrige periode.
    if (nowMs >= Date.parse(startIso) && nowMs < Date.parse(endIso)) {
      prevEndMs = Math.min(Date.parse(prevStartIso) + (nowMs - Date.parse(startIso)), prevFullEndMs);
    }
    prev = { startIso: prevStartIso, endIso: new Date(prevEndMs).toISOString() };
  }

  const unit = a.unit ?? unitFor(daysBetween(a.from, a.to) + 1);
  return {
    preset: a.preset,
    from: a.from,
    to: a.to,
    startIso,
    endIso,
    prev,
    compareLabel: a.compareLabel,
    rangeLabel: rangeLabel(a.from, a.to),
    unit,
    buckets: buildBuckets(unit, a.from, a.to, startIso, endIso),
  };
}

export function statRange(input: StatPreset | { from: string; to: string }, now: Date = new Date()): StatRange {
  const today = copenhagenDateString(now);

  if (typeof input !== "string") {
    const n = daysBetween(input.from, input.to) + 1;
    return build({
      preset: "valg",
      from: input.from,
      to: input.to,
      prevFrom: addDays(input.from, -n),
      prevTo: addDays(input.from, -1),
      // Én dag sammenlignes med hele dagen før; er dagen i dag, med i går samme tid (build afkorter).
      compareLabel: n > 1 ? `mod de ${n} dage før` : input.from === today ? "mod i går samme tid" : "mod dagen før",
      now,
    });
  }

  switch (input) {
    case "idag":
      return build({
        preset: "idag",
        from: today,
        to: today,
        prevFrom: addDays(today, -1),
        prevTo: addDays(today, -1),
        compareLabel: "mod i går samme tid",
        now,
      });
    case "igaar": {
      const y = addDays(today, -1);
      return build({
        preset: "igaar",
        from: y,
        to: y,
        prevFrom: addDays(y, -7),
        prevTo: addDays(y, -7),
        compareLabel: "mod samme ugedag ugen før",
        now,
      });
    }
    case "7d":
    case "30d": {
      const n = input === "7d" ? 7 : 30;
      const from = addDays(today, -(n - 1));
      return build({
        preset: input,
        from,
        to: today,
        prevFrom: addDays(from, -n),
        prevTo: addDays(from, -1),
        compareLabel: `mod de ${n} dage før`,
        now,
      });
    }
    case "aar":
      return build({
        preset: "aar",
        from: `${parseDate(today).y}-01-01`,
        to: today,
        prevFrom: null,
        prevTo: null,
        compareLabel: "data findes fra marts 2026",
        unit: "maaned",
        now,
      });
  }
}

/**
 * Perioden flyttet sin egen længde i hele danske kalenderdage (1 dag, 7 dage, ...),
 * som `fra`/`til` til URL'en. Bagud stopper ved minDate (så flyttes kortere, og
 * længden bevares); fremad lander højst på i dag. null, når der ikke er mere at
 * bladre til, og altid for "I år".
 */
export function shiftRange(
  range: Pick<StatRange, "preset" | "from" | "to">,
  dir: -1 | 1,
  today: string,
  minDate: string,
): { fra: string; til: string } | null {
  if (range.preset === "aar") return null;
  const n = daysBetween(range.from, range.to) + 1;

  if (dir === -1) {
    if (range.from <= minDate) return null;
    let fra = addDays(range.from, -n);
    if (fra < minDate) fra = minDate;
    return { fra, til: addDays(fra, n - 1) };
  }

  if (range.to >= today) return null;
  let til = addDays(range.to, n);
  if (til > today) til = today;
  const fra = addDays(til, -(n - 1));
  return { fra: fra < minDate ? minDate : fra, til };
}

const PRESET_VALUES: string[] = STAT_PRESETS.map((p) => p.value);

export function parseStatQuery(
  q: { periode?: string; fra?: string; til?: string },
  now: Date,
  minDate: string,
): StatRange {
  const today = copenhagenDateString(now);

  if (q.fra && q.til && isValidDateString(q.fra) && isValidDateString(q.til)) {
    let from = q.fra;
    let to = q.til;
    if (from > to) [from, to] = [to, from];
    const clamp = (d: string) => (d < minDate ? minDate : d > today ? today : d);
    return statRange({ from: clamp(from), to: clamp(to) }, now);
  }

  if (q.periode && PRESET_VALUES.includes(q.periode)) return statRange(q.periode as StatPreset, now);
  return statRange("30d", now);
}

/** Tallene i "Lige nu"-blokken: i dag, i går, ugen og måneden indtil nu. */
export function nowBlockRanges(now: Date = new Date()): {
  idag: StatRange;
  igaar: StatRange;
  uge: StatRange;
  maaned: StatRange;
} {
  const today = copenhagenDateString(now);
  const monday = mondayOf(today);
  const first = monthStart(today);

  return {
    idag: statRange("idag", now),
    igaar: statRange("igaar", now),
    uge: build({
      preset: "valg",
      from: monday,
      to: today,
      prevFrom: addDays(monday, -7),
      prevTo: addDays(monday, -1),
      compareLabel: "mod samme tid sidste uge",
      now,
    }),
    maaned: build({
      preset: "valg",
      from: first,
      to: today,
      prevFrom: addMonths(first, -1),
      prevTo: addDays(first, -1),
      compareLabel: "mod samme tid sidste måned",
      now,
    }),
  };
}
