import { isDeclineReasonCode, type DeclineReasonCode } from "./decline-reasons";
import { deviceLabel, type LeadDevice } from "./lead-devices";

/**
 * An offer is one row with one amount the customer accepts all or nothing.
 * The lines are descriptive: they say what each device is worth and which ones
 * we are not buying, so the email and the slutseddel can show the split.
 *
 * They are deliberately not separate offers. Per-device acceptance would reach
 * into the accept token, the receipt and the Shipmondo label to serve a half
 * trade that gets negotiated by hand anyway.
 */
export interface OfferLine {
  /** Position in readLeadDevices(inquiry.metadata). */
  index: number;
  /** Frozen at creation so the email survives later metadata edits. */
  label: string;
  amount_ore: number;
  excluded: boolean;
  reason_code: DeclineReasonCode | null;
}

export type BuildResult =
  | { ok: true; lines: OfferLine[]; totalOre: number }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(error: string): BuildResult {
  return { ok: false, error };
}

/**
 * Validates client-supplied lines against the devices actually on the lead and
 * computes the total. The caller must use the returned total rather than any
 * amount the client sent — an offer whose total disagrees with its own lines
 * cannot be explained to the customer.
 */
export function buildOfferLines(devices: LeadDevice[], input: unknown): BuildResult {
  if (devices.length === 0) {
    return fail("Henvendelsen har ingen enhedsdata at byde på");
  }
  if (!Array.isArray(input)) {
    return fail("Tilbudslinjer mangler");
  }
  if (input.length !== devices.length) {
    return fail(`Der skal være én linje pr. enhed (${devices.length})`);
  }

  const lines: OfferLine[] = [];
  const seen = new Set<number>();

  for (const raw of input) {
    if (!isRecord(raw)) return fail("Ugyldig tilbudslinje");

    const index = raw.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= devices.length) {
      return fail("Tilbudslinje peger på en enhed der ikke findes");
    }
    if (seen.has(index)) return fail("Samme enhed optræder to gange");
    seen.add(index);

    const excluded = raw.excluded === true;
    const reasonCode = raw.reason_code;

    if (excluded) {
      if (!isDeclineReasonCode(reasonCode)) {
        return fail("Vælg en årsag til hver enhed du ikke byder på");
      }
      lines.push({
        index,
        label: deviceLabel(devices[index].device),
        amount_ore: 0,
        excluded: true,
        reason_code: reasonCode,
      });
      continue;
    }

    const amount = raw.amount_ore;
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      return fail("Indtast et beløb på hver enhed du byder på");
    }

    lines.push({
      index,
      label: deviceLabel(devices[index].device),
      amount_ore: amount,
      excluded: false,
      reason_code: null,
    });
  }

  lines.sort((a, b) => a.index - b.index);

  const included = lines.filter((line) => !line.excluded);
  if (included.length === 0) {
    // Not an offer at all — the queue turns this into a decline instead, so the
    // lead never ends up with a 0 kr offer nobody can accept.
    return fail("Alle enheder er fravalgt — afvis henvendelsen i stedet");
  }

  return {
    ok: true,
    lines,
    totalOre: included.reduce((sum, line) => sum + line.amount_ore, 0),
  };
}

/**
 * The line for a lead with exactly one device — the shape the manual single
 * amount and the automated offer both write, so everything downstream reads
 * lines rather than special-casing one device.
 */
export function singleLine(devices: LeadDevice[], amountOre: number): OfferLine[] | null {
  if (devices.length !== 1) return null;
  return [
    {
      index: 0,
      label: deviceLabel(devices[0].device),
      amount_ore: amountOre,
      excluded: false,
      reason_code: null,
    },
  ];
}

/**
 * Reads offer_lines off a stored offer. Returns null for rows written before
 * the column existed, and for anything malformed — a broken breakdown must not
 * take down the page that renders the offer.
 */
export function readOfferLines(value: unknown): OfferLine[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const lines: OfferLine[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) return null;
    if (typeof raw.index !== "number" || typeof raw.label !== "string") return null;
    if (typeof raw.amount_ore !== "number") return null;

    const excluded = raw.excluded === true;
    const reasonCode = isDeclineReasonCode(raw.reason_code) ? raw.reason_code : null;
    if (excluded && !reasonCode) return null;

    lines.push({
      index: raw.index,
      label: raw.label,
      amount_ore: raw.amount_ore,
      excluded,
      reason_code: excluded ? reasonCode : null,
    });
  }
  return lines;
}

/** The devices we are actually buying, in lead order. */
export function includedLines(lines: OfferLine[]): OfferLine[] {
  return lines.filter((line) => !line.excluded);
}

/** The devices we told the customer we cannot buy, in lead order. */
export function excludedLines(lines: OfferLine[]): OfferLine[] {
  return lines.filter((line) => line.excluded);
}
