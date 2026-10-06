/**
 * Cash-session maths. Mirrors pos_close_cash_session (SQL is authoritative).
 *
 *   expected = opening float
 *            + cash payments on the session's sales        (kontant, positive)
 *            - cash refunds on the session's credit notes  (kontant, stored negative)
 *            - cash expenses paid out of the drawer
 *   difference = counted - expected          (positive = overskud)
 *
 * Corrections after the session is locked are separate adjustment rows and
 * never change the locked row: final difference = difference + sum(adjustments).
 */

export type CashExpense = { description: string; amountOere: number };

export type CashSessionInput = {
  openingFloat: number;
  /** Sum of kontant order_payments on the session (refunds are negative rows). */
  netCashPayments: number;
  expenses: CashExpense[];
};

export function sumExpenses(expenses: CashExpense[]): number {
  return expenses.reduce((s, e) => s + e.amountOere, 0);
}

export function computeExpectedCash(input: CashSessionInput): number {
  return input.openingFloat + input.netCashPayments - sumExpenses(input.expenses);
}

export function computeCashDifference(countedCash: number, expectedCash: number): number {
  return countedCash - expectedCash;
}

export type CloseValidation = { ok: true } | { ok: false; code: string; message: string };

export function validateCashClose(args: {
  countedCash: number;
  cashToBank: number;
  expenses: CashExpense[];
}): CloseValidation {
  if (!Number.isInteger(args.countedCash) || args.countedCash < 0) {
    return { ok: false, code: "invalid_counted_cash", message: "Optalt kontant skal være 0 eller mere" };
  }
  if (!Number.isInteger(args.cashToBank) || args.cashToBank < 0 || args.cashToBank > args.countedCash) {
    return { ok: false, code: "invalid_cash_to_bank", message: "Beløb til bank kan ikke overstige optalt kontant" };
  }
  for (const e of args.expenses) {
    if (!e.description.trim() || !Number.isInteger(e.amountOere) || e.amountOere <= 0) {
      return { ok: false, code: "invalid_expense", message: "Udlæg skal have tekst og et beløb over 0" };
    }
  }
  return { ok: true };
}

export function finalDifference(difference: number, adjustments: number[]): number {
  return difference + adjustments.reduce((s, a) => s + a, 0);
}

/* ------------------------------------------------------------------ */
/*  Card reconciliation (stand-alone terminal day report)               */
/* ------------------------------------------------------------------ */

/** terminal day report total - card payments in the kasse (positive = terminal charged more). */
export function computeCardDifference(countedTerminal: number, expectedCard: number): number {
  return countedTerminal - expectedCard;
}

/**
 * The terminal total is required (0 is allowed). A difference may be closed,
 * but then needs a short note. SQL (pos_close_cash_session, 8 args) enforces the same.
 */
export function validateCardClose(args: {
  countedTerminal: number | null;
  expectedCard: number;
  note?: string | null;
}): CloseValidation {
  if (args.countedTerminal == null || !Number.isInteger(args.countedTerminal) || args.countedTerminal < 0) {
    return { ok: false, code: "invalid_counted_card", message: "Indtast terminalens total (0 hvis ingen kortsalg)" };
  }
  if (computeCardDifference(args.countedTerminal, args.expectedCard) !== 0 && !(args.note ?? "").trim()) {
    return { ok: false, code: "card_note_required", message: "Skriv en kort note om kortdifferencen" };
  }
  return { ok: true };
}
