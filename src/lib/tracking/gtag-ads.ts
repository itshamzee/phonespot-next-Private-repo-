/**
 * Google Ads conversion tracking — fires gtag events that match
 * the manual conversions configured in the AW-17754730649 account.
 *
 * Consent gating: Consent Mode v2 default is ad_storage='denied' so
 * gtag holds the event in the queue until Cookiebot grants marketing
 * consent. We don't need to check consent ourselves.
 */

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function fire(eventName: string, params?: GtagParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}

/** Purchase completed — Google Ads "manual_event_PURCHASE" conversion. */
export function trackAdsPurchase(order: {
  orderId: string;
  orderNumber: string;
  value: number; // in DKK (not øre)
}) {
  fire("manual_event_PURCHASE", {
    transaction_id: order.orderNumber,
    value: order.value,
    currency: "DKK",
  });
}
