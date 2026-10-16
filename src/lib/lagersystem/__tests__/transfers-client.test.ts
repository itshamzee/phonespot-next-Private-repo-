// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createLagersystemClient, describeLagersystemError, LagersystemError } from "../client";

const cfg = { url: "https://lager.test", apiKey: "k" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const call = (f: ReturnType<typeof vi.fn>, i = 0) => f.mock.calls[i] as unknown as [string, RequestInit];

describe("transfer client", () => {
  it("reads availability for one sku", async () => {
    const f = vi.fn(async () => json(200, { shared_sku: "S", availability: [{ location: "phonespot-esbjerg", location_name: "PhoneSpot Esbjerg", qty: 2 }] }));
    expect(await createLagersystemClient(cfg, f).getAvailability("S/1")).toEqual([{ location: "phonespot-esbjerg", location_name: "PhoneSpot Esbjerg", qty: 2 }]);
    expect(call(f)[0]).toBe("https://lager.test/api/v1/availability?sku=S%2F1");
  });

  it("lists transfers with location, comma-separated status and direction", async () => {
    const f = vi.fn(async () => json(200, { transfers: [] }));
    await createLagersystemClient(cfg, f).listTransfers({ location: "vejle-hub", status: ["REQUESTED", "SENT"], direction: "out" });
    expect(call(f)[0]).toBe("https://lager.test/api/v1/transfers?location=vejle-hub&status=REQUESTED%2CSENT&direction=out");
  });

  it("creates a transfer and passes the replay flag", async () => {
    const f = vi.fn(async () => json(200, { transfer: { id: "tr1" }, replayed: true }));
    const r = await createLagersystemClient(cfg, f).createTransfer({ idempotency_key: "k1", from: "phonespot-esbjerg", to: "vejle-hub", lines: [{ shared_sku: "S", qty: 1 }], reference: "PS-1", actor_label: "a" });
    expect(r).toEqual({ transfer: { id: "tr1" }, replayed: true });
    expect(call(f)[0]).toBe("https://lager.test/api/v1/transfers");
    expect(JSON.parse(call(f)[1].body as string)).toMatchObject({ from: "phonespot-esbjerg", to: "vejle-hub", reference: "PS-1" });
  });

  it.each([
    ["sendTransfer", "send", { actor_label: "a" }],
    ["receiveTransfer", "receive", { actor_label: "a", lines: [{ shared_sku: "S", qty_received: 1 }] }],
    ["rejectTransfer", "reject", { actor_label: "a", reason: "Ikke på lager" }],
    ["cancelTransfer", "cancel", { actor_label: "a" }],
  ] as const)("%s posts to /transfers/:id/%s and returns the transfer", async (method, action, body) => {
    const f = vi.fn(async () => json(200, { transfer: { id: "tr 1", status: "SENT" } }));
    const client = createLagersystemClient(cfg, f) as unknown as Record<string, (id: string, b: unknown) => Promise<unknown>>;
    expect(await client[method]("tr 1", body)).toEqual({ id: "tr 1", status: "SENT" });
    expect(call(f)[0]).toBe(`https://lager.test/api/v1/transfers/tr%201/${action}`);
    expect(call(f)[1].method).toBe("POST");
  });

  it("explains invalid_state in Danish and does not retry it", async () => {
    const f = vi.fn(async () => json(409, { error: { code: "invalid_state", message: "already sent" } }));
    const err = await createLagersystemClient(cfg, f).cancelTransfer("tr1", { actor_label: "a" }).catch((e) => e);
    expect(err).toBeInstanceOf(LagersystemError);
    expect(err.retryable).toBe(false);
    expect(describeLagersystemError(err)).toBe("Flytningen har skiftet status i mellemtiden. Genindlæs siden og prøv igen.");
  });
});
