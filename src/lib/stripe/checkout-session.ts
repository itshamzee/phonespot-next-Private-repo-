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
  /** Total Spot bundle discount (3-for-2 + Lens combo) in øre. */
  bundleDiscountAmount: number;
  /** Total Sommer Bundle savings (retail value of 0-priced bundle freebies) in øre. */
  bundleSavingsAmount?: number;
  total: number;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

/**
 * Stripe rejects product_data.images entries that are not absolute URLs
 * with the error "Not a valid URL". Cart items can carry relative paths
 * (e.g. "/trusmi/02.webp") because they were added from a Next.js public
 * asset, so we must rewrite them to absolute https URLs before sending
 * to the Stripe API. Anything that doesn't look like a valid http(s)
 * URL is dropped to keep checkout from breaking on a single bad image.
 */
function toStripeImageUrls(image: string | null | undefined, baseUrl: string): string[] {
  if (!image) return [];
  const trimmed = image.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return [trimmed];
  }
  if (trimmed.startsWith("/")) {
    return [`${baseUrl}${trimmed}`];
  }
  // Bare filename or unrecognised prefix — Stripe will reject; skip it.
  return [];
}

function buildLineItems(
  items: ValidatedItem[],
  shippingCost: number,
  baseUrl: string,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
    .filter((vi) => vi.available)
    .map((vi) => {
      const item: CartItem = vi.item;
      const isFreebie = item.type === "sku_product" && !!item.bundleAttached;
      const isBatteryUpgrade = item.type === "sku_product" && item.kind === "battery-upgrade";

      let name: string;
      if (item.type === "device") {
        name = `${item.title} — Grade ${item.grade} (${item.storage}, ${item.color})`;
      } else if (isFreebie) {
        name = `${item.title} — Sommer Bundle (gratis)`;
      } else {
        name = item.title;
      }

      const quantity = item.type === "device" ? 1 : item.quantity;
      const metadata: Record<string, string> = item.type === "device"
        ? { device_id: item.deviceId, item_type: "device", sku_product_id: "" }
        : { sku_product_id: item.skuProductId, item_type: "sku_product", device_id: "" };

      if (isFreebie && item.type === "sku_product" && item.bundleAttached) {
        metadata.bundle_campaign_id = item.bundleAttached.campaignId;
        metadata.parent_item_key = item.bundleAttached.parentItemKey;
      }
      if (isBatteryUpgrade && item.type === "sku_product") {
        metadata.kind = "battery-upgrade";
        if (item.upgradeParentItemKey) metadata.parent_item_key = item.upgradeParentItemKey;
      }

      return {
        price_data: {
          currency: "dkk",
          product_data: {
            name,
            images: toStripeImageUrls(item.image, baseUrl),
            metadata,
          },
          unit_amount: vi.serverPrice, // freebies arrive with serverPrice = 0
        },
        quantity,
      };
    });

  if (shippingCost > 0) {
    lineItems.push({
      price_data: { currency: "dkk", product_data: { name: "Fragt" }, unit_amount: shippingCost },
      quantity: 1,
    });
  }

  return lineItems;
}

async function buildDiscountCoupons(
  discount: DiscountApplication | null,
  bundleDiscountAmount: number,
): Promise<string[]> {
  const couponIds: string[] = [];

  // Promo-code coupon
  if (discount && discount.type !== "free_shipping") {
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
    couponIds.push(coupon.id);
  }

  // Spot bundle-discount coupon (3-for-2 + Lens combo)
  // Only create when there is an actual bundle discount to apply.
  if (bundleDiscountAmount > 0) {
    const bundleCoupon = await stripe.coupons.create({
      amount_off: bundleDiscountAmount,
      currency: "dkk",
      duration: "once",
      name: "Spot bundle rabat",
      metadata: { bundle_discount: "true" },
    });
    couponIds.push(bundleCoupon.id);
  }

  return couponIds;
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<CheckoutSessionResult> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

  const lineItems = buildLineItems(params.items, params.shippingCost, baseUrl);
  const discountIds = await buildDiscountCoupons(params.discount, params.bundleDiscountAmount);

  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "mobilepay", "klarna"],
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
      bundle_savings_oere: String(params.bundleSavingsAmount ?? 0),
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
