import { describe, it, expect } from "vitest";
import { lookupOrdersImpl, lookupRepairsImpl, type ToolContext } from "@/lib/mail-agent/tools";

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
        filters.push((r) => String(r[col] ?? "").toLowerCase() === v.toLowerCase());
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
  return { from: query } as never;
}

function ctxFor(sb: never, senderEmail: string): ToolContext {
  return { supabase: sb, senderEmail, log: [], scopeMismatch: { value: false } };
}

const orders = [
  { id: "o1", order_number: "PS-1001", status: "shipped", total: 349900, created_at: "2026-09-01T10:00:00Z", tracking_number: "PN123", customer_id: "c1" },
];
const customers = [{ id: "c1", email: "kunde@example.com", name: "Kunde" }];

describe("lookupOrdersImpl", () => {
  it("returns the sender's orders by email", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), "kunde@example.com");
    const out = await lookupOrdersImpl(ctx, {});
    expect(out).toContain("PS-1001");
    expect(out).toContain("afsendt");
    expect(out).toContain("PN123");
    expect(ctx.log[0]).toMatchObject({ tool: "lookup_orders", hits: 1 });
    expect(ctx.scopeMismatch.value).toBe(false);
  });

  it("finds an order by number when it belongs to the sender", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), "kunde@example.com");
    const out = await lookupOrdersImpl(ctx, { order_number: "ps-1001" });
    expect(out).toContain("PS-1001");
    expect(ctx.scopeMismatch.value).toBe(false);
  });

  it("flags a mismatch when the order number belongs to another address", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), "anden@example.com");
    const out = await lookupOrdersImpl(ctx, { order_number: "PS-1001" });
    expect(out).toContain("anden adresse");
    expect(out).not.toContain("PN123");
    expect(ctx.scopeMismatch.value).toBe(true);
  });

  it("reports no orders for an unknown sender", async () => {
    const ctx = ctxFor(fakeSupabase({ orders, customers }), "ukendt@example.com");
    expect(await lookupOrdersImpl(ctx, {})).toContain("Ingen ordrer");
  });
});

describe("lookupRepairsImpl", () => {
  const repair_tickets = [
    { id: "abcdef12-0000", device_model: "iPhone 13", issue_description: "Skærm", status: "ready", created_at: "2026-09-02", updated_at: "2026-09-03", customer_email: "kunde@example.com", customer_phone: "12345678" },
  ];

  it("lists the sender's repairs", async () => {
    const ctx = ctxFor(fakeSupabase({ repair_tickets }), "kunde@example.com");
    const out = await lookupRepairsImpl(ctx, {});
    expect(out).toContain("iPhone 13");
    expect(ctx.log[0]).toMatchObject({ tool: "lookup_repairs", hits: 1 });
  });

  it("flags a mismatch when a phone lookup hits someone else's ticket", async () => {
    const ctx = ctxFor(fakeSupabase({ repair_tickets }), "anden@example.com");
    const out = await lookupRepairsImpl(ctx, { phone: "12345678" });
    expect(out).toContain("anden adresse");
    expect(ctx.scopeMismatch.value).toBe(true);
  });
});
