/**
 * Minimal in-memory stand-in for the Supabase query builder, enough to test
 * routes that filter by store (eq / is / in / neq / ilike / order / limit /
 * range, plus update / insert). `or()` is a pass-through on purpose: tests of
 * scope enforcement assert on the filters the route applies, not on PostgREST
 * text search.
 */

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export type FakeDb = {
  tables: Record<string, Row[]>;
  /** Every filter the routes applied, as "table.column=op:value", for assertions. */
  log: string[];
};

class FakeQuery implements PromiseLike<{ data: unknown; error: null; count: number | null }> {
  private filters: Filter[] = [];
  private op: "select" | "update" | "insert" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private wantsRows = true;
  private countMode = false;
  private headOnly = false;
  private orderBy: { column: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private rangeTo: [number, number] | null = null;

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  private note(column: string, op: string, value: unknown) {
    this.db.log.push(`${this.table}.${column}=${op}:${Array.isArray(value) ? value.join("|") : String(value)}`);
  }

  select(_columns?: string, opts?: { count?: string; head?: boolean }) {
    this.wantsRows = true;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    this.wantsRows = false;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    this.wantsRows = false;
    return this;
  }
  delete() {
    this.op = "delete";
    this.wantsRows = false;
    return this;
  }
  eq(column: string, value: unknown) {
    this.note(column, "eq", value);
    this.filters.push((r) => r[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.note(column, "neq", value);
    this.filters.push((r) => r[column] !== value);
    return this;
  }
  is(column: string, value: null) {
    this.note(column, "is", value);
    this.filters.push((r) => (r[column] ?? null) === value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.note(column, "in", values);
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }
  gte(column: string, value: string | number) {
    this.note(column, "gte", value);
    this.filters.push((r) => r[column] != null && (r[column] as string | number) >= value);
    return this;
  }
  gt(column: string, value: string | number) {
    this.note(column, "gt", value);
    this.filters.push((r) => r[column] != null && (r[column] as string | number) > value);
    return this;
  }
  lt(column: string, value: string | number) {
    this.note(column, "lt", value);
    this.filters.push((r) => r[column] != null && (r[column] as string | number) < value);
    return this;
  }
  /** Understands `not(col, "is", null)` and `not(col, "in", "(a,b)")`. */
  not(column: string, op: string, value: unknown) {
    this.note(column, `not-${op}`, value);
    if (op === "is") this.filters.push((r) => (r[column] ?? null) !== value);
    else if (op === "in") {
      const list = String(value).replace(/^\(|\)$/g, "").split(",");
      this.filters.push((r) => !list.includes(String(r[column])));
    }
    return this;
  }
  ilike(column: string, pattern: string) {
    const needle = pattern.replace(/%/g, "").toLowerCase();
    this.filters.push((r) => String(r[column] ?? "").toLowerCase().includes(needle));
    return this;
  }
  or(filters: string) {
    this.db.log.push(`${this.table}.or=${filters}`);
    // Understands only "col.is.null" and "col.eq.value" terms, joined by commas. Anything
    // else (e.g. the ilike terms of the search routes) is a pass-through.
    const terms = filters.split(",").map((t) => t.split("."));
    const simple = terms.every((t) => t.length === 3 && ((t[1] === "is" && t[2] === "null") || t[1] === "eq"));
    if (simple) {
      this.filters.push((r) =>
        terms.some(([col, op, val]) => (op === "is" ? (r[col] ?? null) === null : String(r[col]) === val)),
      );
    }
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = { column, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.rangeTo = [from, to];
    return this;
  }

  private run(): { data: Row[]; count: number } {
    const rows = this.db.tables[this.table] ?? (this.db.tables[this.table] = []);
    if (this.op === "insert") {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      const created = incoming.map((r, i) => ({ id: `${this.table}-${rows.length + i + 1}`, ...r }));
      rows.push(...created);
      return { data: created, count: created.length };
    }
    const matched = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "update") {
      for (const r of matched) Object.assign(r, this.payload);
      return { data: matched, count: matched.length };
    }
    if (this.op === "delete") {
      this.db.tables[this.table] = rows.filter((r) => !matched.includes(r));
      return { data: matched, count: matched.length };
    }
    let out = [...matched];
    if (this.orderBy) {
      const { column, asc } = this.orderBy;
      out.sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : 1) * (asc ? 1 : -1));
    }
    const total = out.length;
    if (this.rangeTo) out = out.slice(this.rangeTo[0], this.rangeTo[1] + 1);
    if (this.limitN !== null) out = out.slice(0, this.limitN);
    return { data: out, count: total };
  }

  async maybeSingle() {
    const { data } = this.run();
    return { data: data[0] ?? null, error: null };
  }
  async single() {
    const { data } = this.run();
    return data[0] ? { data: data[0], error: null } : { data: null, error: { message: "not found" } };
  }

  then<R1 = { data: unknown; error: null; count: number | null }, R2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null; count: number | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    const { data, count } = this.run();
    const result = {
      data: this.headOnly ? null : this.op === "update" && !this.wantsRows ? null : data,
      error: null,
      count: this.countMode ? count : null,
    };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

export function createFakeDb(tables: Record<string, Row[]>): { db: FakeDb; client: { from: (table: string) => FakeQuery; storage: unknown } } {
  const db: FakeDb = { tables, log: [] };
  return {
    db,
    client: {
      from: (table: string) => new FakeQuery(db, table),
      storage: {},
    },
  };
}
