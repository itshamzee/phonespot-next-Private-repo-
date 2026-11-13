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

const ADS_PURCHASE_SENT_PREFIX = "ps-ads-purchase:";

/**
 * Højst én gang pr. ordre i denne browser. Kvitteringssiden genindlæses og
 * genåbnes fra ordremailen, og hver visning talte som et nyt køb (21
 * konverteringer for 15 ordrer). localStorage, ikke sessionStorage, fordi
 * genåbning fra mailen er en ny session.
 */
function alreadySent(orderNumber: string): boolean {
  const key = ADS_PURCHASE_SENT_PREFIX + orderNumber;
  try {
    if (localStorage.getItem(key)) return true;
    localStorage.setItem(key, "1");
  } catch {
    // Uden storage: Ads deduplikerer selv på transaction_id.
  }
  return false;
}

/** Purchase completed — Google Ads "manual_event_PURCHASE" conversion. */
export function trackAdsPurchase(order: {
  orderId: string;
  orderNumber: string;
  value: number; // in DKK (not øre)
}) {
  // Markér kun som sendt, når gtag findes, ellers mister vi købet helt.
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (alreadySent(order.orderNumber)) return;
  fire("manual_event_PURCHASE", {
    transaction_id: order.orderNumber,
    value: order.value,
    currency: "DKK",
  });
}
