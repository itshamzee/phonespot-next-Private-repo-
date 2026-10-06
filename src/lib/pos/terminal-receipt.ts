/**
 * Optional receipt number from the stand-alone card terminal. The cashier types
 * it in the card confirmation step; it is saved as order_payments.reference on
 * the card line so a terminal slip can be matched to a sale later.
 */
import type { PaymentLineInput } from "./calc";

export const TERMINAL_RECEIPT_MAX = 40;
const SHAPE = /^[A-Za-z0-9-]+$/;

export type TerminalReceiptCheck = { ok: true; value: string | null } | { ok: false; message: string };

/** Trim and validate. Empty means "not given" (ok, value null). */
export function checkTerminalReceipt(raw: string | null | undefined): TerminalReceiptCheck {
  const v = (raw ?? "").trim();
  if (!v) return { ok: true, value: null };
  if (v.length > TERMINAL_RECEIPT_MAX) return { ok: false, message: `Højst ${TERMINAL_RECEIPT_MAX} tegn` };
  if (!SHAPE.test(v)) return { ok: false, message: "Brug kun tal, bogstaver og bindestreg" };
  return { ok: true, value: v };
}

/**
 * Put the receipt number on the first card line that has no reference yet.
 * With no (valid) number the very same array comes back, so the request body
 * is identical to what it was before.
 */
export function withTerminalReceipt<T extends PaymentLineInput>(lines: T[], raw: string | null | undefined): T[] {
  const check = checkTerminalReceipt(raw);
  if (!check.ok || !check.value) return lines;
  const idx = lines.findIndex((l) => l.type === "kort_terminal" && !l.reference);
  if (idx < 0) return lines;
  return lines.map((l, i) => (i === idx ? { ...l, reference: check.value } : l));
}
