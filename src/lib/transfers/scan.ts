import type { TransferLine } from "./types";
import { remaining } from "./rules";

/** Fjern mellemrum og bindestreger, så "35 123456 789012 3" matcher IMEI uden mellemrum. */
export function normalizeCode(raw: string): string {
  return raw.replace(/[\s-]/g, "").toLowerCase();
}

export type ScanLine = Pick<
  TransferLine,
  "id" | "description" | "deviceId" | "sentQty" | "receivedQty" | "returnedQty" | "codes"
>;

/** Antal der er scannet i denne omgang, pr. linje-id. */
export type Pending = Record<string, number>;

export type ScanOutcome =
  | { ok: true; lineId: string; pending: Pending }
  | { ok: false; reason: "unknown" | "already_scanned"; message: string; pending: Pending };

function openQty(line: ScanLine, pending: Pending): number {
  return remaining(line) - (pending[line.id] ?? 0);
}

/**
 * Match en scannet kode mod overførslens linjer. Enheder (IMEI/stregkode/serienr.)
 * tæller 1 én gang; tilbehør (EAN) tæller 1 pr. scanning, op til det sendte antal.
 */
export function applyScan(code: string, lines: ScanLine[], pending: Pending): ScanOutcome {
  const needle = normalizeCode(code);
  if (!needle) return { ok: false, reason: "unknown", message: "Tom kode.", pending };
  const matches = lines.filter((l) => l.codes.some((c) => normalizeCode(c) === needle));
  if (matches.length === 0) {
    return { ok: false, reason: "unknown", message: "Koden hører ikke til denne overførsel.", pending };
  }
  const line = matches.find((l) => openQty(l, pending) > 0);
  if (!line) {
    return {
      ok: false,
      reason: "already_scanned",
      message: `${matches[0].description} er allerede scannet eller modtaget.`,
      pending,
    };
  }
  return { ok: true, lineId: line.id, pending: { ...pending, [line.id]: (pending[line.id] ?? 0) + 1 } };
}

/** Manuel justering af antal; holder sig mellem 0 og det der mangler. */
export function setPending(line: ScanLine, pending: Pending, qty: number): Pending {
  const clamped = Math.max(0, Math.min(remaining(line), Math.floor(qty)));
  const next = { ...pending };
  if (clamped === 0) delete next[line.id];
  else next[line.id] = clamped;
  return next;
}

export function pendingToPayload(pending: Pending): { lineId: string; qty: number }[] {
  return Object.entries(pending)
    .filter(([, q]) => q > 0)
    .map(([lineId, qty]) => ({ lineId, qty }));
}

/** Hvor mange mangler efter det der er scannet nu? */
export function missingAfter(lines: ScanLine[], pending: Pending): number {
  return lines.reduce((sum, l) => sum + Math.max(0, openQty(l, pending)), 0);
}
