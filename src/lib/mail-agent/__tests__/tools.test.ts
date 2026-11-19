import { describe, it, expect } from "vitest";
import {
  buildTools,
  lookupBuybackImpl,
  lookupCustomerImpl,
  lookupOrdersImpl,
  lookupRepairsImpl,
  type ToolContext,
} from "@/lib/mail-agent/tools";

type Row = Record<string, unknown>;

/** Chainable fake covering select/eq/ilike/order/limit/maybeSingle and thenable list results. */
function fakeSupabase(tables: Record<string, Row[]>) {
  function query(table: string) {
    const rows = tables[table] ?? [];
    const filters: ((r: Row) => boolean)[] = [];
    let lim: number | null = null;
    const run = () => {
      const out = rows.filter((r) => filters.every((f) => f(r)));
      return lim ? out.slice(0, lim) : out;
    };
    const api = {
      select: () => api,
      eq: (col: string, v: unknown) => {
        filters.push((r) => r[col] === v);
        return api;
      },
      ilike: (col: string, v: string) => {
        // LIKE semantics: unescaped % and _ are wildcards, backslash escapes.
        const lit = (c: string) => (/[a-z0-9@.\-]/i.test(c) && c !== "." ? c : `\\${c}`);
        let re = "";
        for (let i = 0; i < v.length; i++) {
          const ch = v[i];
          if (ch === "\\" && i + 1 < v.length) re += lit(v[++i]);
          else if (ch === "%") re += ".*";
          else if (ch === "_") re += ".";
          else re += lit(ch);
        }
        const rx = new RegExp(`^${re}$`, "i");
        filters.push((r) => rx.test(String(r[col] ?? "")));
        return api;
      },
      order: () => api,
      limit: (n: number) => {
        lim = n;
        return api;
      },
      maybeSingle: async () => ({ data: run()[0] ?? null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: run() }),
    };
    return api;
  }
  const sb = { from: (table: string) => { sb.calls++; return query(table); }, calls: 0 };
  return sb as never;
}

function ctxFor(sb: never, emails: string[]): ToolContext {
  return { supabase: sb, verified: { emails }, log: [], outputs: [], scopeMismatch: { value: false } };
}

const orders = [
  { id: "o1", order_number: "PS-1001", status: "shipped", total: 349900, created_at: "2026-09-01T10:00:00Z", tracking_number: "PN123", customer_id: "c1" },
];
const customers = [{ id: "c1", email: "kunde@example.com", name: "Kunde" }];

describe("lookupOrdersImpl", () => {
  it("returns the sender's orders by email", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), ["kunde@example.com"]);
    const out = await lookupOrdersImpl(ctx, {});
    expect(out).toContain("PS-1001");
    expect(out).toContain("afsendt");
    expect(out).toContain("PN123");
    expect(ctx.log[0]).toMatchObject({ tool: "lookup_orders", hits: 1 });
    expect(ctx.scopeMismatch.value).toBe(false);
  });

  it("finds an order by number when it belongs to the sender", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), ["kunde@example.com"]);
    const out = await lookupOrdersImpl(ctx, { order_number: "ps-1001" });
    expect(out).toContain("PS-1001");
    expect(ctx.scopeMismatch.value).toBe(false);
  });

  it("flags a mismatch when the order number belongs to another address", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), ["anden@example.com"]);
    const out = await lookupOrdersImpl(ctx, { order_number: "PS-1001" });
    expect(out).toContain("anden adresse");
    expect(out).not.toContain("PN123");
    expect(ctx.scopeMismatch.value).toBe(true);
  });

  it("reports no orders for an unknown sender", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), ["ukendt@example.com"]);
    expect(await lookupOrdersImpl(ctx, {})).toContain("Ingen ordrer");
  });
});

describe("lookupRepairsImpl", () => {
  const repair_tickets = [
    { id: "abcdef12-0000", device_model: "iPhone 13", issue_description: "Skærm", status: "ready", created_at: "2026-09-02", updated_at: "2026-09-03", customer_email: "kunde@example.com", customer_phone: "12345678" },
  ];

  it("lists the sender's repairs", async () => {
    const ctx = ctxFor(fakeSupabase({ repair_tickets }), ["kunde@example.com"]);
    const out = await lookupRepairsImpl(ctx, {});
    expect(out).toContain("iPhone 13");
    expect(ctx.log[0]).toMatchObject({ tool: "lookup_repairs", hits: 1 });
  });

  it("flags a mismatch when a phone lookup hits someone else's ticket", async () => {
    const ctx = ctxFor(fakeSupabase({ repair_tickets }), ["anden@example.com"]);
    const out = await lookupRepairsImpl(ctx, { phone: "12345678" });
    expect(out).toContain("anden adresse");
    expect(ctx.scopeMismatch.value).toBe(true);
  });
});

describe("anonym afsender (ingen verificerede adresser)", () => {
  const cases: [string, (ctx: ToolContext) => Promise<string>][] = [
    ["lookupOrdersImpl", (c) => lookupOrdersImpl(c, {})],
    ["lookupRepairsImpl", (c) => lookupRepairsImpl(c, { phone: "12345678" })],
    ["lookupBuybackImpl", (c) => lookupBuybackImpl(c)],
    ["lookupCustomerImpl", (c) => lookupCustomerImpl(c)],
  ];
  for (const [name, call] of cases) {
    it(`${name} returnerer ikke-verificeret og rører ikke databasen`, async () => {
      const sb = fakeSupabase({ orders, customers }) as unknown as { calls: number };
      const ctx = ctxFor(sb as never, []);
      const out = await call(ctx);
      expect(out).toContain("ikke verificeret");
      expect(ctx.scopeMismatch.value).toBe(true);
      expect(sb.calls).toBe(0);
    });
  }
});

describe("jokertegn i afsenderadressen", () => {
  const wildcardCustomers = [{ id: "c1", email: "jane@x.com", name: "Jane" }];
  const wildcardOrders = [{ id: "o1", order_number: "PS-2000", status: "shipped", total: 100, created_at: "2026-09-01", customer_id: "c1" }];
  const trade_ins = [{ customer_id: "c1", device_description: "iPhone 12", offered_price: 100, status: "paid", created_at: "2026-09-01" }];
  const make = () => ctxFor(fakeSupabase({ customers: wildcardCustomers, orders: wildcardOrders, trade_ins }), ["j_ne@x.com"]);

  it("lookup_orders giver ingen data til j_ne@x.com om jane@x.com", async () => {
    const ctx = make();
    const out = await lookupOrdersImpl(ctx, {});
    expect(out).not.toContain("PS-2000");
    expect(ctx.scopeMismatch.value).toBe(false);
  });

  it("lookup_buyback giver ingen data", async () => {
    const ctx = make();
    const out = await lookupBuybackImpl(ctx);
    expect(out).not.toContain("iPhone 12");
  });

  it("lookup_customer giver ingen data", async () => {
    const ctx = make();
    const out = await lookupCustomerImpl(ctx);
    expect(out).not.toContain("Jane");
  });

  it("afviser en række hvis adresse ikke er afsenderens, selv hvis databasen matcher den", async () => {
    // A fake whose ilike ignores escaping, as if the wildcard had slipped through.
    const sb = {
      from: () => {
        const api = {
          select: () => api,
          ilike: () => api,
          eq: () => api,
          order: () => api,
          limit: () => api,
          maybeSingle: async () => ({ data: { id: "c1", name: "Jane", email: "Jane@x.com", created_at: "2026-09-01" } }),
        };
        return api;
      },
    } as never;
    const ctx = ctxFor(sb, ["j_ne@x.com"]);
    const out = await lookupCustomerImpl(ctx);
    expect(out).toContain("anden adresse");
    expect(out).not.toContain("Jane");
    expect(ctx.scopeMismatch.value).toBe(true);
  });
});

describe("ikke-verificeret afsender med ordrenummer eller telefon", () => {
  it("ordrenummer giver ikke-verificeret uden databasekald", async () => {
    const sb = fakeSupabase({ orders, customers }) as unknown as { calls: number };
    const ctx = ctxFor(sb as never, []);
    const out = await lookupOrdersImpl(ctx, { order_number: "PS-1001" });
    expect(out).toContain("ikke verificeret");
    expect(out).not.toContain("PN123");
    expect(sb.calls).toBe(0);
  });

  it("telefonnummer giver ikke-verificeret uden databasekald", async () => {
    const sb = fakeSupabase({}) as unknown as { calls: number };
    const ctx = ctxFor(sb as never, []);
    const out = await lookupRepairsImpl(ctx, { phone: "12345678" });
    expect(out).toContain("ikke verificeret");
    expect(sb.calls).toBe(0);
  });
});

describe("telefonopslag med blandede ejere", () => {
  const repair_tickets = [
    { id: "aaaaaaaa-1", device_model: "iPhone 13", issue_description: "Skærm", status: "ready", created_at: "2026-09-02", updated_at: "2026-09-03", customer_email: "kunde@example.com", customer_phone: "12345678" },
    { id: "bbbbbbbb-2", device_model: "Galaxy S9", issue_description: "Batteri", status: "ready", created_at: "2026-09-01", updated_at: "2026-09-03", customer_email: "anden@example.com", customer_phone: "12345678" },
  ];
  it("returnerer kun afsenderens egne sager og markerer uoverensstemmelse", async () => {
    const ctx = ctxFor(fakeSupabase({ repair_tickets }), ["kunde@example.com"]);
    const out = await lookupRepairsImpl(ctx, { phone: "12345678" });
    expect(out).toContain("iPhone 13");
    expect(out).not.toContain("Galaxy");
    expect(ctx.scopeMismatch.value).toBe(true);
  });
});

describe("buildTools ctx.outputs", () => {
  it("hvert værktøj undtagen submit_assessment lægger sin returtekst i outputs præcis én gang", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), ["kunde@example.com"]);
    const tools = buildTools(ctx, () => {}) as unknown as { name: string; run: (i: unknown) => Promise<unknown> }[];
    const inputs: Record<string, unknown> = {
      lookup_orders: {},
      lookup_repairs: {},
      lookup_buyback: {},
      lookup_customer: {},
      quote_repair: { model: "iPhone 13" },
      diagnose: { symptom_key: undefined },
      get_knowledge: {},
    };
    const { SYMPTOMS } = await import("@/lib/mail-agent/symptoms");
    inputs.diagnose = { symptom_key: SYMPTOMS[0].key };
    let expected = 0;
    for (const t of tools) {
      if (t.name === "submit_assessment") continue;
      const before = ctx.outputs.length;
      const ret = await t.run(inputs[t.name]);
      expect(ctx.outputs.length, t.name).toBe(before + 1);
      expect(ctx.outputs[ctx.outputs.length - 1], t.name).toBe(ret);
      expected++;
    }
    expect(expected).toBe(7);
    expect(ctx.outputs).toHaveLength(7);
    const submit = tools.find((t) => t.name === "submit_assessment")!;
    expect(submit).toBeDefined();
  });
});
