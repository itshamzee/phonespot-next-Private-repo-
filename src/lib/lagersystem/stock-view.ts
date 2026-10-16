import type { LagersystemClient } from "./client";

export type StockRow = { shared_sku: string; name: string | null; qty: number; updated_at: string | null };
export type StockView = { as_of: string; total: number; rows: StockRow[] };

/** API v1 har ingen bulk-opslag af navne; vi slår højst så mange op pr. visning. */
export const NAME_LOOKUP_LIMIT = 50;

export async function buildStockView(
  client: Pick<LagersystemClient, "getBalances" | "searchParts" | "getPart">,
  location: string,
  q: string,
): Promise<StockView> {
  const term = q.trim();
  const { as_of, balances } = await client.getBalances(location);
  const bySku = new Map(balances.map((b) => [b.shared_sku, b]));

  if (term.length >= 2) {
    const parts = await client.searchParts(term, NAME_LOOKUP_LIMIT);
    return {
      as_of,
      total: parts.length,
      rows: parts.map((p) => ({
        shared_sku: p.shared_sku,
        name: p.name,
        qty: bySku.get(p.shared_sku)?.qty ?? 0,
        updated_at: bySku.get(p.shared_sku)?.updated_at ?? null,
      })),
    };
  }

  const shown = [...balances]
    .sort((a, b) => a.qty - b.qty || a.shared_sku.localeCompare(b.shared_sku))
    .slice(0, NAME_LOOKUP_LIMIT);
  const names = await Promise.allSettled(shown.map((b) => client.getPart(b.shared_sku)));
  return {
    as_of,
    total: balances.length,
    rows: shown.map((b, i) => {
      const n = names[i];
      return { shared_sku: b.shared_sku, name: n.status === "fulfilled" ? n.value.name : null, qty: b.qty, updated_at: b.updated_at };
    }),
  };
}
