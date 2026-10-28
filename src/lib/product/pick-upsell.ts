import type { PublicAccessory } from "@/lib/product/public-accessory";

/**
 * Vælger op til `limit` varer til mersalg: skiftevis cover og beskyttelsesglas,
 * så kunden ser begge typer, og kun varer der kan købes nu. Rækkefølgen inden
 * for en kategori er: på lager i butik, på lager online, kan bestilles.
 * Ingen serverafhængigheder, så kurvskuffen kan bruge den i browseren.
 */
export function pickUpsell(items: PublicAccessory[], limit = 3): PublicAccessory[] {
  const rank = (a: PublicAccessory) =>
    (a.store_stock ?? 0) > 0 ? 0 : a.availability === "in_stock" ? 1 : 2;
  const buyable = items
    .filter(a => a.availability === "in_stock" || a.availability === "orderable")
    .sort((a, b) => rank(a) - rank(b));
  const queues = ["covers", "beskyttelsesglas"].map(category => buyable.filter(a => a.category === category));
  const picked: PublicAccessory[] = [];
  while (picked.length < limit && queues.some(q => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < limit) picked.push(next);
    }
  }
  return picked;
}
