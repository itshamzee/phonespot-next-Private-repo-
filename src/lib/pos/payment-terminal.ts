/**
 * Card terminal abstraction for the Kasse. SERVER ONLY: it reads
 * POS_TERMINAL_PROVIDER and (later) Worldline credentials. Client code must use
 * the PaymentTerminalKind from ./constants, never import this file.
 *
 * Today every store runs a stand-alone Worldline Dankort terminal that is not
 * connected to us ("manual"): the cashier types the amount on the terminal and
 * presses "Kortet er godkendt" in the Kasse. That confirmation IS the approval,
 * so ManualTerminal approves instantly and returns no transaction id, which
 * leaves the payment payload to pos_create_sale exactly as before.
 *
 * When Worldline gives us API access, WorldlineTerminal sends the amount to the
 * terminal, waits for the result and returns the terminal's transaction id.
 * That id is stored in order_payments.reference for the card line (the
 * pos_create_sale / pos_create_return functions already store a per-line
 * reference, so no SQL change is needed).
 *
 * Provider selection: POS_TERMINAL_PROVIDER = "manual" (default) | "worldline".
 * Any other or missing value falls back to "manual", so a typo never changes
 * how staff work.
 */
import { PosError } from "./errors";
import type { PaymentLineInput } from "./calc";
import type { PaymentTerminalKind } from "./constants";

export type TerminalStatus = "approved" | "declined" | "cancelled" | "error";

export type TerminalResult = {
  status: TerminalStatus;
  /** The terminal/acquirer transaction id. Absent for the manual terminal. */
  transactionId?: string;
  /** Short Danish text from the terminal, shown to the cashier on failure. */
  message?: string;
  /** Receipt text from the terminal, if it hands it to us instead of printing itself. */
  receiptText?: string;
};

export type TerminalChargeInput = {
  amountOere: number;
  /** Our idempotency/correlation key for this payment line. */
  reference: string;
  locationSlug: string;
};

export type TerminalRefundInput = {
  amountOere: number;
  /** The transaction id of the original card payment, when we have it. */
  originalTransactionId?: string;
  reference: string;
  locationSlug: string;
};

export type TerminalCancelInput = {
  /** The reference that was sent with charge(). */
  reference: string;
  locationSlug: string;
};

export interface PaymentTerminal {
  kind: PaymentTerminalKind;
  charge(input: TerminalChargeInput): Promise<TerminalResult>;
  refund(input: TerminalRefundInput): Promise<TerminalResult>;
  /** Abort a charge that is still waiting on the terminal (the cashier pressed "Annuller"). */
  cancel?(input: TerminalCancelInput): Promise<TerminalResult>;
}

/* ------------------------------------------------------------------ */
/*  Manual (today)                                                     */
/* ------------------------------------------------------------------ */

/**
 * Today's flow. The amount is typed on the stand-alone terminal by hand and the
 * Kasse UI asks "Kortet er godkendt" before the sale is sent, so by the time the
 * server sees the payment it is already approved. No transaction id.
 */
export class ManualTerminal implements PaymentTerminal {
  readonly kind = "manual" as const;

  async charge(): Promise<TerminalResult> {
    return { status: "approved" };
  }

  async refund(): Promise<TerminalResult> {
    // The cashier refunds on the terminal by hand ("Refunder på terminalen").
    return { status: "approved" };
  }

  async cancel(): Promise<TerminalResult> {
    return { status: "cancelled" };
  }
}

/* ------------------------------------------------------------------ */
/*  Worldline (not set up yet)                                         */
/* ------------------------------------------------------------------ */

export const WORLDLINE_NOT_READY = "Worldline-terminal er ikke sat op endnu";

/**
 * Placeholder for the integrated Worldline terminal. Every call returns a calm
 * error until the real API is wired in, so no sale is ever created against a
 * terminal we cannot talk to. See docs/worldline-api-spoergsmaal.md for what we
 * still need from Worldline.
 */
export class WorldlineTerminal implements PaymentTerminal {
  readonly kind = "worldline" as const;

  constructor(private readonly locationSlug: string) {}

  async charge(input: TerminalChargeInput): Promise<TerminalResult> {
    void input;
    // TODO(worldline): resolve the terminal for this store. One terminal id per
    //   location (this.locationSlug: "vejle" | "slagelse"), from env or a
    //   pos_registers column, e.g. WORLDLINE_TERMINAL_ID_VEJLE.
    // TODO(worldline): create payment request. POST the amount (input.amountOere,
    //   currency DKK) with input.reference as idempotency key/merchant reference.
    //   Never send or receive card data (PAN/CVV) - the terminal handles the card.
    // TODO(worldline): wait for the result. Either poll the payment request
    //   status (short interval, hard timeout ~120 s, then cancel) or wait for the
    //   webhook to mark it done (store the pending request keyed by reference).
    // TODO(worldline): map the answer to TerminalResult: approved -> transactionId
    //   (acquirer/terminal transaction id, max 100 chars), declined/cancelled ->
    //   short Danish message, timeouts/network -> status "error".
    // TODO(worldline): receipt. If the terminal does not print the card slip,
    //   return it in receiptText so the Kasse receipt can include it.
    return { status: "error", message: WORLDLINE_NOT_READY };
  }

  async refund(input: TerminalRefundInput): Promise<TerminalResult> {
    void input;
    // TODO(worldline): refund (or void when the original is not settled yet).
    //   Send input.amountOere (partial refunds allowed) and
    //   input.originalTransactionId when present; input.reference as idempotency key.
    //   Same wait/poll + mapping as charge().
    return { status: "error", message: WORLDLINE_NOT_READY };
  }

  async cancel(input: TerminalCancelInput): Promise<TerminalResult> {
    void input;
    // TODO(worldline): cancel the pending payment request on this store's
    //   terminal. input.reference is the sale's terminalReference; charge() sent
    //   each card line as `${reference}:${lineIndex}`, so cancel every pending
    //   request with that prefix. The waiting charge() call
    //   must then resolve with status "cancelled".
    return { status: "error", message: WORLDLINE_NOT_READY };
  }

  /** For logs/diagnostics only. */
  get store(): string {
    return this.locationSlug;
  }
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

type Env = Record<string, string | undefined>;

/** The configured provider. Unknown or missing values mean "manual". */
export function paymentTerminalKind(env: Env = process.env): PaymentTerminalKind {
  const raw = env.POS_TERMINAL_PROVIDER?.trim().toLowerCase();
  return raw === "worldline" ? "worldline" : "manual";
}

/** The terminal for a store (locationSlug = locations.slug, e.g. "vejle"). Server side only. */
export function getPaymentTerminal(locationSlug: string, env: Env = process.env): PaymentTerminal {
  switch (paymentTerminalKind(env)) {
    case "worldline":
      return new WorldlineTerminal(locationSlug);
    default:
      return new ManualTerminal();
  }
}

/* ------------------------------------------------------------------ */
/*  Running the card lines of a sale / return through the terminal     */
/* ------------------------------------------------------------------ */

const CARD = "kort_terminal";

function lineReference(base: string, index: number) {
  return `${base}:${index}`;
}

const sentence = (s: string | undefined, fallback: string) => (s?.trim() || fallback).replace(/[.\s]+$/, "");

function terminalFailure(result: TerminalResult, action: "sale" | "refund"): PosError {
  const tail = action === "sale" ? "Salget er ikke gemt." : "Returneringen er ikke gemt.";
  switch (result.status) {
    case "declined":
      return new PosError("terminal_declined", `${sentence(result.message, "Kortet blev afvist på terminalen")}. ${tail}`, 402);
    case "cancelled":
      return new PosError("terminal_cancelled", `Betalingen blev annulleret på terminalen. ${tail}`, 409);
    default:
      return new PosError("terminal_error", `${sentence(result.message, "Terminalen svarede ikke")}. ${tail}`, 503);
  }
}

type RunContext = { reference: string; locationSlug: string };

/**
 * Charge every "kort_terminal" line on the terminal, in order. Returns the
 * payment lines to save: a line whose charge returned a transaction id gets it
 * as its reference; everything else is returned as the very same object (so the
 * manual flow sends an identical payload). Throws a PosError (and voids what was
 * already charged) when a charge is not approved, so no sale is created.
 */
export async function captureCardPayments(
  terminal: PaymentTerminal,
  payments: PaymentLineInput[],
  ctx: RunContext,
): Promise<PaymentLineInput[]> {
  const out: PaymentLineInput[] = [];
  const charged = new Set<string>();
  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    if (p.type !== CARD) {
      out.push(p);
      continue;
    }
    let result: TerminalResult;
    try {
      result = await terminal.charge({ amountOere: p.amountOere, reference: lineReference(ctx.reference, i), locationSlug: ctx.locationSlug });
    } catch (err) {
      console.error("[pos-terminal] charge threw:", err);
      result = { status: "error", message: err instanceof Error && err.message ? err.message : undefined };
    }
    if (result.status !== "approved") {
      await releaseCardPayments(terminal, out, ctx, charged);
      throw terminalFailure(result, "sale");
    }
    if (result.transactionId) charged.add(result.transactionId);
    out.push(result.transactionId ? { ...p, reference: result.transactionId } : p);
  }
  return out;
}

/**
 * Give back card charges that were approved but whose sale could not be saved.
 * Only lines whose reference is one of the terminal transaction ids from this
 * run are touched (manual lines have none, so the manual flow never calls the
 * terminal, even when the cashier typed a reference by hand). Returns false when at
 * least one could not be reversed - the cashier must then refund by hand.
 */
export async function releaseCardPayments(
  terminal: PaymentTerminal,
  captured: PaymentLineInput[],
  ctx: RunContext,
  transactionIds: ReadonlySet<string>,
): Promise<boolean> {
  let ok = true;
  for (let i = 0; i < captured.length; i++) {
    const p = captured[i];
    if (p.type !== CARD || !p.reference || !transactionIds.has(p.reference)) continue;
    try {
      const r = await terminal.refund({
        amountOere: p.amountOere,
        originalTransactionId: p.reference,
        reference: `${lineReference(ctx.reference, i)}:void`,
        locationSlug: ctx.locationSlug,
      });
      if (r.status !== "approved") ok = false;
    } catch (err) {
      console.error("[pos-terminal] void threw:", err);
      ok = false;
    }
  }
  return ok;
}

/**
 * Refund every "kort_terminal" refund line on the terminal. Same contract as
 * captureCardPayments: a returned transaction id becomes the line's reference,
 * anything not approved throws and no credit note is created.
 * originalTransactionId is only sent when the original sale had exactly one
 * card payment with a known id (otherwise the terminal must refund unreferenced).
 */
export async function refundCardPayments(
  terminal: PaymentTerminal,
  refunds: PaymentLineInput[],
  ctx: RunContext & { originalTransactionIds?: string[] },
): Promise<PaymentLineInput[]> {
  const ids = (ctx.originalTransactionIds ?? []).filter(Boolean);
  const originalTransactionId = ids.length === 1 ? ids[0] : undefined;
  const out: PaymentLineInput[] = [];
  for (let i = 0; i < refunds.length; i++) {
    const r = refunds[i];
    if (r.type !== CARD) {
      out.push(r);
      continue;
    }
    let result: TerminalResult;
    try {
      result = await terminal.refund({
        amountOere: r.amountOere,
        ...(originalTransactionId ? { originalTransactionId } : {}),
        reference: lineReference(ctx.reference, i),
        locationSlug: ctx.locationSlug,
      });
    } catch (err) {
      console.error("[pos-terminal] refund threw:", err);
      result = { status: "error", message: err instanceof Error && err.message ? err.message : undefined };
    }
    if (result.status !== "approved") {
      // TODO(worldline): earlier refund lines that were approved cannot be
      // undone automatically; with one card line per return this never happens.
      throw terminalFailure(result, "refund");
    }
    out.push(result.transactionId ? { ...r, reference: result.transactionId } : r);
  }
  return out;
}

/** Transaction ids the terminal produced in this run (lines whose reference changed). */
export function terminalTransactionIds(before: PaymentLineInput[], after: PaymentLineInput[]): Set<string> {
  const ids = new Set<string>();
  after.forEach((p, i) => {
    if (p !== before[i] && p.reference) ids.add(p.reference);
  });
  return ids;
}
