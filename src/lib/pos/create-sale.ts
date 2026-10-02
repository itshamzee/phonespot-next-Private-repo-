import { createServerClient } from "@/lib/supabase/client";
import { generateWarrantiesForOrder } from "@/lib/warranty/generate";
import { rpcError } from "./errors";
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
};

/** snake_case payload the pos_create_sale function expects. */
export function toRpcItems(items: SaleItem[]) {
  return items.map((i) => {
    switch (i.type) {
      case "device":
        return { type: "device", device_id: i.deviceId };
      case "sku_product":
        return { type: "sku_product", sku_product_id: i.skuProductId, quantity: i.quantity };
      case "free_text":
        return {
          type: "free_text",
          description: i.description,
          unit_price_oere: i.unitPriceOere,
          quantity: i.quantity ?? 1,
        };
      case "deposit":
        return { type: "deposit", description: i.description ?? "Depositum", unit_price_oere: i.unitPriceOere };
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

/**
 * Create a POS sale. Everything that must be atomic (order, items, device lock,
 * accessory stock at the register's location, payment lines, stock movements,
 * receipt number) happens in ONE Postgres function; this wrapper only calls it,
 * surfaces its errors, and then does the non-critical extras (warranties,
 * receipt PDF) which can never undo the sale.
 */
export async function createPosSale(input: CreateSaleInput): Promise<SaleResult> {
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
    receiptPdf,
    warnings,
  };
}
