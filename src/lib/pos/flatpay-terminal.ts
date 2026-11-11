/**
 * Flatpay card terminal for the Kasse. SERVER ONLY.
 *
 * The Kasse's sale/return routes call charge()/refund() and wait: we start the
 * payment on the store's terminal, then poll Flatpay until the customer has
 * paid, the card is declined, the cashier cancels, or we time out. Only an
 * approved result lets the sale be saved (see terminal-flow.ts).
 *
 * Every payment line gets a transactionReference derived from our own
 * reference (flatpayTransactionReference), so:
 *   - a retried request never charges twice (Flatpay answers "already started"),
 *   - the cancel route can find the pending payment without stored state,
 *   - the reference saved on order_payments can be looked up at Flatpay later.
 *
 * Note: a Flatpay REFUND is a new card transaction (the customer presents the
 * card again). It is not linked to the original sale.
 */
import {
  FlatpayClient,
  FlatpayError,
  flatpayConfig,
  flatpayTerminalId,
  flatpayTransactionReference,
  type FlatpayDeps,
  type FlatpayTransaction,
  type FlatpayTransactionType,
} from "./flatpay";
import type {
  PaymentTerminal,
  TerminalCancelInput,
  TerminalChargeInput,
  TerminalRefundInput,
  TerminalResult,
} from "./payment-terminal";

type Env = Record<string, string | undefined>;

const POLL_INTERVAL_MS = 1_500;
/** captureCardPayments numbers card lines by their index in the payment list. */
const MAX_LINES_TO_CANCEL = 8;

export const FLATPAY_NO_TERMINAL = "Der er ingen Flatpay-terminal sat op for butikken";

export class FlatpayTerminal implements PaymentTerminal {
  readonly kind = "flatpay" as const;
  private readonly client: FlatpayClient;

  constructor(
    private readonly locationSlug: string,
    env: Env = process.env,
    deps: FlatpayDeps = {},
  ) {
    this.client = new FlatpayClient(flatpayConfig(env), deps);
  }

  private terminalId(): string | undefined {
    return flatpayTerminalId(this.client.config, this.locationSlug);
  }

  async charge(input: TerminalChargeInput): Promise<TerminalResult> {
    return this.run("SALE", input.amountOere, input.reference);
  }

  async refund(input: TerminalRefundInput): Promise<TerminalResult> {
    return this.run("REFUND", input.amountOere, input.reference);
  }

  /**
   * The cashier pressed "Annuller betaling". input.reference is the sale's
   * terminalReference; each card line was started as `${reference}:${index}`,
   * so look those up and cancel the one still waiting on the terminal.
   */
  async cancel(input: TerminalCancelInput): Promise<TerminalResult> {
    const terminalId = this.terminalId();
    if (!terminalId) return { status: "error", message: FLATPAY_NO_TERMINAL };
    const refs = Array.from({ length: MAX_LINES_TO_CANCEL }, (_, i) => flatpayTransactionReference(`${input.reference}:${i}`));
    try {
      const found = await Promise.all(refs.map((r) => this.client.transaction(r, terminalId).catch(() => null)));
      const pending = refs.filter((_, i) => found[i]?.status === "PENDING");
      if (pending.length === 0) {
        return { status: "error", message: "Der er ingen betaling, der venter på terminalen" };
      }
      await Promise.all(pending.map((r) => this.client.cancel(r, terminalId)));
      return { status: "cancelled" };
    } catch (err) {
      return { status: "error", message: describe(err) };
    }
  }

  /* ------------------------------------------------------------------ */

  private async run(type: FlatpayTransactionType, amountOere: number, reference: string): Promise<TerminalResult> {
    const terminalId = this.terminalId();
    if (!terminalId) return { status: "error", message: FLATPAY_NO_TERMINAL };
    if (!Number.isInteger(amountOere) || amountOere <= 0) {
      return { status: "error", message: "Beløbet skal være større end 0" };
    }

    let transactionReference = flatpayTransactionReference(reference);
    try {
      const started = await this.client.start({ terminalId, type, amountOere, transactionReference, externalReference: reference });
      transactionReference = started.transactionReference;
    } catch (err) {
      // A network error may hide a payment that did start; look before giving up.
      if (!(err instanceof FlatpayError) || err.status !== 0) return { status: "error", message: describe(err) };
      const existing = await this.client.transaction(transactionReference, terminalId).catch(() => null);
      if (!existing) return { status: "error", message: describe(err) };
    }

    const deadline = this.client.now() + this.client.config.timeoutMs;
    for (;;) {
      const tx = await this.client.transaction(transactionReference, terminalId).catch((err) => {
        console.error("[flatpay] poll failed:", err instanceof Error ? err.message : err);
        return null;
      });
      const result = tx ? toResult(tx, transactionReference) : null;
      if (result) return result;
      if (this.client.now() >= deadline) break;
      await this.client.sleep(POLL_INTERVAL_MS);
    }

    // No answer in time: stop the payment on the terminal, then read the final state once more.
    await this.client.cancel(transactionReference, terminalId).catch((err) => {
      console.error("[flatpay] cancel after timeout failed:", err instanceof Error ? err.message : err);
    });
    const last = await this.client.transaction(transactionReference, terminalId).catch(() => null);
    const final = last ? toResult(last, transactionReference) : null;
    if (final) return final;
    console.error("[flatpay] payment state unknown after timeout", { transactionReference, terminalId });
    return {
      status: "error",
      message: "Terminalen svarede ikke i tide. Tjek på terminalen, om kortet er trukket, før du prøver igen",
    };
  }
}

/** Final Flatpay state -> TerminalResult. null while the payment is still running. */
function toResult(tx: FlatpayTransaction, fallbackReference: string): TerminalResult | null {
  switch (tx.status) {
    case "COMPLETED":
      return { status: "approved", transactionId: tx.transactionReference || fallbackReference };
    case "DECLINED":
      return { status: "declined", message: tx.errorText?.trim() || "Kortet blev afvist på terminalen" };
    case "CANCELLED":
      return { status: "cancelled" };
    case "FAILED_CREATING":
      return { status: "error", message: tx.errorText?.trim() || "Terminalen kunne ikke starte betalingen" };
    default:
      return null;
  }
}

function describe(err: unknown): string {
  if (err instanceof FlatpayError) {
    switch (err.status) {
      case 0:
        return err.developerCode === "not_configured" ? err.message : "Kunne ikke få forbindelse til Flatpay";
      case 401:
        return "Flatpay afviste adgangen. Tjek Flatpay-opsætningen";
      case 404:
        return "Terminalen er ikke forbundet. Tjek, at den er tændt og på nettet";
      case 409:
        return "Terminalen er i gang med en anden betaling";
      case 408:
        return "Terminalen svarede ikke i tide";
      default:
        return `Flatpay afviste betalingen (${err.message})`;
    }
  }
  return "Uventet fejl fra Flatpay";
}
