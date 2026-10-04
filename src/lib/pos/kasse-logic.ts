/**
 * Client-safe logic behind the Kasse screen (src/app/(admin)/admin/kasse): cart
 * model, totals, repair-case preload, deposit deduction, payment resolution and
 * the payload for /api/pos/sale. No React, no server imports, so it is unit
 * tested directly.
 *
 * Amounts are integer oere, VAT-inclusive. The database function
 * pos_create_sale re-checks everything that matters (deposit balance, case
 * unpaid, payment sum, stock); this file only drives what the cashier sees.
 */
import { computeSaleTotals, validatePayments, type PaymentLineInput, type PaymentValidation } from "./calc";
import { planDepositApplication, type DepositApplication } from "./deposit-math";
import type { PaymentType } from "./constants";
import type { SaleItem } from "./schemas";
import type { CaseLine } from "@/lib/repairs/case-money";

export const DEFAULT_DEPOSIT_SUGGESTION_OERE = 50_000;

export type CartLine =
  | { key: string; type: "device"; deviceId: string; name: string; detail?: string; price: number; vatScheme: "brugtmoms" | "regular"; repairTicketItemId?: string }
  | { key: string; type: "sku_product"; skuProductId: string; name: string; price: number; quantity: number; repairTicketItemId?: string }
  | { key: string; type: "free_text"; name: string; price: number; quantity: number }
  | { key: string; type: "deposit"; ticketId: string; ticketNumber: string; name: string; price: number }
  | { key: string; type: "repair_service"; ticketId: string; ticketNumber: string; name: string; detail?: string; price: number };

/** What the Kasse needs to know about a loaded repair case (mirrors PosCase from the API). */
export type CaseContext = {
  id: string;
  ticketNumber: string;
  paid: boolean;
  customer: { id: string | null; name: string; phone: string | null; email: string | null };
  deviceLabel: string;
  totalOere: number;
  /** Case lines (items first). Product/device lines are sold as real lines, the rest as one repair line. */
  lines?: CaseLine[];
  description: string;
  deposits: Array<{ id: string; amount_oere: number; paid_at: string; remaining_oere: number }>;
  depositsOk: boolean;
};

/** A deposit deduction line derived from the case; not stored in the cart. */
export type AppliedDepositLine = {
  key: string;
  type: "deposit_applied";
  depositItemId: string;
  ticketId: string;
  name: string;
  /** Positive amount that is taken off. */
  price: number;
  paidAt: string;
};

export type CartView = {
  lines: CartLine[];
  applied: AppliedDepositLine[];
};

export function lineTotal(l: CartLine): number {
  switch (l.type) {
    case "sku_product":
    case "free_text":
      return l.price * l.quantity;
    default:
      return l.price;
  }
}

export function lineIsLocked(l: CartLine): boolean {
  if ((l.type === "device" || l.type === "sku_product") && l.repairTicketItemId) return true;
  return l.type === "deposit" || l.type === "repair_service";
}

/** Sum of the repair-case lines in the cart (what a deposit may be deducted from). */
export function repairTotal(lines: CartLine[]): number {
  return lines.filter((l) => l.type === "repair_service").reduce((s, l) => s + lineTotal(l), 0);
}

export function activeCaseTicketId(lines: CartLine[]): string | null {
  const l = lines.find((x) => x.type === "repair_service");
  return l && l.type === "repair_service" ? l.ticketId : null;
}

/** Discount cap: deposit lines are not discountable (same rule as the database function). */
export function discountableBase(lines: CartLine[]): number {
  return lines.filter((l) => l.type !== "deposit").reduce((s, l) => s + lineTotal(l), 0);
}

/**
 * Which deposits are deducted. Oldest first, each up to its remaining balance,
 * never more than the repair price and never so much that the total (after
 * discount) goes below zero. Empty when the cart has no repair line.
 */
export function planAppliedDeposits(
  lines: CartLine[],
  c: CaseContext | null,
  discountOere: number,
): AppliedDepositLine[] {
  if (!c || !c.depositsOk) return [];
  const ticketId = activeCaseTicketId(lines);
  if (!ticketId || ticketId !== c.id) return [];
  const repair = repairTotal(lines);
  const others = lines.filter((l) => l.type !== "repair_service").reduce((s, l) => s + lineTotal(l), 0);
  const due = Math.min(repair, Math.max(0, repair + others - Math.max(0, discountOere)));
  const plan: DepositApplication[] = planDepositApplication(
    c.deposits.map((d) => ({ id: d.id, remainingOere: d.remaining_oere, paidAt: d.paid_at })),
    due,
  );
  return plan.map((p) => {
    const d = c.deposits.find((x) => x.id === p.depositItemId)!;
    return {
      key: `dep-${p.depositItemId}`,
      type: "deposit_applied" as const,
      depositItemId: p.depositItemId,
      ticketId: c.id,
      name: "Depositum modregnet",
      price: p.amountOere,
      paidAt: d.paid_at,
    };
  });
}

export type CartTotals = {
  subtotal: number;
  discount: number;
  total: number;
  /** Standard 25 % VAT contained in regular lines (a negative applied deposit reduces it). */
  vat: number;
  appliedTotal: number;
  itemCount: number;
};

export function cartTotals(lines: CartLine[], applied: AppliedDepositLine[], discountOere: number): CartTotals {
  const all = [
    ...lines.map((l) => ({
      kind: l.type,
      unitPrice: l.price,
      quantity: l.type === "sku_product" || l.type === "free_text" ? l.quantity : 1,
      costPrice: null,
      vatScheme: (l.type === "device" ? l.vatScheme : "regular") as "brugtmoms" | "regular",
    })),
    ...applied.map((a) => ({
      kind: "deposit_applied" as const,
      unitPrice: -a.price,
      quantity: 1,
      costPrice: null,
      vatScheme: "regular" as const,
    })),
  ];
  const t = computeSaleTotals(all, Math.max(0, discountOere));
  return {
    subtotal: t.subtotal,
    discount: t.discount,
    total: t.total,
    vat: t.vatTotal,
    appliedTotal: applied.reduce((s, a) => s + a.price, 0),
    itemCount: lines.reduce((s, l) => s + (l.type === "sku_product" || l.type === "free_text" ? l.quantity : 1), 0),
  };
}

/** Body items for POST /api/pos/sale. Applied deposits become deposit_applied lines. */
export function toSaleItems(lines: CartLine[], applied: AppliedDepositLine[]): SaleItem[] {
  const items: SaleItem[] = lines.map((l): SaleItem => {
    switch (l.type) {
      case "device":
        return { type: "device", deviceId: l.deviceId, ...(l.repairTicketItemId ? { repairTicketItemId: l.repairTicketItemId } : {}) };
      case "sku_product":
        return {
          type: "sku_product",
          skuProductId: l.skuProductId,
          quantity: l.quantity,
          ...(l.repairTicketItemId ? { repairTicketItemId: l.repairTicketItemId } : {}),
        };
      case "free_text":
        return { type: "free_text", description: l.name.slice(0, 200), unitPriceOere: l.price, quantity: l.quantity };
      case "deposit":
        return { type: "deposit", repairTicketId: l.ticketId, description: l.name.slice(0, 200), unitPriceOere: l.price };
      case "repair_service":
        return {
          type: "repair_service",
          repairTicketId: l.ticketId,
          description: l.name.slice(0, 200),
          unitPriceOere: l.price,
        };
    }
  });
  for (const a of applied) items.push({ type: "deposit_applied", depositItemId: a.depositItemId, amountOere: a.price });
  return items;
}

/**
 * Cart lines for "Hent sag til betaling" (?sag=<id>). Repair, free text and the old case lines
 * stay ONE repair line for the case total. A device or product the customer bought with the case
 * becomes a real device/sku_product line (stock, warranty and brugtmoms are then handled
 * correctly: a device is never folded into the repair line). Items already sold are left out.
 * The deposit deductions are derived from the case (planAppliedDeposits).
 */
export function casePaymentLines(c: CaseContext, key = `case-${c.id}`): CartLine[] {
  const own = (c.lines ?? []).filter((l) => (l.kind === "device" || l.kind === "product") && !l.sold && l.item_id);
  const ownSum = own.reduce((s, l) => s + l.total_oere, 0);
  const repairPrice = Math.max(0, c.totalOere - ownSum);
  const out: CartLine[] = [];
  if (repairPrice > 0 || own.length === 0) {
    out.push({
      key,
      type: "repair_service",
      ticketId: c.id,
      ticketNumber: c.ticketNumber,
      name: c.description.slice(0, 200) || `Sag ${c.ticketNumber}`,
      detail: c.description.replace(/^Sag\s+\S+\s*·\s*/, "") || c.deviceLabel,
      price: repairPrice,
    });
  }
  for (const l of own) {
    if (l.kind === "device" && l.device_id) {
      out.push({
        key: `item-${l.item_id}`,
        type: "device",
        deviceId: l.device_id,
        name: l.name,
        price: l.unit_oere,
        vatScheme: l.vat_scheme ?? "brugtmoms",
        repairTicketItemId: l.item_id,
      });
    } else if (l.kind === "product" && l.sku_product_id) {
      out.push({
        key: `item-${l.item_id}`,
        type: "sku_product",
        skuProductId: l.sku_product_id,
        name: l.name,
        price: l.unit_oere,
        quantity: l.qty,
        repairTicketItemId: l.item_id,
      });
    }
  }
  return out;
}

/** Why a case cannot be charged / taken a deposit on, or null. */
export function caseBlockedReason(c: CaseContext, mode: "payment" | "deposit"): string | null {
  if (c.paid) return `Sag ${c.ticketNumber} er allerede betalt`;
  if (mode === "payment" && !c.depositsOk) {
    return "Depositum kunne ikke hentes. Kør kasse-migrationerne eller prøv igen, så et depositum ikke bliver glemt.";
  }
  return null;
}

/** Deposit dialog validation. A deposit above the case price is allowed (warned), not blocked. */
export function validateDeposit(amountOere: number | null, c: CaseContext): { ok: boolean; message: string | null; warning: string | null } {
  if (amountOere == null || amountOere <= 0) return { ok: false, message: "Skriv et beløb over 0", warning: null };
  const blocked = caseBlockedReason(c, "deposit");
  if (blocked) return { ok: false, message: blocked, warning: null };
  const warning =
    c.totalOere > 0 && amountOere + c.deposits.reduce((s, d) => s + Math.max(0, d.remaining_oere), 0) > c.totalOere
      ? "Depositummet er større end sagens pris"
      : null;
  return { ok: true, message: null, warning };
}

export type PaymentChoice =
  | { kind: "single"; type: PaymentType }
  | { kind: "split"; lines: PaymentLineInput[] };

/** Payment lines to send for a total. A zero total takes no payment. */
export function resolvePayments(choice: PaymentChoice, total: number): PaymentLineInput[] {
  if (total <= 0) return [];
  if (choice.kind === "single") return [{ type: choice.type, amountOere: total }];
  return choice.lines;
}

export function checkPayments(choice: PaymentChoice, total: number): PaymentValidation {
  return validatePayments(resolvePayments(choice, total), total);
}

/** Does the payment include the stand-alone card terminal (needs the manual "Kortet er godkendt")? */
export function usesCardTerminal(payments: PaymentLineInput[]): boolean {
  return payments.some((p) => p.type === "kort_terminal");
}

export function paymentsNeedCustomer(payments: PaymentLineInput[]): boolean {
  return payments.some((p) => p.type === "faktura");
}

/**
 * Reads ?sag and ?depositum from the Kasse URL. Only a plausible id is accepted
 * so a malformed link never triggers a lookup.
 */
export function parseKasseParams(params: { get(name: string): string | null }): {
  caseId: string | null;
  openDeposit: boolean;
} {
  const raw = params.get("sag");
  const caseId = raw && /^[0-9a-z-]{3,40}$/i.test(raw.trim()) ? raw.trim() : null;
  const dep = params.get("depositum");
  return { caseId, openDeposit: !!caseId && (dep === "1" || dep === "true") };
}
