// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createLagersystemClient, describeLagersystemError } from "../client";

const cfg = { url: "https://lager.test", apiKey: "k" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const call = (f: ReturnType<typeof vi.fn>, i = 0) => f.mock.calls[i] as unknown as [string, RequestInit];
const item = { id: "rma 1", status: "REGISTERED" };

describe("RMA client (Bilag A /rma)", () => {
  it("lists with location, comma-separated status, company and supplier", async () => {
    const f = vi.fn(async () => json(200, { items: [item] }));
    expect(await createLagersystemClient(cfg, f).listRma({ location: "vejle-hub", status: ["REGISTERED", "SENT"], supplier: "Foneday" })).toEqual([item]);
    expect(call(f)[0]).toBe("https://lager.test/api/v1/rma?location=vejle-hub&status=REGISTERED%2CSENT&supplier=Foneday");
  });

  it("creates an RMA and returns the replay flag", async () => {
    const f = vi.fn(async () => json(201, { item, replayed: false }));
    const input = { idempotency_key: "k1", location: "vejle-hub", shared_sku: "S", qty: 1, reason: "Død pixel", supplier: "Foneday", reference: "PS-1", actor_label: "a" };
    expect(await createLagersystemClient(cfg, f).createRma(input)).toEqual({ item, replayed: false });
    expect(call(f)[0]).toBe("https://lager.test/api/v1/rma");
    expect(call(f)[1].method).toBe("POST");
    expect(JSON.parse(call(f)[1].body as string)).toEqual(input);
  });

  it("send and resolve post to /rma/:id/... and unwrap the item", async () => {
    const f = vi.fn(async () => json(200, { item: { ...item, status: "SENT" } }));
    const c = createLagersystemClient(cfg, f);
    expect(await c.sendRma("rma 1", { actor_label: "a", supplier_ref: "FD-77" })).toMatchObject({ status: "SENT" });
    expect(call(f, 0)[0]).toBe("https://lager.test/api/v1/rma/rma%201/send");
    await c.resolveRma("rma 1", { actor_label: "a", outcome: "CREDITED", credit_ore: 41500 });
    expect(call(f, 1)[0]).toBe("https://lager.test/api/v1/rma/rma%201/resolve");
    expect(JSON.parse(call(f, 1)[1].body as string)).toEqual({ actor_label: "a", outcome: "CREDITED", credit_ore: 41500 });
  });

  it("unknown_rma is final and has Danish text", async () => {
    const f = vi.fn(async () => json(404, { error: { code: "unknown_rma", message: "no" } }));
    const err = await createLagersystemClient(cfg, f).sendRma("x", { actor_label: "a" }).catch((e) => e);
    expect(err).toMatchObject({ status: 404, code: "unknown_rma", retryable: false });
    expect(describeLagersystemError(err)).toBe("Reklamationen findes ikke.");
  });
});
