import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createServerClient } from "@/lib/supabase/client";
import { generateWarrantiesForOrder } from "@/lib/warranty/generate";
import { PosReceiptPDF } from "./receipt-pdf";

type PosCartItem =
  | { type: "device"; deviceId: string; }
  | { type: "sku_product"; skuProductId: string; quantity: number; };

type CreateSaleInput = {
  items: PosCartItem[];
  paymentMethod: "card" | "cash" | "mobilepay";
  customerId?: string;
  staffAuthId: string;
  locationId: string;
  discountAmount?: number; // øre
  notes?: string;
};

type SaleResult = {
  orderId: string;
  orderNumber: string;
  total: number;
  receiptPdf: Buffer;
};

/**
 * Create a POS sale: build order, mark devices sold, decrement SKU stock,
 * generate warranty certificates, and produce a receipt PDF.
 */
export async function createPosSale(input: CreateSaleInput): Promise<SaleResult> {
  const supabase = createServerClient();

  // 1. Resolve staff
  const { data: staff } = await supabase
    .from("staff")
    .select("id, name, role, location_id")
    .eq("auth_id", input.staffAuthId)
    .single();

  if (!staff) throw new Error("Staff member not found");

  // 2. Resolve location
  const { data: location } = await supabase
    .from("locations")
    .select("id, name, address")
    .eq("id", input.locationId)
    .single();

  if (!location) throw new Error("Location not found");

  // 3. Fetch device details
  const deviceItems = input.items.filter((i): i is Extract<PosCartItem, { type: "device" }> =>
    i.type === "device"
  );
  const skuItems = input.items.filter((i): i is Extract<PosCartItem, { type: "sku_product" }> =>
    i.type === "sku_product"
  );

  const deviceIds = deviceItems.map((i) => i.deviceId);
  let deviceMap = new Map<string, {
    id: string;
    selling_price: number;
    purchase_price: number;
    vat_scheme: string;
    grade: string;
    storage: string | null;
    color: string | null;
    barcode: string;
    display_name: string;
  }>();

  if (deviceIds.length > 0) {
    const { data: devices } = await supabase
      .from("devices")
      .select(`
        id, selling_price, purchase_price, vat_scheme, grade, storage, color, barcode,
        product_templates ( display_name )
      `)
      .in("id", deviceIds)
      .eq("status", "listed");

    if (!devices || devices.length !== deviceIds.length) {
      throw new Error("One or more devices are not available for sale");
    }

    deviceMap = new Map(
      devices.map((d) => [d.id, {
        ...d,
        display_name: (d.product_templates as unknown as { display_name: string } | null)?.display_name || "Enhed",
      }])
    );
  }

  // 4. Fetch SKU product details
  const skuProductIds = skuItems.map((i) => i.skuProductId);
  let skuMap = new Map<string, {
    id: string;
    title: string;
    selling_price: number;
    sale_price: number | null;
    category: string | null;
  }>();

  if (skuProductIds.length > 0) {
    const { data: products } = await supabase
      .from("sku_products")
      .select("id, title, selling_price, sale_price, category")
      .in("id", skuProductIds);

    if (!products || products.length !== skuProductIds.length) {
      throw new Error("One or more SKU products not found");
    }

    skuMap = new Map(products.map((p) => [p.id, p]));
  }

  // 5. Calculate totals
  let subtotal = 0;
  const orderItemRows: Array<{
    item_type: string;
    device_id: string | null;
    sku_product_id: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    purchase_price: number | null;
    vat_scheme: string | null;
  }> = [];

  for (const item of deviceItems) {
    const dev = deviceMap.get(item.deviceId)!;
    const price = dev.selling_price || 0;
    subtotal += price;
    orderItemRows.push({
      item_type: "device",
      device_id: item.deviceId,
      sku_product_id: null,
      quantity: 1,
      unit_price: price,
      total_price: price,
      purchase_price: dev.purchase_price,
      vat_scheme: dev.vat_scheme,
    });
  }

  for (const item of skuItems) {
    const sku = skuMap.get(item.skuProductId)!;
    const price = sku.sale_price && sku.sale_price < sku.selling_price
      ? sku.sale_price
      : sku.selling_price;
    const lineTotal = price * item.quantity;
    subtotal += lineTotal;
    orderItemRows.push({
      item_type: "sku_product",
      device_id: null,
      sku_product_id: item.skuProductId,
      quantity: item.quantity,
      unit_price: price,
      total_price: lineTotal,
      purchase_price: null,
      vat_scheme: "regular",
    });
  }

  const discountAmount = input.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);

  // 6. Calculate brugtmoms total
  let brugtmomsTotal = 0;
  for (const row of orderItemRows) {
    if (row.vat_scheme === "brugtmoms" && row.purchase_price !== null) {
      const margin = row.unit_price - row.purchase_price;
      brugtmomsTotal += Math.max(0, Math.round((margin * 25) / 100));
    }
  }

  // 7. Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      type: "pos",
      customer_id: input.customerId ?? null,
      location_id: input.locationId,
      is_b2b: false,
      status: "confirmed",
      payment_method: input.paymentMethod,
      shipping_method: null,
      shipping_address: null,
      subtotal,
      discount_amount: discountAmount,
      shipping_cost: 0,
      total,
      brugtmoms_total: brugtmomsTotal,
      notes: input.notes ?? null,
      confirmed_at: new Date().toISOString(),
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    throw new Error(`Failed to create POS order: ${orderError?.message}`);
  }

  // 8. Insert order items
  const itemsToInsert = orderItemRows.map((row) => ({
    order_id: order.id,
    ...row,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsToInsert);

  if (itemsError) {
    throw new Error(`Failed to insert order items: ${itemsError.message}`);
  }

  // 9. Mark devices as sold
  for (const item of deviceItems) {
    await supabase
      .from("devices")
      .update({ status: "sold", sold_at: new Date().toISOString() })
      .eq("id", item.deviceId);
  }

  // 10. Decrement SKU stock at this location
  for (const item of skuItems) {
    await supabase.rpc("decrement_sku_stock", {
      p_product_id: item.skuProductId,
      p_quantity: item.quantity,
    });
  }

  // 11. Generate warranty certificates for device items
  if (deviceIds.length > 0) {
    try {
      await generateWarrantiesForOrder(order.id);
    } catch (err) {
      console.error("[pos] failed to generate warranties:", err);
    }
  }

  // 12. Log activity
  await supabase.from("activity_log").insert({
    actor_id: staff.id,
    actor_type: "staff",
    action: "pos_sale",
    entity_type: "order",
    entity_id: order.id,
    details: {
      payment_method: input.paymentMethod,
      item_count: input.items.length,
      total,
      location_id: input.locationId,
    },
  });

  // 13. Build receipt items
  const hasBrugtmomsItems = orderItemRows.some((r) => r.vat_scheme === "brugtmoms");
  const hasRegularVatItems = orderItemRows.some((r) => r.vat_scheme === "regular");
  const regularVatTotal = orderItemRows
    .filter((r) => r.vat_scheme === "regular")
    .reduce((sum, r) => sum + r.total_price, 0);

  const receiptItems = orderItemRows.map((row) => {
    if (row.device_id) {
      const dev = deviceMap.get(row.device_id)!;
      return {
        name: dev.display_name,
        grade: dev.grade,
        quantity: 1,
        unitPrice: row.unit_price,
        lineTotal: row.total_price,
        vatScheme: row.vat_scheme as "brugtmoms" | "regular",
      };
    } else {
      const sku = skuMap.get(row.sku_product_id!)!;
      return {
        name: sku.title,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        lineTotal: row.total_price,
        vatScheme: "regular" as const,
      };
    }
  });

  // 14. Fetch customer name if available
  let customerName: string | undefined;
  if (input.customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("id", input.customerId)
      .single();
    customerName = customer?.name;
  }

  // 15. Generate receipt PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receiptPdf = await renderToBuffer(
    createElement(PosReceiptPDF, {
      receipt: {
        receiptNumber: order.order_number,
        date: new Date().toISOString(),
        locationName: location.name,
        locationAddress: location.address ?? "",
        staffName: staff.name,
        items: receiptItems,
        subtotal,
        discountAmount,
        total,
        paymentMethod: input.paymentMethod,
        customerName,
        hasBrugtmomsItems,
        hasRegularVatItems,
        regularVatTotal,
      },
    }) as any
  );

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    total,
    receiptPdf,
  };
}
