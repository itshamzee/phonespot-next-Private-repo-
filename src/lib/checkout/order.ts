import { createServerClient } from "@/lib/supabase/client";
import { randomBytes } from "crypto";
import type { ValidatedItem } from "./validate";
import type { DiscountApplication } from "@/lib/cart/types";

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
  shippingCost: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  stripeCheckoutSessionId: string;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  withdrawalToken: string;
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

  const { data: order, error: orderError } = await supabase.from("orders").insert({
    type: "online",
    customer_id: customerId,
    status: "pending",
    payment_method: "stripe",
    stripe_checkout_session_id: params.stripeCheckoutSessionId,
    shipping_method: params.shippingMethod,
    shipping_address: params.customer.address,
    subtotal: params.subtotal,
    discount_amount: params.discountAmount,
    shipping_cost: params.shippingCost,
    total: params.total,
    discount_code_id: params.discountCodeId,
    withdrawal_token: withdrawalToken,
  }).select("id, order_number").single();

  if (orderError || !order) throw new Error(`Failed to create order: ${orderError?.message}`);

  const orderItems = params.items.filter((vi) => vi.available).map((vi) => {
    const item = vi.item;
    if (item.type === "device") {
      return {
        order_id: order.id,
        item_type: "device" as const,
        device_id: item.deviceId,
        sku_product_id: null,
        quantity: 1,
        unit_price: vi.serverPrice,
        total_price: vi.serverPrice,
        purchase_price: null,
      };
    } else {
      return {
        order_id: order.id,
        item_type: "sku_product" as const,
        device_id: null,
        sku_product_id: item.skuProductId,
        quantity: item.quantity,
        unit_price: vi.serverPrice,
        total_price: vi.serverPrice * item.quantity,
        purchase_price: null,
      };
    }
  });

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);

  return { id: order.id, orderNumber: order.order_number, withdrawalToken };
}
