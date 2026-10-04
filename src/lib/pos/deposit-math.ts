/**
 * Pure deposit (depositum) maths. All amounts are integer oere, VAT-inclusive.
 *
 * A deposit is a prepayment on a repair case. Danish VAT is due when a
 * prepayment is received (momsloven § 23, stk. 3), so the deposit receipt
 * carries 25 % VAT. At pickup the case is charged at its FULL price (VAT on the
 * full price) and each deposit used appears as a negative "Depositum modregnet"
 * line carrying minus the VAT of what is consumed. Across the two receipts the
 * VAT adds up to exactly the VAT on the full price.
 *
 * pos_deposit_remaining() / pos_create_sale in
 * supabase/migrations/20261004300*.sql implement the same rules; the SQL is
 * authoritative, this file drives the UI and the unit tests.
 */
import { standardVat } from "./calc";

/** What is left of a deposit. Order lines are immutable, so "used" is derived, never a flag. */
export function depositRemaining(input: {
  /** total_price of the deposit line (positive). */
  depositTotal: number;
  /** total_price of lines referencing the deposit: applied (negative) and reversals (positive). */
  appliedLines: number[];
  /** total_price of credit-note lines that returned the deposit (negative). */
  returnLines: number[];
}): number {
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  return input.depositTotal + sum(input.appliedLines) + sum(input.returnLines);
}

export type ApplicableDeposit = { id: string; remainingOere: number; paidAt?: string | null };
export type DepositApplication = { depositItemId: string; amountOere: number };

/**
 * Which deposits to apply to a payment of `amountDueOere` (the part of the sale
 * that is NOT a deposit line). Oldest deposit first, each up to its remaining
 * balance, never more than the amount due: a deposit larger than the final price
 * is applied up to the price and the rest stays on the deposit (to be refunded
 * through the return flow). Never produces a negative total.
 */
export function planDepositApplication(deposits: ApplicableDeposit[], amountDueOere: number): DepositApplication[] {
  const out: DepositApplication[] = [];
  let left = Math.max(0, amountDueOere);
  const ordered = [...deposits].sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? ""));
  for (const d of ordered) {
    if (left <= 0) break;
    if (d.remainingOere <= 0) continue;
    const take = Math.min(d.remainingOere, left);
    out.push({ depositItemId: d.id, amountOere: take });
    left -= take;
  }
  return out;
}

/** True if `amountOere` can still be taken from a deposit with `remainingOere` left. */
export function canApplyDeposit(remainingOere: number, amountOere: number): boolean {
  return Number.isInteger(amountOere) && amountOere > 0 && amountOere <= remainingOere;
}

/** VAT carried on a deposit receipt: 25/125 of the deposit. */
export function depositVat(depositOere: number): number {
  return standardVat(depositOere);
}

/**
 * Total standard VAT over a case: the deposit receipts plus the pickup receipt.
 * The pickup receipt carries VAT on the full price and minus the VAT of each
 * deposit applied (per line, like pos_create_sale), so the total equals the VAT
 * on the full price exactly, with no rounding drift.
 */
export function caseVatTotal(fullPriceOere: number, depositsOere: number[]): {
  vatOnDeposits: number;
  vatAtPickup: number;
  vatTotal: number;
} {
  const vatOnDeposits = depositsOere.reduce((s, x) => s + depositVat(x), 0);
  const vatAtPickup = standardVat(fullPriceOere) - vatOnDeposits;
  return { vatOnDeposits, vatAtPickup, vatTotal: vatOnDeposits + vatAtPickup };
}
