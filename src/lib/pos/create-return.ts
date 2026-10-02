import { createServerClient } from "@/lib/supabase/client";
import { rpcError, PosError } from "./errors";
import { renderReceiptPdf } from "./receipt-data";
import type { OriginalLine, ReturnedSoFar } from "./credit-note";
import type { PaymentLineInput } from "./calc";

export type CreateReturnInput = {
  originalOrderId: string;
  locationId: string;
  registerId: string;
  staffId: string;
  lines: Array<{ orderItemId: string; quantity: number; restock: boolean }>;
  refunds: PaymentLineInput[];
  reason: string;
  notes?: string | null;
};

export type ReturnResult = {
  orderId: string;
  orderNumber: string;
  receiptNumber: string;
  /** Negative: the credit note total. */
  total: number;
  refundAmount: number;
  receiptPdf: Buffer | null;
  warnings: string[];
};

/**
 * Return = credit note. The Postgres function creates a NEW order of type
 * 'credit_note' referencing the original, with negative lines, restocks
 * accessories at the register's location, optionally lists devices again, and
 * records the refund as negative payment lines. The original order is never updated.
 */
export async function createPosReturn(input: CreateReturnInput): Promise<ReturnResult> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("pos_create_return", {
    p_original_order_id: input.originalOrderId,
    p_register_id: input.registerId,
    p_location_id: input.locationId,
    p_staff_id: input.staffId,
    p_lines: input.lines
      .filter((l) => l.quantity > 0)
      .map((l) => ({ order_item_id: l.orderItemId, quantity: l.quantity, restock: l.restock })),
    p_refunds: input.refunds.map((r) => ({
      type: r.type,
      amount_oere: r.amountOere,
      reference: r.reference ?? null,
    })),
    p_reason: input.reason,
    p_notes: input.notes ?? null,
  });

  if (error || !data) {
    throw rpcError("Returneringen kunne ikke oprettes", error ?? { message: "tomt svar" });
  }
  const r = data as {
    order_id: string;
    order_number: string;
    receipt_number: string;
    total: number;
    refund_amount: number;
  };

  const warnings: string[] = [];
  let receiptPdf: Buffer | null = null;
  try {
    receiptPdf = await renderReceiptPdf(r.order_id);
  } catch (err) {
    console.error("[pos] failed to render credit note:", err);
  }
  if (!receiptPdf) warnings.push("Kreditnotaen kunne ikke genereres. Hent den igen fra salgshistorikken.");

  return {
    orderId: r.order_id,
    orderNumber: r.order_number,
    receiptNumber: r.receipt_number,
    total: r.total,
    refundAmount: r.refund_amount,
    receiptPdf,
    warnings,
  };
}

export type ReturnableOrder = {
  id: string;
  orderNumber: string;
  receiptNumber: string | null;
  confirmedAt: string | null;
  total: number;
  locationId: string | null;
  customerName: string | null;
  lines: Array<OriginalLine & { returned: ReturnedSoFar; remaining: number; deviceStatus: string | null }>;
};

type ItemRow = {
  id: string;
  item_type: OriginalLine["itemType"];
  device_id: string | null;
  sku_product_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number | null;
  vat_amount: number | null;
  vat_scheme: "brugtmoms" | "regular" | null;
  purchase_price: number | null;
  original_order_item_id?: string | null;
};

/** Sums what earlier credit notes already took back, per original line (positive numbers). */
export function sumReturned(creditItems: ItemRow[]): Record<string, ReturnedSoFar> {
  const out: Record<string, ReturnedSoFar> = {};
  for (const c of creditItems) {
    if (!c.original_order_item_id) continue;
    const cur = (out[c.original_order_item_id] ??= { quantity: 0, total: 0, discount: 0, vat: 0 });
    cur.quantity += -c.quantity;
    cur.total += -c.total_price;
    cur.discount += -(c.discount_amount ?? 0);
    cur.vat += -(c.vat_amount ?? 0);
  }
  return out;
}

/** Find a POS sale by receipt number (e.g. "V1-000123") or order number and list what can still be returned. */
export async function findReturnableOrder(rawQuery: string): Promise<ReturnableOrder> {
  const q = rawQuery.trim().replace(/[^A-Za-z0-9-]/g, "");
  if (q.length < 3) throw new PosError("order_not_found", "Skriv kvitteringsnummeret", 400);

  const supabase = createServerClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, receipt_number, confirmed_at, total, location_id, customer_id, type, status")
    .or(`receipt_number.ilike.${q},order_number.ilike.${q}`)
    .eq("type", "pos")
    .limit(1)
    .maybeSingle();
  if (!order) throw new PosError("order_not_found", "Salget blev ikke fundet", 404);

  const { data: items } = await supabase
    .from("order_items")
    .select(
      "id, item_type, device_id, sku_product_id, description, quantity, unit_price, total_price, discount_amount, vat_amount, vat_scheme, purchase_price",
    )
    .eq("order_id", order.id);
  const rows = (items ?? []) as ItemRow[];

  const { data: creditNotes } = await supabase
    .from("orders")
    .select("id")
    .eq("type", "credit_note")
    .eq("original_order_id", order.id);
  const creditIds = (creditNotes ?? []).map((c) => c.id);
  let creditItems: ItemRow[] = [];
  if (creditIds.length > 0) {
    const { data } = await supabase
      .from("order_items")
      .select("id, item_type, device_id, sku_product_id, description, quantity, unit_price, total_price, discount_amount, vat_amount, vat_scheme, purchase_price, original_order_item_id")
      .in("order_id", creditIds);
    creditItems = (data ?? []) as ItemRow[];
  }
  const returned = sumReturned(creditItems);

  const deviceIds = rows.map((r) => r.device_id).filter((x): x is string => !!x);
  const statusById = new Map<string, string>();
  if (deviceIds.length > 0) {
    const { data } = await supabase.from("devices").select("id, status").in("id", deviceIds);
    for (const d of data ?? []) statusById.set(d.id, d.status);
  }

  let customerName: string | null = null;
  if (order.customer_id) {
    const { data } = await supabase.from("customers").select("name").eq("id", order.customer_id).maybeSingle();
    customerName = data?.name ?? null;
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    receiptNumber: order.receipt_number,
    confirmedAt: order.confirmed_at,
    total: order.total,
    locationId: order.location_id,
    customerName,
    lines: rows.map((r) => {
      const so = returned[r.id] ?? { quantity: 0, total: 0, discount: 0, vat: 0 };
      return {
        id: r.id,
        itemType: r.item_type,
        deviceId: r.device_id,
        skuProductId: r.sku_product_id,
        description: r.description,
        quantity: r.quantity,
        unitPrice: r.unit_price,
        totalPrice: r.total_price,
        discountAmount: r.discount_amount ?? 0,
        vatAmount: r.vat_amount ?? 0,
        vatScheme: r.vat_scheme,
        purchasePrice: r.purchase_price,
        returned: so,
        remaining: r.quantity - so.quantity,
        deviceStatus: r.device_id ? (statusById.get(r.device_id) ?? null) : null,
      };
    }),
  };
}
