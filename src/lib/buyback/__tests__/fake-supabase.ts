import { vi } from "vitest";
import type { createAdminClient } from "@/lib/supabase/admin";

type Rows = Record<string, unknown[]>;
type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// Minimal chainable Supabase mock. Each from(table) returns a thenable builder
// that resolves to { data: rowsByTable[table] ?? [], error: null }. Filter
// methods are recorded for assertions but do NOT filter — the units do their
// own JS-side selection (in_stock / status / quality / category), so tests pass
// fixture rows per table and assert the unit's selection logic.
// `maybeSingle`/`single` resolve to the first row.
export function makeFakeClient(rowsByTable: Rows = {}) {
  const calls: { table: string; ops: [string, ...unknown[]][] }[] = [];

  function builder(table: string) {
    const ops: [string, ...unknown[]][] = [];
    calls.push({ table, ops });
    const rows = rowsByTable[table] ?? [];
    const record = (op: string, ...args: unknown[]) => {
      ops.push([op, ...args]);
      return chain;
    };
    const resolveList = () => ({ data: rows, error: null });
    const resolveFirst = () => ({ data: rows[0] ?? null, error: null });
    const chain = {
      select: (...a: unknown[]) => record("select", ...a),
      eq: (...a: unknown[]) => record("eq", ...a),
      neq: (...a: unknown[]) => record("neq", ...a),
      gt: (...a: unknown[]) => record("gt", ...a),
      not: (...a: unknown[]) => record("not", ...a),
      contains: (...a: unknown[]) => record("contains", ...a),
      order: (...a: unknown[]) => record("order", ...a),
      limit: (...a: unknown[]) => record("limit", ...a),
      maybeSingle: () => Promise.resolve(resolveFirst()),
      single: () => Promise.resolve(resolveFirst()),
      then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve(resolveList()),
    };
    return chain;
  }

  const client = { from: vi.fn((table: string) => builder(table)) };
  // Units only call client.from(...); cast to the production client type so
  // call sites need no per-test casting.
  return { client: client as unknown as SupabaseAdmin, calls };
}
