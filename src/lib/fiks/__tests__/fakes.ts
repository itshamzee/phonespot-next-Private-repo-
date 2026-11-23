/** Test doubles for the Fiks chat: an in-memory Supabase and a scripted Anthropic tool runner. */

type Row = Record<string, unknown>;

export interface FakeDb {
  tables: Record<string, Row[]>;
  /** Make the next write to this table fail. */
  failWrites: Set<string>;
}

let seq = 0;

export function fakeSupabase(initial: Record<string, Row[]> = {}) {
  const db: FakeDb = {
    tables: { contact_inquiries: [], inquiry_messages: [], ...structuredClone(initial) },
    failWrites: new Set(),
  };
  let clock = Date.parse("2026-11-19T10:00:00Z");
  const tick = () => new Date((clock += 1000)).toISOString();

  function query(table: string) {
    const rows = () => (db.tables[table] ??= []);
    const filters: ((r: Row) => boolean)[] = [];
    let mode: "select" | "insert" | "update" = "select";
    let payload: Row | null = null;
    let countMode = false;
    let head = false;
    let orderCol: string | null = null;
    let ascending = true;
    let lim: number | null = null;
    let inserted: Row | null = null;

    const matches = () => rows().filter((r) => filters.every((f) => f(r)));
    const execute = (): { data: unknown; error: unknown; count?: number } => {
      if (mode === "insert") {
        if (db.failWrites.has(table)) return { data: null, error: { code: "x", message: "write failed" } };
        if (!inserted) {
          inserted = { id: `id-${++seq}`, created_at: tick(), ...payload };
          rows().push(inserted);
        }
        return { data: inserted, error: null };
      }
      if (mode === "update") {
        if (db.failWrites.has(table)) return { data: null, error: { code: "x", message: "write failed" } };
        for (const r of matches()) Object.assign(r, payload);
        return { data: null, error: null };
      }
      let out = matches();
      if (orderCol) {
        const c = orderCol;
        out = [...out].sort((a, b) => String(a[c]).localeCompare(String(b[c])) * (ascending ? 1 : -1));
      }
      if (lim != null) out = out.slice(0, lim);
      if (countMode) return { data: head ? null : out, error: null, count: out.length };
      return { data: out, error: null };
    };

    const api = {
      select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count) countMode = true;
        if (opts?.head) head = true;
        return api;
      },
      insert: (row: Row) => {
        mode = "insert";
        payload = row;
        return api;
      },
      update: (row: Row) => {
        mode = "update";
        payload = row;
        return api;
      },
      eq: (col: string, v: unknown) => {
        // "metadata->>fiks_ip": JSON-felt som tekst, som i PostgREST.
        const [base, key] = col.split("->>");
        if (key) filters.push((r) => (r[base] as Record<string, unknown> | null | undefined)?.[key] === v);
        else filters.push((r) => r[col] === v);
        return api;
      },
      neq: (col: string, v: unknown) => {
        filters.push((r) => r[col] !== v);
        return api;
      },
      gte: (col: string, v: string) => {
        filters.push((r) => String(r[col]) >= v);
        return api;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderCol = col;
        ascending = opts?.ascending ?? true;
        return api;
      },
      limit: (n: number) => {
        lim = n;
        return api;
      },
      maybeSingle: async () => {
        const r = execute();
        return { ...r, data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data };
      },
      single: async () => {
        const r = execute();
        return { ...r, data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data };
      },
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
        try {
          resolve(execute());
        } catch (e) {
          reject?.(e);
        }
      },
    };
    return api;
  }

  const client = { from: (table: string) => query(table) };
  return { client: client as never, db, setClock: (iso: string) => (clock = Date.parse(iso)) };
}

export interface RunnerTool {
  name: string;
  run: (input: unknown) => Promise<unknown>;
}

export interface RunnerParams {
  model: string;
  system: { text: string }[];
  messages: { role: string; content: string }[];
  tools: RunnerTool[];
  max_iterations: number;
  output_config: { effort: string };
}

/**
 * A tool runner that calls `script` with the params; the script may run tools
 * (as the model would) and returns the final assistant text.
 */
export function fakeAnthropic(script: (params: RunnerParams) => Promise<string> | string) {
  const calls: RunnerParams[] = [];
  const anthropic = {
    beta: {
      messages: {
        toolRunner: (params: RunnerParams) => {
          calls.push(params);
          return {
            async *[Symbol.asyncIterator]() {
              const text = await script(params);
              yield { content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
            },
          };
        },
      },
    },
  };
  return { anthropic: anthropic as never, calls };
}

export function tool(params: RunnerParams, name: string): RunnerTool {
  const t = params.tools.find((x) => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
}
