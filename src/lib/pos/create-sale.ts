import { createServerClient } from "@/lib/supabase/client";
import { generateWarrantiesForOrder } from "@/lib/warranty/generate";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";
import { threeForTwo, type ThreeForTwoLine } from "@/lib/lagersalg/three-for-two";
import { PosError, rpcError } from "./errors";
import { renderReceiptPdf } from "./receipt-data";
import type { PaymentLineInput } from "./calc";
import type { SaleItem } from "./schemas";

export type CreateSaleInput = {
  items: SaleItem[];
  /** Split payment lines; they must sum to the sale total (checked in the database). */
  payments: PaymentLineInput[];
  customerId?: string | null;
  staffId: string;
  locationId: string;
  registerId: string;
  discountAmount?: number; // oere
  discountReason?: string | null;
  notes?: string | null;
};

export type SaleResult = {
  orderId: string;
  orderNumber: string;
  receiptNumber: string;
  total: number;
  vatTotal: number;
  brugtmomsTotal: number;
  /** Lagersalg 3 for 2 booked on the sale (oere). */
  bundleDiscount: number;
  /** null if the PDF could not be rendered; the sale itself is committed regardless. */
  receiptPdf: Buffer | null;
  warnings: string[];
};

type SaleRpcResult = {
  order_id: string;
  order_number: string;
  receipt_number: string;
  total: number;
  vat_total: number;
  brugtmoms_total: number;
  bundle_discount?: number;
};

/** snake_case payload the pos_create_sale function expects. */
export function toRpcItems(items: SaleItem[]) {
  return items.map((i) => {
    switch (i.type) {
      case "device":
        return { type: "device", device_id: i.deviceId, ...(i.repairTicketItemId ? { repair_ticket_item_id: i.repairTicketItemId } : {}) };
      case "sku_product":
        return {
          type: "sku_product",
          sku_product_id: i.skuProductId,
          quantity: i.quantity,
          ...(i.repairTicketItemId ? { repair_ticket_item_id: i.repairTicketItemId } : {}),
          ...(i.bundleDiscountOere ? { bundle_discount_oere: i.bundleDiscountOere } : {}),
        };
      case "free_text":
        return {
          type: "free_text",
          description: i.description,
          unit_price_oere: i.unitPriceOere,
          quantity: i.quantity ?? 1,
        };
      case "deposit":
        return {
          type: "deposit",
          repair_ticket_id: i.repairTicketId,
          description: i.description ?? "Depositum",
          unit_price_oere: i.unitPriceOere,
        };
      case "repair_service":
        return {
          type: "repair_service",
          repair_ticket_id: i.repairTicketId,
          description: i.description ?? "Reparation",
          unit_price_oere: i.unitPriceOere,
        };
      case "deposit_applied":
        return { type: "deposit_applied", deposit_item_id: i.depositItemId, amount_oere: i.amountOere };
    }
  });
}

export function toRpcPayments(payments: PaymentLineInput[]) {
  return payments.map((p) => ({
    type: p.type,
    amount_oere: p.amountOere,
    reference: p.reference ?? null,
  }));
}

type BundleContext = {
  /** items index -> 3 for 2 discount the database prices give (only indexes with a discount). */
  expected: Record<number, number>;
  /** items index -> effective unit price from the database (sku lines only). */
  unit: Record<number, number>;
};

async function bundleContext(items: SaleItem[]): Promise<BundleContext> {
  const ids = [...new Set(items.flatMap((i) => (i.type === "sku_product" ? [i.skuProductId] : [])))];
  if (ids.length === 0) return { expected: {}, unit: {} };
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sku_products")
    .select("id, selling_price, sale_price, subcategory, attributes")
    .in("id", ids);
  if (error) throw new Error(`Varerne kunne ikke hentes: ${error.message}`);
  const rows = new Map(
    ((data ?? []) as Array<{
      id: string;
      selling_price: number;
      sale_price: number | null;
      subcategory: string | null;
      attributes: Record<string, string> | null;
    }>).map((r) => [r.id, r]),
  );

  const unit: Record<number, number> = {};
  const lines: ThreeForTwoLine[] = [];
  items.forEach((item, i) => {
    if (item.type !== "sku_product") return;
    const row = rows.get(item.skuProductId);
    // Same effective price as pos_create_sale (sale price only when it is lower).
    const price = row ? (row.sale_price != null && row.sale_price < row.selling_price ? row.sale_price : row.selling_price) : 0;
    unit[i] = price;
    lines.push({
      key: String(i),
      unitPriceOere: price,
      quantity: item.quantity,
      lagersalg: !!row && isLagersalg(row) && !item.repairTicketItemId,
    });
  });
  const result = threeForTwo(lines);
  const expected: Record<number, number> = {};
  for (const [key, v] of Object.entries(result.byKey)) expected[Number(key)] = v.discountOere;
  return { expected, unit };
}

/** The 3 for 2 discount per items index, recomputed from the database (never from the request). */
export async function expectedBundle(items: SaleItem[]): Promise<Record<number, number>> {
  return (await bundleContext(items)).expected;
}

function bundleMismatch(): PosError {
  return new PosError("bundle_mismatch", "Lagersalgsrabatten passer ikke længere. Opdater kurven og prøv igen", 409);
}

/**
 * The client sends the 3 for 2 discount per line (free units as their own line). It is never
 * trusted: per product the sum must equal what the database prices give, every discounted line
 * must be entirely free (unit price x quantity), and a line sold from a repair case gets none.
 * Comparing per product (not per line) keeps two equal-price lines of the same product valid
 * whichever of them the client marked free.
 */
async function assertBundle(items: SaleItem[]): Promise<void> {
  const { expected, unit } = await bundleContext(items);
  const want = new Map<string, number>();
  const got = new Map<string, number>();
  items.forEach((item, i) => {
    if (item.type !== "sku_product") return;
    const sent = item.bundleDiscountOere ?? 0;
    if (sent !== 0 && (item.repairTicketItemId || sent !== unit[i] * item.quantity)) throw bundleMismatch();
    want.set(item.skuProductId, (want.get(item.skuProductId) ?? 0) + (expected[i] ?? 0));
    got.set(item.skuProductId, (got.get(item.skuProductId) ?? 0) + sent);
  });
  for (const [id, w] of want) if (got.get(id) !== w) throw bundleMismatch();
}

/**
 * Create a POS sale. Everything that must be atomic (order, items, device lock,
 * accessory stock at the register's location, payment lines, stock movements,
 * receipt number) happens in ONE Postgres function; this wrapper only calls it,
 * surfaces its errors, and then does the non-critical extras (warranties,
 * receipt PDF) which can never undo the sale.
 */
export async function createPosSale(input: CreateSaleInput): Promise<SaleResult> {
  await assertBundle(input.items);
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc("pos_create_sale", {
    p_location_id: input.locationId,
    p_register_id: input.registerId,
    p_staff_id: input.staffId,
    p_customer_id: input.customerId ?? null,
    p_items: toRpcItems(input.items),
    p_payments: toRpcPayments(input.payments),
    p_discount_amount: input.discountAmount ?? 0,
    p_discount_reason: input.discountReason ?? null,
    p_notes: input.notes ?? null,
  });

  if (error || !data) {
    throw rpcError("Salget kunne ikke oprettes", error ?? { message: "tomt svar" });
  }
  const sale = data as SaleRpcResult;
  const warnings: string[] = [];

  if (input.items.some((i) => i.type === "device")) {
    try {
      await generateWarrantiesForOrder(sale.order_id);
    } catch (err) {
      console.error("[pos] failed to generate warranties:", err);
      warnings.push("Garantibeviser kunne ikke oprettes automatisk");
    }
  }

  let receiptPdf: Buffer | null = null;
  try {
    receiptPdf = await renderReceiptPdf(sale.order_id);
  } catch (err) {
    console.error("[pos] failed to render receipt:", err);
  }
  if (!receiptPdf) warnings.push("Kvitteringen kunne ikke genereres. Hent den igen fra salgshistorikken.");

  return {
    orderId: sale.order_id,
    orderNumber: sale.order_number,
    receiptNumber: sale.receipt_number,
    total: sale.total,
    vatTotal: sale.vat_total,
    brugtmomsTotal: sale.brugtmoms_total,
    bundleDiscount: sale.bundle_discount ?? 0,
    receiptPdf,
    warnings,
  };
}
