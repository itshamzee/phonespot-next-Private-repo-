import { createServerClient } from "@/lib/supabase/client";
import { readReservationOwner } from "@/lib/cart/reservation-owner";
import { randomBytes } from "crypto";
import type { ValidatedItem } from "./validate";
import { cartItemKey, type DiscountApplication } from "@/lib/cart/types";

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

export interface CreateOrderParams {
  items: ValidatedItem[];
  customer: CustomerInfo;
  discount: DiscountApplication | null;
  discountCodeId: string | null;
  shippingMethod: string;
  /** The chosen parcel shop, when the method needs one. */
  pickupPoint?: Record<string, unknown> | null;
  shippingCost: number;
  subtotal: number;
  discountAmount: number;
  /** Lagersalg 3 for 2-rabat i øre. */
  bundleDiscountAmount: number;
  /** Pr. kurvlinje (cartItemKey): rabat og antal gratis enheder fra 3 for 2. */
  bundleByKey: Record<string, { discount_oere: number; freeUnits: number }>;
  total: number;
  stripeCheckoutSessionId: string;
  /** Ordren indeholder Foxway-enheder og skal bestilles hos leverandøren. */
  foxwayPending: boolean;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  withdrawalToken: string;
}

type OrderItemRow = Record<string, unknown> & {
  item_type: "device" | "sku_product";
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number;
};
type BundleByKey = Record<string, { discount_oere: number; freeUnits: number }>;

/**
 * Bygger ordrelinjerne. Gratis enheder fra 3 for 2 bogfoeres som egen linje,
 * saa en delvis returnering refunderer det rigtige beloeb.
 */
export function toOrderItemRows(orderId: string, items: ValidatedItem[], bundleByKey: BundleByKey): OrderItemRow[] {
  return items.filter((vi) => vi.available).flatMap((vi): OrderItemRow[] => {
    const item = vi.item;
    if (item.type === "device") {
      const upgradeSum = item.upgrades?.reduce((n, u) => n + u.price, 0) ?? 0;
      return [{
        order_id: orderId,
        item_type: "device" as const,
        device_id: item.deviceId,
        reservation_id: vi.reservationId ?? null,
        sku_product_id: null,
        quantity: 1,
        unit_price: vi.serverPrice + upgradeSum,
        total_price: vi.serverPrice + upgradeSum,
        discount_amount: 0,
        purchase_price: null,
        upgrade_details: item.upgrades?.length
          ? item.upgrades.map((u) => ({
              option_id: u.optionId,
              kind: u.kind,
              label: u.label,
              price_oere: u.price,
            }))
          : null,
      }];
    }
    const bundle = bundleByKey[cartItemKey(item)];
    const freeUnits = Math.min(bundle?.freeUnits ?? 0, item.quantity);
    const row = (quantity: number, discount: number) => ({
      order_id: orderId,
      item_type: "sku_product" as const,
      device_id: null,
      sku_product_id: item.skuProductId,
      quantity,
      unit_price: vi.serverPrice,
      total_price: vi.serverPrice * quantity,
      discount_amount: discount,
      purchase_price: null,
      upgrade_details: null,
    });
    if (freeUnits <= 0) return [row(item.quantity, 0)];
    const freeRow = row(freeUnits, vi.serverPrice * freeUnits);
    if (freeUnits === item.quantity) return [freeRow];
    return [row(item.quantity - freeUnits, 0), freeRow];
  });
}

export async function createOrder(params: CreateOrderParams): Promise<CreatedOrder> {
  const supabase = createServerClient();
  const withdrawalToken = randomBytes(32).toString("hex");

  // Find or create customer
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", params.customer.email)
    .single();

  let customerId: string;
  if (existingCustomer) {
    customerId = existingCustomer.id;
    await supabase.from("customers").update({
      name: params.customer.name,
      phone: params.customer.phone,
      addresses: [params.customer.address],
    }).eq("id", customerId);
  } else {
    const { data: newCustomer, error } = await supabase.from("customers").insert({
      email: params.customer.email,
      name: params.customer.name,
      phone: params.customer.phone,
      addresses: [params.customer.address],
    }).select("id").single();
    if (error || !newCustomer) throw new Error("Failed to create customer");
    customerId = newCustomer.id;
  }

  // Generate next order number (S-XXXX)
  const { data: lastOrder } = await supabase
    .from("orders")
    .select("order_number")
    .like("order_number", "S-%")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const lastNum = lastOrder?.order_number
    ? parseInt(lastOrder.order_number.replace("S-", ""), 10)
    : 1000;
  const orderNumber = `S-${lastNum + 1}`;

  const { data: order, error: orderError } = await supabase.from("orders").insert({
    order_number: orderNumber,
    type: "online",
    customer_id: customerId,
    status: "pending",
    payment_method: "stripe",
    stripe_checkout_session_id: params.stripeCheckoutSessionId,
    shipping_method: params.shippingMethod,
    pickup_point: params.pickupPoint ?? null,
    shipping_address: params.customer.address,
    subtotal: params.subtotal,
    discount_amount: params.discountAmount,
    bundle_discount_amount: params.bundleDiscountAmount,
    shipping_cost: params.shippingCost,
    total: params.total,
    discount_code_id: params.discountCodeId,
    withdrawal_token: withdrawalToken,
    foxway_status: params.foxwayPending ? "pending" : null,
  }).select("id, order_number").single();

  if (orderError || !order) throw new Error(`Failed to create order: ${orderError?.message}`);

  const orderItems = toOrderItemRows(order.id, params.items, params.bundleByKey);

  const { error: itemsError } = await supabase.rpc("attach_checkout_order_items", {
    p_order_id: order.id,
    p_owner_hash: params.items.some(vi => vi.reservationId) ? await readReservationOwner() : null,
    p_items: orderItems,
  });
  if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);

  return { id: order.id, orderNumber: order.order_number, withdrawalToken };
}
