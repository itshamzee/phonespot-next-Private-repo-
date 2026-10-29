import type Stripe from "stripe";
import { stripe } from "./client";
import { THREE_FOR_TWO_LABEL } from "@/lib/lagersalg/three-for-two";
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
  /** Lagersalg 3 for 2-rabat i øre (beregnet på serveren). */
  bundleDiscountAmount: number;
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
    .flatMap((vi) => {
      const item: CartItem = vi.item;

      const name =
        item.type === "device"
          ? `${item.title} — Grade ${item.grade} (${item.storage}, ${item.color})`
          : item.title;

      const quantity = item.type === "device" ? 1 : item.quantity;
      const metadata: Record<string, string> = item.type === "device"
        ? { device_id: item.deviceId, item_type: "device", sku_product_id: "" }
        : { sku_product_id: item.skuProductId, item_type: "sku_product", device_id: "" };

      const base: Stripe.Checkout.SessionCreateParams.LineItem = {
        price_data: {
          currency: "dkk",
          product_data: {
            name,
            images: toStripeImageUrls(item.image, baseUrl),
            metadata,
          },
          unit_amount: vi.serverPrice, // server-validated price in øre
        },
        quantity,
      };

      if (item.type === "device" && item.upgrades?.length) {
        const upgradeLines = item.upgrades.map((u) => ({
          price_data: {
            currency: "dkk" as const,
            product_data: {
              name: `${item.title}: ${u.label}`,
              metadata: { item_type: "upgrade", upgrade_option_id: u.optionId, device_id: item.deviceId },
            },
            unit_amount: u.price,
          },
          quantity: 1,
        }));
        return [base, ...upgradeLines];
      }
      return [base];
    });

  if (shippingCost > 0) {
    lineItems.push({
      price_data: { currency: "dkk", product_data: { name: "Fragt" }, unit_amount: shippingCost },
      quantity: 1,
    });
  }

  return lineItems;
}

/**
 * Stripe Checkout tager kun én kupon pr. session, så rabatkode og 3 for 2
 * lægges sammen i ét beløb. Procentkoder er allerede omregnet til beløb af
 * ruten (`discountAmount`), så `percent_off` bruges aldrig.
 */
export async function buildDiscountCoupons(
  discount: DiscountApplication | null,
  discountAmount: number,
  bundleDiscountAmount: number,
): Promise<string[]> {
  const codeAmount = discount && discount.type !== "free_shipping" ? discountAmount : 0;
  const amountOff = codeAmount + bundleDiscountAmount;
  if (amountOff <= 0) return [];

  const hasCode = codeAmount > 0 && !!discount;
  const hasBundle = bundleDiscountAmount > 0;
  const bundleLabel = THREE_FOR_TWO_LABEL;
  const name = hasCode && hasBundle
    ? `Rabatkode: ${discount!.code} + ${bundleLabel}`
    : hasCode
      ? `Rabatkode: ${discount!.code}`
      : bundleLabel;

  const coupon = await stripe.coupons.create({
    amount_off: amountOff,
    currency: "dkk",
    duration: "once",
    name,
    metadata: {
      ...(hasCode ? { discount_code: discount!.code } : {}),
      ...(hasBundle ? { bundle_discount: "lagersalg_3for2" } : {}),
    },
  });
  return [coupon.id];
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<CheckoutSessionResult> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";

  const lineItems = buildLineItems(params.items, params.shippingCost, baseUrl);
  const discountIds = await buildDiscountCoupons(params.discount, params.discountAmount, params.bundleDiscountAmount);

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
    },
    payment_intent_data: {
      metadata: {
        order_id: params.orderId,
        order_number: params.orderNumber,
      },
    },
    // No shipping_address_collection / phone_number_collection: /kasse has
    // already collected both (and pickup orders need no address at all), and
    // nothing reads Stripe's copy. Asking twice cost completed payments.
  });

  if (!session.url) {
    throw new Error("Stripe checkout session has no URL");
  }

  return { sessionId: session.id, url: session.url };
}
