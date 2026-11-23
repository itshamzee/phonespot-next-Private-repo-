// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flatpayConfig, flatpayTerminalId, flatpayTransactionReference, resetFlatpayGuidCache } from "../flatpay";
import { FLATPAY_NO_TERMINAL, FlatpayTerminal } from "../flatpay-terminal";
import { captureCardPayments, getPaymentTerminal, paymentTerminalKind } from "../payment-terminal";

const ENV = {
  POS_TERMINAL_PROVIDER: "flatpay",
  FLATPAY_GUID: "guid-123",
  FLATPAY_TERMINAL_VEJLE: "TID-VEJLE",
};

type Call = { method: string; path: string; query: Record<string, string>; body: Record<string, unknown> | null };
type Handler = (call: Call) => { status?: number; json?: unknown; text?: string };

function fakeFlatpay(handler: Handler) {
  const calls: Call[] = [];
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const call: Call = {
      method: init?.method ?? "GET",
      path: u.pathname,
      query: Object.fromEntries(u.searchParams),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    };
    calls.push(call);
    const r = handler(call);
    const status = r.status ?? 200;
    const text = r.text ?? JSON.stringify(r.json ?? {});
    return new Response(text, { status, headers: { "Content-Type": "application/json" } });
  });
  let t = 0;
  const deps = { fetch: fetch as unknown as typeof globalThis.fetch, sleep: async (ms: number) => void (t += ms), now: () => t };
  return { calls, fetch, deps };
}

/** Answers start with 200 and the given sequence of statuses on each poll. */
function scripted(statuses: Array<Record<string, unknown>>, extra: Handler = () => ({})): Handler {
  let started: Record<string, unknown> = {};
  const echo = () => ({ amount: Number(started.amount), transactionType: started.transactionType, terminalId: started.terminalId });
  return (c) => {
    if (c.path === "/socket/transaction/start") started = c.body ?? {};
    const e = extra(c);
    if (e.json && c.path === "/socket/transaction/response") return { ...e, json: { ...echo(), ...(e.json as object) } };
    if (e.status || e.json || e.text) return e;
    if (c.path === "/socket/transaction/start") return { json: { transactionReference: c.body?.transactionReference, status: "PENDING" } };
    if (c.path === "/socket/transaction/response") return { json: { transactionReference: c.query.transactionReference, ...echo(), ...(statuses.shift() ?? { status: "PENDING" }) } };
    if (c.path === "/socket/transaction/cancel") return { json: { status: "CANCELLED" } };
    return { status: 500 };
  };
}

beforeEach(() => resetFlatpayGuidCache());

describe("config and references", () => {
  it("selects Flatpay only when asked", () => {
    expect(paymentTerminalKind({ POS_TERMINAL_PROVIDER: "Flatpay" })).toBe("flatpay");
    expect(getPaymentTerminal("vejle", ENV)).toBeInstanceOf(FlatpayTerminal);
    expect(paymentTerminalKind({})).toBe("manual");
  });

  it("reads one terminal per store and caps the wait", () => {
    const cfg = flatpayConfig({ ...ENV, FLATPAY_TERMINAL_SLAGELSE: " TID-S ", FLATPAY_TIMEOUT_MS: "999999" });
    expect(flatpayTerminalId(cfg, "vejle")).toBe("TID-VEJLE");
    expect(flatpayTerminalId(cfg, "Slagelse")).toBe("TID-S");
    expect(flatpayTerminalId(cfg, "esbjerg")).toBeUndefined();
    expect(cfg.timeoutMs).toBe(100_000);
    expect(cfg.baseUrl).toBe("https://socket-api.flatpay.dk");
  });

  it("derives a stable, valid UUID per payment line", () => {
    const a = flatpayTransactionReference("abc:0");
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(flatpayTransactionReference("abc:0")).toBe(a);
    expect(flatpayTransactionReference("abc:1")).not.toBe(a);
  });
});

describe("charge", () => {
  it("starts the sale, polls until approved and returns Flatpay's reference", async () => {
    const f = fakeFlatpay(scripted([{ status: "PENDING" }, { status: "PENDING" }, { status: "COMPLETED", cardScheme: "VISA" }]));
    const t = new FlatpayTerminal("vejle", ENV, f.deps);
    const result = await t.charge({ amountOere: 19_995, reference: "sale-1:0", locationSlug: "vejle" });

    const expectedRef = flatpayTransactionReference("sale-1:0");
    expect(result).toEqual({ status: "approved", transactionId: expectedRef });
    const start = f.calls[0];
    expect(start.path).toBe("/socket/transaction/start");
    expect(start.body).toMatchObject({
      guid: "guid-123",
      terminalId: "TID-VEJLE",
      transactionType: "SALE",
      amount: "19995",
      language: "da_DK",
      externalReference: "sale-1:0",
      transactionReference: expectedRef,
    });
    expect(f.calls.filter((c) => c.path === "/socket/transaction/response")).toHaveLength(3);
    expect(f.calls[1].query).toMatchObject({ guid: "guid-123", terminalId: "TID-VEJLE", transactionReference: expectedRef });
  });

  it("passes a declined card through with the terminal's text", async () => {
    const f = fakeFlatpay(scripted([{ status: "DECLINED", errorText: "Ikke tilstrækkelig dækning" }]));
    const t = new FlatpayTerminal("vejle", ENV, f.deps);
    expect(await t.charge({ amountOere: 100, reference: "r:0", locationSlug: "vejle" })).toEqual({
      status: "declined",
      message: "Ikke tilstrækkelig dækning",
    });
  });

  it("refuses to run without a terminal for the store and never calls Flatpay", async () => {
    const f = fakeFlatpay(() => ({ status: 500 }));
    const t = new FlatpayTerminal("slagelse", ENV, f.deps);
    expect(await t.charge({ amountOere: 100, reference: "r:0", locationSlug: "slagelse" })).toEqual({
      status: "error",
      message: FLATPAY_NO_TERMINAL,
    });
    expect(f.fetch).not.toHaveBeenCalled();
  });

  it("explains a disconnected or busy terminal", async () => {
    for (const [status, text] of [
      [404, "ikke forbundet"],
      [409, "anden betaling"],
    ] as const) {
      const f = fakeFlatpay((c) => (c.path === "/socket/transaction/start" ? { status, json: { message: "x" } } : { status: 500 }));
      const r = await new FlatpayTerminal("vejle", ENV, f.deps).charge({ amountOere: 100, reference: "r:0", locationSlug: "vejle" });
      expect(r.status).toBe("error");
      expect(r.message).toContain(text);
    }
  });

  it("cancels on timeout and reports the final state", async () => {
    const f = fakeFlatpay(scripted([], (c) => (c.path === "/socket/transaction/response" && f.calls.some((x) => x.path === "/socket/transaction/cancel") ? { json: { status: "CANCELLED" } } : {})));
    const t = new FlatpayTerminal("vejle", { ...ENV, FLATPAY_TIMEOUT_MS: "6000" }, f.deps);
    expect(await t.charge({ amountOere: 100, reference: "r:0", locationSlug: "vejle" })).toEqual({ status: "cancelled" });
    expect(f.calls.filter((c) => c.path === "/socket/transaction/cancel")).toHaveLength(1);
  });

  it("still saves the sale when the card went through right as we timed out", async () => {
    const f = fakeFlatpay(scripted([], (c) => (c.path === "/socket/transaction/response" && f.calls.some((x) => x.path === "/socket/transaction/cancel") ? { json: { status: "COMPLETED" } } : {})));
    const t = new FlatpayTerminal("vejle", { ...ENV, FLATPAY_TIMEOUT_MS: "3000" }, f.deps);
    const r = await t.charge({ amountOere: 100, reference: "r:0", locationSlug: "vejle" });
    expect(r.status).toBe("approved");
  });

  it("keeps polling through a network blip", async () => {
    let n = 0;
    const f = fakeFlatpay(scripted([{ status: "COMPLETED" }], (c) => (c.path === "/socket/transaction/response" && n++ === 0 ? { status: 502 } : {})));
    const r = await new FlatpayTerminal("vejle", ENV, f.deps).charge({ amountOere: 100, reference: "r:0", locationSlug: "vejle" });
    expect(r.status).toBe("approved");
  });

  it("works through captureCardPayments: the line's reference becomes Flatpay's id", async () => {
    const f = fakeFlatpay(scripted([{ status: "COMPLETED" }]));
    const out = await captureCardPayments(
      new FlatpayTerminal("vejle", ENV, f.deps),
      [
        { type: "kontant", amountOere: 500 },
        { type: "kort_terminal", amountOere: 1_000 },
      ],
      { reference: "sale-9", locationSlug: "vejle" },
    );
    expect(out[1]).toEqual({ type: "kort_terminal", amountOere: 1_000, reference: flatpayTransactionReference("sale-9:1") });
  });
});

describe("only the payment we asked for counts", () => {
  const run = async (completed: Record<string, unknown>) => {
    const f = fakeFlatpay(scripted([{ status: "COMPLETED", ...completed }]));
    return new FlatpayTerminal("vejle", ENV, f.deps).charge({ amountOere: 50_000, reference: "r:0", locationSlug: "vejle" });
  };

  it("refuses a completed payment with another amount (a reused reference)", async () => {
    expect((await run({ amount: 100 })).status).toBe("error");
  });

  it("refuses a completed REFUND when we asked for a SALE, or another terminal", async () => {
    expect((await run({ transactionType: "REFUND" })).status).toBe("error");
    expect((await run({ terminalId: "TID-OTHER" })).status).toBe("error");
  });

  it("refuses an old completed payment", async () => {
    vi.useFakeTimers();
    try {
      const f = fakeFlatpay(scripted([{ status: "COMPLETED", createdAt: "2026-01-01T10:00:00Z" }]));
      const deps = { ...f.deps, now: () => Date.parse("2026-11-11T12:00:00Z") };
      const r = await new FlatpayTerminal("vejle", ENV, deps).charge({ amountOere: 50_000, reference: "r:0", locationSlug: "vejle" });
      expect(r.status).toBe("error");
      const fresh = fakeFlatpay(scripted([{ status: "COMPLETED", createdAt: "2026-11-11T11:59:30" }]));
      const ok = await new FlatpayTerminal("vejle", ENV, { ...fresh.deps, now: deps.now }).charge({ amountOere: 50_000, reference: "r:0", locationSlug: "vejle" });
      expect(ok.status).toBe("approved");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("reused references", () => {
  it("refuses when Flatpay says the reference was already started (202)", async () => {
    const f = fakeFlatpay(
      scripted([{ status: "COMPLETED" }], (c) =>
        c.path === "/socket/transaction/start" ? { status: 202, json: { transactionReference: c.body?.transactionReference, status: "COMPLETED" } } : {},
      ),
    );
    const r = await new FlatpayTerminal("vejle", ENV, f.deps).charge({ amountOere: 100, reference: "r:0", locationSlug: "vejle" });
    expect(r.status).toBe("error");
    expect(f.calls.some((c) => c.path === "/socket/transaction/response")).toBe(false);
  });
});

describe("refund and login", () => {
  it("sends a refund as a REFUND transaction", async () => {
    const f = fakeFlatpay(scripted([{ status: "COMPLETED" }]));
    const r = await new FlatpayTerminal("vejle", ENV, f.deps).refund({ amountOere: 2_500, reference: "ret-1:0", locationSlug: "vejle" });
    expect(r.status).toBe("approved");
    expect(f.calls[0].body).toMatchObject({ transactionType: "REFUND", amount: "2500" });
  });

  it("logs in with username/password once and reuses the GUID", async () => {
    const env = { FLATPAY_USERNAME: "u", FLATPAY_PASSWORD: "p", FLATPAY_TERMINAL_VEJLE: "TID-VEJLE" };
    const f = fakeFlatpay(scripted([{ status: "COMPLETED" }, { status: "COMPLETED" }], (c) => (c.path === "/socket/guid" ? { text: '"guid-from-login"' } : {})));
    const t = new FlatpayTerminal("vejle", env, f.deps);
    await t.charge({ amountOere: 100, reference: "a:0", locationSlug: "vejle" });
    await t.charge({ amountOere: 100, reference: "b:0", locationSlug: "vejle" });
    expect(f.calls.filter((c) => c.path === "/socket/guid")).toHaveLength(1);
    expect(f.calls.find((c) => c.path === "/socket/guid")?.body).toEqual({ username: "u", password: "p" });
    expect(f.calls.find((c) => c.path === "/socket/transaction/start")?.body?.guid).toBe("guid-from-login");
  });
});

describe("cancel", () => {
  it("finds the pending line of the sale and cancels it", async () => {
    const pendingRef = flatpayTransactionReference("sale-5:1");
    const f = fakeFlatpay((c) => {
      if (c.path === "/socket/transaction/response") {
        return c.query.transactionReference === pendingRef ? { json: { status: "PENDING" } } : { status: 404, json: { message: "not found" } };
      }
      if (c.path === "/socket/transaction/cancel") return { json: { status: "CANCELLED" } };
      return { status: 500 };
    });
    const r = await new FlatpayTerminal("vejle", ENV, f.deps).cancel({ reference: "sale-5", locationSlug: "vejle" });
    expect(r).toEqual({ status: "cancelled" });
    const cancels = f.calls.filter((c) => c.path === "/socket/transaction/cancel");
    expect(cancels).toHaveLength(1);
    expect(cancels[0].body).toEqual({ transactionReference: pendingRef, terminalId: "TID-VEJLE", guid: "guid-123" });
  });
});
