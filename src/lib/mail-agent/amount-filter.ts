/**
 * Safety filter: every kroner amount in a draft must appear in text the
 * assistant got from a lookup (or that a person already wrote in the thread).
 * A missed amount means a customer is quoted an invented price, so extraction
 * is deliberately broad; a false positive only costs a human a look.
 */

const L = "a-zæøåA-ZÆØÅ";

// A number: optional thousands separator (dot, space, nbsp) and optional decimals.
// A dot followed by exactly 3 digits is a thousands separator; a dot followed by
// 1-2 digits and then no digit is a decimal separator ("999.95").
const NUM = String.raw`(?:\d{1,3}(?:[.   ]\d{3})+|\d+)(?:,\d{1,2}|\.\d{1,2}(?!\d))?`;
// One number, a range ("899–1.299", "899 til 1.299", "899 eller 1.299") or "mellem 899 og 1.299".
const RANGE = String.raw`(?:mellem\s+${NUM}\s+og\s+${NUM}|${NUM}(?:\s*(?:[–—-]|\b(?:til|eller|og)\b)\s*${NUM})*)`;
// Units after a number: kroner/krone/kr/DKK, ",-" and ".-".
const UNIT_AFTER = String.raw`(?:(?:danske\s+)?kroner?(?![${L}])|kr(?![${L}])\.?|DKK|[,.]-)`;
const UNIT_BEFORE = String.raw`(?:kroner?(?![${L}])|kr(?![${L}])\.?|DKK)`;
// Words that announce a price, followed by a bare number (at least 2 digits).
const PRICE_WORD = String.raw`(?:pris(?:en)?|koster|kostede|i\s+alt|total(?:t|en)?|beløb(?:et)?|betal(?:e|er)?)`;
// Up to two short filler words may sit between the price word and the number (\"prisen ligger på 1299\").
const FILLER = String.raw`(?:\s*:?\s*(?:ligger\s+på|var|bliver|er|på|ca\.?|cirka|omkring|kun|fra)(?![${L}])){0,2}`;
// A number followed by one of these is not money (\"14 dage\", \"128 GB\", \"20 %\", or a phone number).
const NON_MONEY_AFTER = new RegExp(
  String.raw`^(?:\s*(?:dage?|minutter|min|timer|time|måneder|måned|mdr|år|uger|uge|hverdage|stk|enheder|GB|TB|mAh|procent|tommer)(?![${L}])|\s*%|\s\d{2}(?!\d))`,
  "i",
);

// (?<![\d.,]) stops a match from starting in the middle of another number.
const UNIT_RE = new RegExp(
  String.raw`(?<![\d.,])(?:(${RANGE})\s*${UNIT_AFTER}|${UNIT_BEFORE}\s*(${RANGE}))`,
  "gi",
);
const PRICE_WORD_RE = new RegExp(
  String.raw`(?<![${L}\d])${PRICE_WORD}${FILLER}\s*:?\s*(?<![\d.,])(${RANGE})`,
  "gi",
);
/** Longest text the extractors look at; keeps the regexes from stalling on pathological input. */
const MAX_TEXT = 20000;
const NUM_RE = new RegExp(NUM, "g");

export const AMOUNT_RES = { UNIT_RE, PRICE_WORD_RE };

function toNumber(raw: string): number {
  if (/^\d+\.\d{1,2}$/.test(raw)) return Number(raw);
  return Number(raw.replace(/[.   ]/g, "").replace(",", "."));
}

/** Amounts in kroner, in order of first appearance, deduplicated. Decimals are preserved. */
export function extractAmounts(rawText: string): number[] {
  const text = rawText.slice(0, MAX_TEXT);
  const hits: { index: number; sub: number; value: number }[] = [];
  const collect = (re: RegExp, minValue: number, nonMoneyGuard = false) => {
    for (const m of text.matchAll(re)) {
      const range = m[1] ?? m[2] ?? "";
      if (nonMoneyGuard && NON_MONEY_AFTER.test(text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 30))) continue;
      let sub = 0;
      for (const n of range.matchAll(NUM_RE)) {
        const value = toNumber(n[0]);
        if (Number.isFinite(value) && value >= minValue) hits.push({ index: m.index ?? 0, sub: sub++, value });
      }
    }
  };
  collect(UNIT_RE, 0);
  collect(PRICE_WORD_RE, 10, true);
  hits.sort((a, b) => a.index - b.index || a.sub - b.sub);
  const found: number[] = [];
  for (const h of hits) if (!found.includes(h.value)) found.push(h.value);
  return found;
}

const NUMBER_WORD = String.raw`(?:[${L}]*(?:hundrede?|tusinde?)|en|et|ét|to|tre|fire|fem|seks|syv|otte|ni|ti|elleve|tolv|tretten|fjorten|femten|seksten|sytten|atten|nitten|tyve|tredive|fyrre|halvtreds|treds|halvfjerds|firs|halvfems)`;
const MAGNITUDE = String.raw`(?:k|tusinde?|mio\.?|millioner?|mia\.?|milliarder?)(?![${L}\d])`;
const UNPARSEABLE_RES = [
  // spelled out: "hundrede kroner", "to tusind kr", "tohundrede og halvtreds kroner"
  new RegExp(
    String.raw`(?<![${L}])${NUMBER_WORD}(?:\s+(?:og\s+)?${NUMBER_WORD})*\s+(?:kroner?(?![${L}])|kr(?![${L}]))`,
    "i",
  ),
  // "5 tusind kr", "5k kr", "1,5 mio. kr"
  new RegExp(String.raw`(?<![\d.,])\d[\d.,]*\s*${MAGNITUDE}\s*${UNIT_BEFORE}`, "i"),
  // "5 tkr", "5 t.kr"
  new RegExp(String.raw`(?<![\d.,])\d[\d.,]*\s*t\.?\s?kr(?![${L}])`, "i"),
  // "pris 5k", "koster 2 tusind"
  new RegExp(String.raw`(?<![${L}\d])${PRICE_WORD}${FILLER}\s*:?\s*(?<![\d.,])\d[\d.,]*\s*${MAGNITUDE}`, "i"),
];

/** True for amounts we cannot compare numerically: spelled out or abbreviated multipliers. */
export function hasUnparseableAmount(text: string): boolean {
  const capped = text.slice(0, MAX_TEXT);
  return UNPARSEABLE_RES.some((re) => re.test(capped));
}

/** Amounts in the draft that appear in none of the given texts (tool outputs, thread). */
export function unbackedAmounts(draft: string, toolOutputs: string[]): number[] {
  const backed = new Set<number>();
  for (const t of toolOutputs) for (const v of extractAmounts(t)) backed.add(v);
  return extractAmounts(draft).filter((v) => !backed.has(v));
}

/** "999 kr.", "1.500 kr.", "1.299,50 kr." */
export function formatKroner(value: number): string {
  const hasDecimals = !Number.isInteger(value);
  const [whole, dec] = value.toFixed(hasDecimals ? 2 : 0).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped}${dec ? `,${dec}` : ""} kr.`;
}
