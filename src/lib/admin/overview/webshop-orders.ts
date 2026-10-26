import { calendarDaysSince } from "./format";

/**
 * Nye webshop-ordrer på Overblik for Webshop: betalte online-ordrer, der endnu ikke er
 * pakket, sendt eller afhentet. Ren formning og tekster; selve forespørgslen ligger i load.ts.
 */

/** Ordrer ældre end dette er forsinkede. */
export const OVERDUE_AFTER_DAYS = 2;

export type WebshopOrderRaw = {
  id: string;
  order_number: string | null;
  shipping_method: string | null;
  total: number | null;
  created_at: string;
  confirmed_at: string | null;
  customer?: { name: string | null } | { name: string | null }[] | null;
  order_items?: { quantity: number | null }[] | null;
};

export type WebshopOrder = {
  id: string;
  number: string;
  customer: string;
  items: number;
  total: number;
  shipping: string;
  pickup: boolean;
  age: string;
  days: number;
  overdue: boolean;
};

export type WebshopOrders = { items: WebshopOrder[]; total: number };

export const EMPTY_WEBSHOP_ORDERS: WebshopOrders = { items: [], total: 0 };

const SHIPPING_LABELS: Record<string, string> = {
  pickup_slagelse: "Hent i Slagelse",
  pickup_vejle: "Hent i Vejle",
  postnord: "PostNord",
  dao: "DAO",
  pakkeshop: "Pakkeshop",
};

export function isPickup(method: string | null | undefined): boolean {
  return !!method && method.startsWith("pickup");
}

export function shippingLabel(method: string | null | undefined): string {
  if (!method) return "Ukendt levering";
  return SHIPPING_LABELS[method] ?? method;
}

/** 0 -> "i dag", 1 -> "i går", n -> "n dage". */
export function ageLabel(days: number): string {
  if (days <= 0) return "i dag";
  if (days === 1) return "i går";
  return `${days} dage`;
}

export function isOverdue(days: number): boolean {
  return days > OVERDUE_AFTER_DAYS;
}

export function shapeWebshopOrders(rows: WebshopOrderRaw[], total: number, now: Date): WebshopOrders {
  const items = rows.map<WebshopOrder>((r) => {
    const customer = Array.isArray(r.customer) ? r.customer[0] : r.customer;
    const days = calendarDaysSince(r.confirmed_at ?? r.created_at, now);
    return {
      id: r.id,
      // Rene tal får "#"; numre med bogstaver (S-1210) vises som de er.
      number: r.order_number ? (/^\d+$/.test(r.order_number) ? `#${r.order_number}` : r.order_number) : "Ordre",
      customer: customer?.name?.trim() || "Ukendt kunde",
      items: (r.order_items ?? []).reduce((sum, i) => sum + (i.quantity ?? 1), 0),
      total: r.total ?? 0,
      shipping: shippingLabel(r.shipping_method),
      pickup: isPickup(r.shipping_method),
      age: ageLabel(days),
      days,
      overdue: isOverdue(days),
    };
  });
  return { items, total: Math.max(total, items.length) };
}
