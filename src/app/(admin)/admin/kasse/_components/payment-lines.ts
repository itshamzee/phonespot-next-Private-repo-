import { oereToInput, parseKr } from "@/lib/pos/money";
import type { PaymentType } from "@/lib/pos/constants";

/** One editable line in the split-payment dialog. */
export type PaymentLineState = {
  id: string;
  type: PaymentType;
  amountKr: string;
  reference: string;
};

export function newPaymentLine(type: PaymentType, amountOere: number): PaymentLineState {
  return {
    id: crypto.randomUUID(),
    type,
    amountKr: amountOere > 0 ? oereToInput(amountOere) : "",
    reference: "",
  };
}

/** Lines in oere. Unparseable amounts count as 0 so validation fails instead of throwing. */
export function paymentLinesToInput(lines: PaymentLineState[]) {
  return lines.map((l) => ({
    type: l.type,
    amountOere: parseKr(l.amountKr) ?? 0,
    reference: l.reference.trim() || null,
  }));
}
