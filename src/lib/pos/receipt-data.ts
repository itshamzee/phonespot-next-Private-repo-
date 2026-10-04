import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createServerClient } from "@/lib/supabase/client";
import { PosReceiptPDF, type PosReceiptProps } from "./receipt-pdf";
import { PAYMENT_LABELS, isPaymentType } from "./constants";

type OrderItemRow = {
  item_type: string;
  device_id: string | null;
  sku_product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_scheme: "brugtmoms" | "regular" | null;
  description: string | null;
};

const LEGACY_LABELS: Record<string, string> = {
  card: "Kort",
  cash: "Kontant",
  mobilepay: "MobilePay",
  split: "Delt betaling",
};

/**
 * Builds the receipt for a POS sale OR credit note from what is stored in the
 * database (never from request input), so a reprint is identical to the
 * original. Returns null if the order does not exist or is not a POS document.
 */
export async function loadReceiptProps(orderId: string): Promise<PosReceiptProps | null> {
  const supabase = createServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, type, receipt_number, confirmed_at, created_at, subtotal, discount_amount,
       discount_reason, total, vat_total, payment_method, register_id, location_id, staff_id,
       customer_id, original_order_id, credit_reason,
       order_items ( item_type, device_id, sku_product_id, quantity, unit_price, total_price, vat_scheme, description ),
       order_payments ( type, amount_oere, reference )`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order || (order.type !== "pos" && order.type !== "credit_note")) return null;

  const [register, location, staff, customer, original] = await Promise.all([
    order.register_id
      ? supabase.from("registers").select("name").eq("id", order.register_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.location_id
      ? supabase.from("locations").select("name, address").eq("id", order.location_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.staff_id
      ? supabase.from("staff").select("name").eq("id", order.staff_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.customer_id
      ? supabase.from("customers").select("name").eq("id", order.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.original_order_id
      ? supabase.from("orders").select("order_number, receipt_number").eq("id", order.original_order_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const items = (order.order_items ?? []) as OrderItemRow[];

  // Names/grades for devices and legacy lines without a stored description.
  const deviceIds = items.map((i) => i.device_id).filter((x): x is string => !!x);
  const skuIds = items.filter((i) => !i.description).map((i) => i.sku_product_id).filter((x): x is string => !!x);
  const [devices, skus] = await Promise.all([
    deviceIds.length
      ? supabase.from("devices").select("id, grade, product_templates ( display_name )").in("id", deviceIds)
      : Promise.resolve({ data: [] as unknown[] }),
    skuIds.length
      ? supabase.from("sku_products").select("id, title").in("id", skuIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const deviceMap = new Map(
    ((devices.data ?? []) as Array<{ id: string; grade: string; product_templates: { display_name: string } | { display_name: string }[] | null }>).map(
      (d) => {
        const t = Array.isArray(d.product_templates) ? d.product_templates[0] : d.product_templates;
        return [d.id, { grade: d.grade, name: t?.display_name ?? "Enhed" }] as const;
      },
    ),
  );
  const skuMap = new Map(((skus.data ?? []) as Array<{ id: string; title: string }>).map((s) => [s.id, s.title]));

  const receiptItems = items.map((i) => {
    const dev = i.device_id ? deviceMap.get(i.device_id) : undefined;
    const name =
      i.description ??
      (i.device_id ? dev?.name : i.sku_product_id ? skuMap.get(i.sku_product_id) : null) ??
      (i.item_type === "deposit"
        ? "Depositum"
        : i.item_type === "deposit_applied"
          ? "Depositum modregnet"
          : i.item_type === "repair_service"
            ? "Reparation"
            : "Vare");
    return {
      name,
      grade: dev?.grade,
      isDevice: i.item_type === "device",
      kind: (["deposit", "deposit_applied", "repair_service"] as const).find((k) => k === i.item_type),
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.total_price,
      vatScheme: (i.vat_scheme ?? "regular") as "brugtmoms" | "regular",
    };
  });

  const payments = ((order.order_payments ?? []) as Array<{ type: string; amount_oere: number; reference: string | null }>).map(
    (p) => ({
      label: isPaymentType(p.type) ? PAYMENT_LABELS[p.type] : p.type,
      amount: p.amount_oere,
      reference: p.reference,
    }),
  );

  return {
    receiptNumber: order.receipt_number ?? order.order_number,
    date: order.confirmed_at ?? order.created_at,
    locationName: location.data?.name ?? "PhoneSpot",
    locationAddress: location.data?.address ?? "",
    registerName: register.data?.name,
    staffName: staff.data?.name ?? "PhoneSpot",
    items: receiptItems,
    subtotal: order.subtotal,
    discountAmount: order.discount_amount,
    discountReason: order.discount_reason,
    total: order.total,
    payments,
    legacyPaymentLabel: order.payment_method ? (LEGACY_LABELS[order.payment_method] ?? order.payment_method) : undefined,
    customerName: customer.data?.name,
    hasBrugtmomsItems: receiptItems.some((r) => r.vatScheme === "brugtmoms"),
    hasRegularVatItems: receiptItems.some((r) => r.vatScheme === "regular"),
    vatTotal: order.vat_total ?? 0,
    isCreditNote: order.type === "credit_note",
    originalReceiptNumber: original.data ? (original.data.receipt_number ?? original.data.order_number) : null,
    creditReason: order.credit_reason,
  };
}

export async function renderReceiptPdf(orderId: string): Promise<Buffer | null> {
  const receipt = await loadReceiptProps(orderId);
  if (!receipt) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(PosReceiptPDF, { receipt }) as any);
}
