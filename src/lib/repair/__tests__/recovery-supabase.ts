// Lille in-memory Supabase til betalingsgendannelses-tests: repair_tickets og repair_status_log
// med select/eq/limit/update/insert/maybeSingle.
export type Row = Record<string, unknown>;

export function makeRecoverySupabase(tickets: Row[]) {
  const state = { tickets, logs: [] as Row[] };
  const read = (row: Row, col: string): unknown => {
    if (col.includes("->>")) {
      const [base, key] = col.split("->>");
      return ((row[base] ?? {}) as Row)[key];
    }
    return row[col];
  };
  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    let patch: Row | null = null;
    let logRows: Row[] | null = null;
    const matching = () =>
      state.tickets.filter((t) => filters.every(([c, v]) => read(t, c) === v));
    const run = () => {
      if (table === "repair_status_log") {
        if (logRows) state.logs.push(...logRows);
        return { data: null, error: null };
      }
      const rows = matching();
      if (patch) {
        for (const r of rows) Object.assign(r, patch);
        return { data: rows.map((r) => ({ id: r.id })), error: null };
      }
      return { data: rows.map((r) => ({ ...r })), error: null };
    };
    const chain: Row = {
      select: () => chain,
      eq: (c: string, v: unknown) => (filters.push([c, v]), chain),
      limit: () => chain,
      update: (p: Row) => ((patch = p), chain),
      insert: (v: Row | Row[]) => ((logRows = Array.isArray(v) ? v : [v]), chain),
      maybeSingle: async () => ({ data: (run().data as Row[] | null)?.[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) => resolve(run()),
    };
    return chain;
  };
  return { client: { from }, state };
}
