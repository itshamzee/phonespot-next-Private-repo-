/**
 * Fælles event_id for Meta Purchase. Browserens fbq('track','Purchase') og
 * server-hændelsen fra Stripe-webhooken (Conversions API) bruger samme id,
 * så Meta tæller købet én gang, selv når begge når frem.
 */
export function purchaseEventId(orderId: string): string {
  return `purchase_${orderId}`;
}
