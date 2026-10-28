/**
 * Meta Pixel (fbq) helper — fires events only when the pixel is loaded
 * and the user has given marketing consent via Cookiebot.
 *
 * The view/cart/checkout helpers also send the matching GA4 ecommerce event
 * (view_item, add_to_cart, begin_checkout). GA4 had no funnel events after the
 * September relaunch, so checkout drop-off could not be measured.
 */

type FbqParams = Record<string, string | number | string[]>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function ga4(eventName: string, params: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
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
  ga4("view_item", {
    currency: "DKK",
    value: product.price,
    items: [{ item_id: product.id, item_name: product.name, item_category: product.category, price: product.price }],
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
  ga4("add_to_cart", {
    currency: "DKK",
    value: product.price,
    items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: 1 }],
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
  ga4("begin_checkout", { currency: "DKK", value: cart.value });
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
