import type Stripe from "stripe";
import { stripe } from "./client";
import type { ValidatedItem } from "@/lib/checkout/validate";
import type { DiscountApplication, CartItem } from "@/lib/cart/types";
import type { CustomerInfo } from "@/lib/checkout/order";

export interface CreateCheckoutSessionParams {
  orderId: string;
  orderNumber: string;
  items: ValidatedItem[];
  customer: CustomerInfo;
  discount: DiscountApplication | null;
  discountCodeId: string | null;
  shippingMethod: string;
  shippingCost: number;
  subtotal: number;
  discountAmount: number;
  total: number;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

function buildLineItems(
  items: ValidatedItem[],
  shippingCost: number,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
    .filter((vi) => vi.available)
    .map((vi) => {
      const item: CartItem = vi.item;
      const name =
        item.type === "device"
          ? `${item.title} — Grade ${item.grade} (${item.storage}, ${item.color})`
          : item.title;
      const quantity = item.type === "device" ? 1 : item.quantity;
      return {
        price_data: {
          currency: "dkk",
          product_data: {
            name,
            images: item.image ? [item.image] : [],
            metadata:
              item.type === "device"
                ? { device_id: item.deviceId, item_type: "device" }
                : { sku_product_id: item.skuProductId, item_type: "sku_product" },
          },
          unit_amount: vi.serverPrice,
        },
        quantity,
      };
    });

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "dkk",
        product_data: { name: "Fragt" },
        unit_amount: shippingCost,
      },
      quantity: 1,
    });
  }

  return lineItems;
}

async function buildDiscountIds(
  discount: DiscountApplication | null,
): Promise<string[]> {
  if (!discount) return [];
  if (discount.type === "free_shipping") return [];

  // Create a one-time Stripe coupon for this order
  let amount_off: number | undefined;
  let percent_off: number | undefined;

  if (discount.type === "fixed") {
    amount_off = discount.discountAmount;
  } else if (discount.type === "percentage") {
    percent_off = discount.value;
  }

  const coupon = await stripe.coupons.create({
    ...(amount_off !== undefined ? { amount_off, currency: "dkk" } : {}),
    ...(percent_off !== undefined ? { percent_off } : {}),
    duration: "once",
    name: `Rabatkode: ${discount.code}`,
    metadata: { discount_code: discount.code },
  });

  return [coupon.id];
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<CheckoutSessionResult> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

  const lineItems = buildLineItems(params.items, params.shippingCost);
  const discountIds = await buildDiscountIds(params.discount);

  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "mobilepay"],
    line_items: lineItems,
    ...(discountIds.length > 0
      ? { discounts: discountIds.map((id) => ({ coupon: id })) }
      : {}),
    customer_email: params.customer.email,
    locale: "da",
    currency: "dkk",
    expires_at: expiresAt,
    success_url: `${baseUrl}/ordre/bekraeftelse?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/kasse?cancelled=true`,
    metadata: {
      order_id: params.orderId,
      order_number: params.orderNumber,
    },
    payment_intent_data: {
      metadata: {
        order_id: params.orderId,
        order_number: params.orderNumber,
      },
    },
    shipping_address_collection: {
      allowed_countries: ["DK"],
    },
    phone_number_collection: { enabled: true },
  });

  if (!session.url) {
    throw new Error("Stripe checkout session has no URL");
  }

  return { sessionId: session.id, url: session.url };
}
