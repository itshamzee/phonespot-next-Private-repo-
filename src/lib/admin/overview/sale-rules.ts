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
/** Reparationslinjer: "repair_service" fra kassen (pos_create_sale), "repair" fra prepaidRepairOrders. */
const REPAIR_ITEM_TYPES = new Set(["repair_service", "repair"]);

/**
 * Lægger sagens reservedelskost på én linje pr. sag og ordre: blandt sagens
 * linjer uden kostpris (depositumlinjer undtaget, de er uden for profit) vælges
 * reparationslinjen, ellers den første. Kostprisen deles med |mængde| og
 * afrundes til hele øre, så kostpris * mængde får kreditnotaens fortegn. Øvrige
 * kandidatlinjer for sagen får 0, så kosten kun tælles én gang. Har den valgte
 * linje mængde 0, lægges kosten ikke på. Linjer med kostpris røres ikke.
 *
 * Blandt salgsordrerne (alt andet end kreditnotaer) bærer kun den første ordre
 * med sagen kosten; står sagen på flere salg (fx delbetaling), får de senere 0.
 * Kreditnotaer tilbagefører stadig kosten, som salget bar, og frigiver sagen, så
 * næste salg (salg, kreditnota, gensalg eller forudbetaling) bærer kosten igen.
 *
 * Ordrerne behandles i den rækkefølge, de gives (sorteres ikke her). loadOrdersWithMeta
 * giver dem efter confirmed_at med de forudbetalte sager (repair_prepaid) til sidst.
 * Returnerer kopier.
 */
export function applyRepairCosts(orders: OverviewOrder[], costByTicket: Map<string, number>): OverviewOrder[] {
  /** Sager, hvis kost allerede ligger på et salg. */
  const costedOnSale = new Set<string>();
  return orders.map((o) => {
    if (!o.order_items?.length) return o;
    const isSale = o.type !== "credit_note";
    const isCandidate = (it: OverviewItem) =>
      Boolean(it.repair_ticket_id) && it.purchase_price == null && !isDepositLine(it) && costByTicket.has(it.repair_ticket_id!);

    // Vælg én linje pr. sag: reparationslinjen foretrækkes, ellers den første kandidat.
    const chosen = new Map<string, number>();
    o.order_items.forEach((it, i) => {
      if (!isCandidate(it)) return;
      const ticket = it.repair_ticket_id!;
      const current = chosen.get(ticket);
      if (current === undefined) chosen.set(ticket, i);
      else if (!REPAIR_ITEM_TYPES.has(o.order_items![current].item_type ?? "") && REPAIR_ITEM_TYPES.has(it.item_type ?? "")) {
        chosen.set(ticket, i);
      }
    });
    if (chosen.size === 0) return o;

    // Sager, hvis kost et tidligere salg allerede bærer: alle deres linjer i dette salg får 0.
    const alreadyCosted = new Set(isSale ? [...chosen.keys()].filter((t) => costedOnSale.has(t)) : []);

    const order_items = o.order_items.map((it, i) => {
      if (!isCandidate(it)) return it;
      const ticket = it.repair_ticket_id!;
      if (alreadyCosted.has(ticket) || chosen.get(ticket) !== i) return { ...it, purchase_price: 0 };
      const qty = Math.abs(it.quantity ?? 0);
      if (qty === 0) return it;
      // Et salg binder kosten til sagen; en kreditnota tilbagefører den og frigiver sagen,
      // så et senere salg (gensalg ved kassen eller betaling online) bærer kosten igen.
      if (isSale) costedOnSale.add(ticket);
      else costedOnSale.delete(ticket);
      return { ...it, purchase_price: Math.round(costByTicket.get(ticket)! / qty) };
    });
    return { ...o, order_items };
  });
}
