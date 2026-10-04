// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { CVR_USER_AGENT, CvrError, lookupCvr, normalizeCvr } from "../cvr";

function db(cached: unknown[] = []) {
  const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "not", "order"]) chain[m] = () => chain;
  chain.limit = async () => ({ data: cached, error: null });
  return { client: { from: () => ({ ...chain, update }) } as never, update };
}
const res = (status: number, body: unknown) => ({ status, ok: status < 400, json: async () => body }) as Response;

describe("cvr", () => {
  it("normalises CVR numbers", () => {
    expect(normalizeCvr("DK 1234 5678")).toBe("12345678");
    expect(normalizeCvr("1234")).toBeNull();
  });
  it("sends a descriptive user agent, shapes the answer and caches it on the customer", async () => {
    const { client, update } = db();
    const fetchImpl = vi.fn(async () => res(200, { name: "Kontor ApS", address: "Vej 1", zipcode: 7100, city: "Vejle" }));
    const r = await lookupCvr("12345678", client, { customerId: "c1", fetchImpl: fetchImpl as never });
    expect(r).toMatchObject({ company_name: "Kontor ApS", zip: "7100", cached: false });
    expect((fetchImpl.mock.calls[0] as unknown[])[1]).toMatchObject({ headers: { "User-Agent": CVR_USER_AGENT } });
    expect(update).toHaveBeenCalled();
  });
  it("answers from a fresh cache without calling cvrapi", async () => {
    const { client } = db([{ cvr_lookup: { name: "Cache ApS" }, cvr_lookup_at: new Date().toISOString() }]);
    const fetchImpl = vi.fn();
    const r = await lookupCvr("12345678", client, { fetchImpl: fetchImpl as never });
    expect(r).toMatchObject({ company_name: "Cache ApS", cached: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("maps 404 and 429 to graceful errors", async () => {
    const { client } = db();
    await expect(lookupCvr("12345678", client, { fetchImpl: (async () => res(404, { error: "NOT_FOUND" })) as never })).rejects.toMatchObject({ status: 404 });
    await expect(lookupCvr("12345678", client, { fetchImpl: (async () => res(429, {})) as never })).rejects.toBeInstanceOf(CvrError);
  });
});
