// Delt mock af Supabase til reparations-route-tests: slår services op i et
// katalog og husker, hvilke sager der blev indsat.
export interface CatalogService {
  id: string;
  name: string;
  price_dkk: number;
  active: boolean;
  repair_models: { name: string };
}

export function makeSupabase(catalog: CatalogService[]) {
  const state = {
    tickets: [] as Record<string, unknown>[],
    logs: [] as Record<string, unknown>[],
  };
  const from = (table: string) => {
    let rows: Record<string, unknown>[] = [];
    let ids: string[] | null = null;
    const result = () => {
      if (table === "repair_services") {
        return { data: catalog.filter((c) => (ids ?? []).includes(c.id)), error: null };
      }
      if (table === "repair_tickets") {
        return { data: state.tickets.slice(-rows.length).map((t) => ({ ...t })), error: null };
      }
      return { data: null, error: null };
    };
    const chain: Record<string, unknown> = {
      select: () => chain,
      in: (_c: string, v: string[]) => ((ids = v), chain),
      insert: (v: Record<string, unknown> | Record<string, unknown>[]) => {
        rows = Array.isArray(v) ? v : [v];
        if (table === "repair_tickets") {
          for (const r of rows) state.tickets.push({ ...r, id: `ticket-${state.tickets.length + 1}` });
        }
        if (table === "repair_status_log") state.logs.push(...rows);
        return chain;
      },
      single: async () => ({ data: result().data?.[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) => resolve(result()),
    };
    return chain;
  };
  return { client: { from }, state };
}
