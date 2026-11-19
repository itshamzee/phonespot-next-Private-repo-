/**
 * Safety filter: every kroner amount in a draft must appear in text the
 * assistant got from a lookup (or that a person already wrote in the thread).
 */

// A number: optional thousands separator (dot, space, nbsp) and optional decimals (",00" / ",50").
const NUM = String.raw`(?:\d{1,3}(?:[.   ]\d{3})+|\d+)(?:,\d{1,2})?`;
// One number or a range of numbers ("899–1.299").
const RANGE = String.raw`${NUM}(?:\s*[–—-]\s*${NUM})*`;
// "<range> kr", "<range> DKK", "<range>,-"  OR  "kr. <range>" / "kr <range>" / "DKK <range>".
// (?<![\d.,]) stops a match from starting in the middle of another number.
export const AMOUNT_RE = new RegExp(
  String.raw`(?<![\d.,])(?:(${RANGE})\s*(?:kr(?![a-zæøåA-ZÆØÅ])\.?|DKK|,-)|(?:kr(?![a-zæøåA-ZÆØÅ])\.?|DKK)\s*(${RANGE}))`,
  "gi",
);
const NUM_RE = new RegExp(NUM, "g");

function toNumber(raw: string): number {
  return Number(raw.replace(/[.   ]/g, "").replace(",", "."));
}

/** Amounts in kroner, in order of first appearance, deduplicated. Decimals are preserved. */
export function extractAmounts(text: string): number[] {
  const found: number[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const range = m[1] ?? m[2] ?? "";
    for (const n of range.matchAll(NUM_RE)) {
      const value = toNumber(n[0]);
      if (Number.isFinite(value) && !found.includes(value)) found.push(value);
    }
  }
  return found;
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
