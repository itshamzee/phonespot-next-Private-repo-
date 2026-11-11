/**
 * Sale / return through the card terminal. SERVER ONLY.
 *
 * Manual terminal (default): no database lookups, no terminal calls, and the
 * payment lines reach pos_create_sale / pos_create_return unchanged - exactly
 * today's behaviour.
 *
 * Integrated terminal: the card lines are charged (or refunded) on the store's
 * terminal first; only an approved result lets the atomic database function
 * run, and the terminal's transaction id is saved as that line's reference in
 * order_payments. A sale that fails after an approved charge is voided on the
 * terminal again.
 */
import { randomUUID } from "node:crypto";
import { createServerClient } from "@/lib/supabase/client";
import { createPosSale, type CreateSaleInput, type SaleResult } from "./create-sale";
import { createPosReturn, type CreateReturnInput, type ReturnResult } from "./create-return";
import { PosError, toPosError } from "./errors";
import {
  captureCardPayments,
  getPaymentTerminal,
  paymentTerminalKind,
  refundCardPayments,
  releaseCardPayments,
  terminalTransactionIds,
  type PaymentTerminal,
} from "./payment-terminal";

const CARD = "kort_terminal";

const sentence = (s: string) => s.trim().replace(/[.\s]+$/, "");

/** The terminal for a register's location. Manual mode never touches the database. */
export async function terminalForLocation(locationId: string): Promise<{ terminal: PaymentTerminal; locationSlug: string }> {
  if (paymentTerminalKind() === "manual") return { terminal: getPaymentTerminal(""), locationSlug: "" };
  const supabase = createServerClient();
  const { data } = await supabase.from("locations").select("slug").eq("id", locationId).maybeSingle();
  const locationSlug = (data as { slug?: string | null } | null)?.slug ?? "";
  return { terminal: getPaymentTerminal(locationSlug), locationSlug };
}

function terminalReference(given?: string | null) {
  const r = given?.trim();
  return r ? r.slice(0, 64) : randomUUID();
}

export async function createSaleWithTerminal(
  input: CreateSaleInput & { terminalReference?: string | null },
): Promise<SaleResult> {
  const { terminalReference: given, ...sale } = input;
  if (!sale.payments.some((p) => p.type === CARD)) return createPosSale(sale);

  const { terminal, locationSlug } = await terminalForLocation(sale.locationId);
  const ctx = { reference: terminalReference(given), locationSlug };
  const payments = await captureCardPayments(terminal, sale.payments, ctx);
  const charged = terminalTransactionIds(sale.payments, payments);
  await assertTransactionsUnused(charged);

  try {
    return await createPosSale({ ...sale, payments });
  } catch (err) {
    if (charged.size === 0) throw err;
    const released = await releaseCardPayments(terminal, payments, ctx, charged);
    const pos = toPosError(err);
    const reason = sentence(pos?.message ?? "Salget kunne ikke gemmes");
    console.error("[pos-terminal] sale failed after approved card payment", { reference: ctx.reference, released, err });
    throw new PosError(
      released ? "terminal_voided" : "terminal_void_failed",
      released
        ? `${reason}. Kortbetalingen er ført tilbage på terminalen.`
        : `${reason}. Kortet er trukket, men kunne ikke føres tilbage automatisk. Refunder beløbet på terminalen.`,
      pos?.status ?? 500,
    );
  }
}

export async function createReturnWithTerminal(
  input: CreateReturnInput & { terminalReference?: string | null },
): Promise<ReturnResult> {
  const { terminalReference: given, ...ret } = input;
  if (!ret.refunds.some((r) => r.type === CARD)) return createPosReturn(ret);

  const { terminal, locationSlug } = await terminalForLocation(ret.locationId);
  if (terminal.kind === "manual") {
    // The cashier refunds on the terminal by hand; nothing to call.
    const refunds = await refundCardPayments(terminal, ret.refunds, { reference: terminalReference(given), locationSlug });
    return createPosReturn({ ...ret, refunds });
  }

  // TODO(worldline): pos_create_return validates the credit note only after the
  // refund has gone through on the terminal. If the database refuses it, the
  // money is already back with the customer; we report that loudly below.
  const originalTransactionIds = await originalCardTransactionIds(ret.originalOrderId);
  const ctx = { reference: terminalReference(given), locationSlug, originalTransactionIds };
  const refunds = await refundCardPayments(terminal, ret.refunds, ctx);
  await assertTransactionsUnused(terminalTransactionIds(ret.refunds, refunds));
  try {
    return await createPosReturn({ ...ret, refunds });
  } catch (err) {
    if (terminalTransactionIds(ret.refunds, refunds).size === 0) throw err;
    const pos = toPosError(err);
    console.error("[pos-terminal] return failed after approved card refund", { reference: ctx.reference, err });
    throw new PosError(
      "terminal_refund_unrecorded",
      `${sentence(pos?.message ?? "Kreditnotaen kunne ikke gemmes")}. Pengene er sendt retur på kortet, men kreditnotaen er ikke oprettet. Kontakt ejeren, før du prøver igen.`,
      pos?.status ?? 500,
    );
  }
}

/**
 * A terminal transaction may back exactly one payment line. If the terminal
 * hands back an id that is already saved (a reused reference pointing at an
 * earlier, completed payment), refuse: no new money was taken. Not voided,
 * since the money belongs to that earlier sale.
 */
async function assertTransactionsUnused(ids: ReadonlySet<string>): Promise<void> {
  if (ids.size === 0) return;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("order_payments")
    .select("reference")
    .eq("type", CARD)
    .in("reference", [...ids])
    .limit(1);
  if (error) {
    console.error("[pos-terminal] duplicate check failed:", error.message);
    throw new PosError("terminal_error", "Kortbetalingen kunne ikke kontrolleres. Salget er ikke gemt.", 503);
  }
  if ((data ?? []).length > 0) {
    console.error("[pos-terminal] terminal transaction already used", { ids: [...ids] });
    throw new PosError(
      "terminal_duplicate",
      "Terminalen svarede med en betaling, der allerede hører til et andet salg. Salget er ikke gemt. Prøv igen.",
      409,
    );
  }
}

/** Terminal transaction ids saved on the original sale's card lines. */
async function originalCardTransactionIds(orderId: string): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("order_payments")
    .select("reference")
    .eq("order_id", orderId)
    .eq("type", CARD);
  return ((data ?? []) as Array<{ reference: string | null }>).map((r) => r.reference ?? "").filter(Boolean);
}
