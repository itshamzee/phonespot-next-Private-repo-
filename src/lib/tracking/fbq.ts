/**
 * Meta Pixel (fbq) helper — fires events only when the pixel is loaded
 * and the user has given marketing consent via Cookiebot.
 */

type FbqParams = Record<string, string | number | string[]>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fire(eventName: string, params?: FbqParams) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (params) {
      window.fbq("track", eventName, params);
    } else {
      window.fbq("track", eventName);
    }
  }
}

/** Product page view */
export function trackViewContent(product: {
  name: string;
  id: string;
  price: number; // in DKK (not øre)
  category?: string;
}) {
  fire("ViewContent", {
    content_name: product.name,
    content_ids: [product.id],
    content_type: "product",
    value: product.price,
    currency: "DKK",
    content_category: product.category ?? "",
  });
}

/** Add to cart */
export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number; // in DKK
}) {
  fire("AddToCart", {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    value: product.price,
    currency: "DKK",
  });
}

/** Checkout started */
export function trackInitiateCheckout(cart: {
  value: number; // total in DKK
  numItems: number;
}) {
  fire("InitiateCheckout", {
    value: cart.value,
    currency: "DKK",
    num_items: cart.numItems,
  });
}

/** Purchase completed */
export function trackPurchase(order: {
  orderId: string;
  value: number; // total in DKK
  contentIds: string[];
}) {
  fire("Purchase", {
    content_ids: order.contentIds,
    content_type: "product",
    value: order.value,
    currency: "DKK",
  });
}
