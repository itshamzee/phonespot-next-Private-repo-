import type { ScopeSlug } from "@/lib/auth/store-scope";
import type { OverviewItem, OverviewOrder } from "./kpi";

/**
 * Fælles salgsregler for Overblik, Økonomi og Statistik (rene funktioner, beløb i øre):
 *  1. Click & collect: en webshop-ordre, der hentes i en butik, tæller hos butikken.
 *  2. Reparationer betalt online på forhånd (Stripe) er et salg den dag, de blev betalt.
 *  3. Reservedele brugt på en sag er kostpris på sagens reparationslinje.
 */

/** Afhentningsmetoder pr. butik: Shipmondo-metoderne og de ældre pickup_*-værdier. */
export const PICKUP_METHODS: Record<"vejle" | "slagelse", readonly string[]> = {
  vejle: ["click_collect_vejle", "pickup_vejle"],
  slagelse: ["click_collect_slagelse", "pickup_slagelse"],
};

export function pickupStoreSlug(shippingMethod: string | null | undefined): "vejle" | "slagelse" | null {
  if (!shippingMethod) return null;
  if (PICKUP_METHODS.vejle.includes(shippingMethod)) return "vejle";
  if (PICKUP_METHODS.slagelse.includes(shippingMethod)) return "slagelse";
  return null;
}

/** Butikken et salg hører til: afhentningsbutikken for online-ordrer, ellers ordrens lokation (uden lokation: webshop). */
export function storeSlugForOrder(
  o: { type?: string; location_id?: string | null; shipping_method?: string | null },
  slugOf: (id: string | null | undefined) => ScopeSlug | null,
): ScopeSlug {
  if (o.type === "online") {
    const pickup = pickupStoreSlug(o.shipping_method);
    if (pickup) return pickup;
  }
  return slugOf(o.location_id) ?? "webshop";
}

export type PrepaidTicket = { id: string; paid_at: string; location_id: string | null; total_price_dkk: number | null };

/**
 * Én syntetisk ordre pr. forudbetalt sag. Beløbet (kr. inkl. moms) ligger i
 * booking_details.total_price_dkk; sager uden beløb tælles i `withoutAmount`.
 * Reparation bærer altid 25 % moms, så momsen er en femtedel af beløbet.
 */
export function prepaidRepairOrders(tickets: PrepaidTicket[]): { orders: OverviewOrder[]; withoutAmount: number } {
  const orders: OverviewOrder[] = [];
  let withoutAmount = 0;
  for (const t of tickets) {
    const kr = t.total_price_dkk;
    if (kr == null || !Number.isFinite(kr)) {
      withoutAmount += 1;
      continue;
    }
    const total = Math.round(kr * 100);
    const vat = Math.round(total / 5);
    orders.push({
      type: "repair_prepaid",
      total,
      vat_total: vat,
      brugtmoms_total: 0,
      location_id: t.location_id,
      confirmed_at: t.paid_at,
      order_items: [
        {
          item_type: "repair",
          quantity: 1,
          total_price: total,
          vat_amount: vat,
          vat_scheme: "regular",
          repair_ticket_id: t.id,
          purchase_price: null,
        },
      ],
    });
  }
  return { orders, withoutAmount };
}

const isDepositLine = (it: OverviewItem) => it.item_type === "deposit" || it.item_type === "deposit_applied";

/**
 * Lægger sagens reservedelskost på dens første linje uden kostpris. Kostprisen
 * deles med |mængde|, så kostpris * mængde får kreditnotaens fortegn. Øvrige
 * linjer for samme sag får 0, så kosten kun tælles én gang. Depositumlinjer
 * springes over (de er uden for profit), og linjer med kostpris røres ikke.
 * Returnerer kopier.
 */
export function applyRepairCosts(orders: OverviewOrder[], costByTicket: Map<string, number>): OverviewOrder[] {
  return orders.map((o) => {
    if (!o.order_items?.length) return o;
    const done = new Set<string>();
    const order_items = o.order_items.map((it) => {
      const ticket = it.repair_ticket_id;
      if (!ticket || it.purchase_price != null || isDepositLine(it)) return it;
      const cost = costByTicket.get(ticket);
      if (cost == null) return it;
      if (done.has(ticket)) return { ...it, purchase_price: 0 };
      done.add(ticket);
      return { ...it, purchase_price: cost / (Math.abs(it.quantity ?? 0) || 1) };
    });
    return { ...o, order_items };
  });
}
