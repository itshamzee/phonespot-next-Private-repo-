/**
 * Meta Pixel (fbq) helper — fires events only when the pixel is loaded
 * and the user has given marketing consent via Cookiebot.
 *
 * The view/cart/checkout helpers also send the matching GA4 ecommerce event
 * (view_item, add_to_cart, begin_checkout). GA4 had no funnel events after the
 * September relaunch, so checkout drop-off could not be measured.
 */

import { purchaseEventId } from "./purchase-event-id";

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

const FBQ_WAIT_MS = 10_000;
const FBQ_POLL_MS = 100;

/**
 * Kør `fn`, så snart window.fbq findes. Pixel-snippet'et indlæses med
 * next/script strategy="afterInteractive", som indsættes i Script-komponentens
 * useEffect. Den kører EFTER sidens egne useEffects ved en hård sideindlæsning
 * (fx når Stripe sender kunden tilbage til /ordre/bekraeftelse), så et direkte
 * kald fandt ingen fbq og blev tabt. Vi venter derfor op til 10 sek.
 */
export function whenFbqReady(fn: (fbq: (...args: unknown[]) => void) => void): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") {
    fn(window.fbq);
    return;
  }
  const started = Date.now();
  const timer = window.setInterval(() => {
    if (typeof window.fbq === "function") {
      window.clearInterval(timer);
      fn(window.fbq);
    } else if (Date.now() - started > FBQ_WAIT_MS) {
      window.clearInterval(timer);
    }
  }, FBQ_POLL_MS);
}

function fire(eventName: string, params?: FbqParams, eventId?: string) {
  whenFbqReady((fbq) => {
    if (params && eventId) fbq("track", eventName, params, { eventID: eventId });
    else if (params) fbq("track", eventName, params);
    else fbq("track", eventName);
  });
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
  price: number; // in DKK, per stk.
  quantity?: number;
}) {
  const quantity = product.quantity ?? 1;
  const value = product.price * quantity;
  fire("AddToCart", {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    value,
    currency: "DKK",
  });
  ga4("add_to_cart", {
    currency: "DKK",
    value,
    items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity }],
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

const PURCHASE_SENT_PREFIX = "ps-meta-purchase:";

/**
 * Purchase completed. Bærer event_id purchase_<order.id> (samme som
 * server-hændelsen fra Stripe-webhooken), så Meta deduplikerer. Sendes højst
 * én gang pr. ordre pr. session, så genindlæsning ikke tæller dobbelt.
 */
export function trackPurchase(order: {
  orderId: string;
  value: number; // total in DKK
  contentIds: string[];
  numItems?: number;
}) {
  try {
    const key = PURCHASE_SENT_PREFIX + order.orderId;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Uden storage deduplikerer Meta stadig på event_id.
  }
  const params: FbqParams = {
    content_ids: order.contentIds,
    content_type: "product",
    value: order.value,
    currency: "DKK",
  };
  if (order.numItems !== undefined) params.num_items = order.numItems;
  fire("Purchase", params, purchaseEventId(order.orderId));
}
