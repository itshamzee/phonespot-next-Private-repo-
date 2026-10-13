// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({
  client: null as unknown,
  afterImpl: (fn: () => Promise<void>) => { s.pending.push(fn); },
  pending: [] as Array<() => Promise<void>>,
  check: vi.fn(),
}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => Promise<void>) => s.afterImpl(fn) }));
vi.mock("@/lib/lagersystem/client", async (orig) => ({ ...(await orig<typeof import("@/lib/lagersystem/client")>()), getLagersystemClient: () => s.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/lagersystem/parts-check-repo", () => ({ createSupabasePartsCheckRepo: () => ({ repo: true }) }));
vi.mock("@/lib/lagersystem/parts-check-run", () => ({ checkTicketParts: s.check }));
vi.mock("@/lib/lagersystem/shortage-mail", () => ({ notifyPartsShortage: vi.fn() }));

import { scheduleTicketPartsCheck } from "../schedule-parts-check";

beforeEach(() => {
  s.client = { getBalances: vi.fn() };
  s.pending = [];
  s.afterImpl = (fn) => { s.pending.push(fn); };
  s.check.mockReset().mockResolvedValue("ok");
});

it("does nothing while the lagersystem is not configured", () => {
  s.client = null;
  scheduleTicketPartsCheck("t1");
  expect(s.pending).toHaveLength(0);
});

it("runs the check after the response, for the new ticket", async () => {
  scheduleTicketPartsCheck("t1");
  expect(s.check).not.toHaveBeenCalled();
  await s.pending[0]();
  expect(s.check).toHaveBeenCalledWith("t1", expect.objectContaining({ repo: { repo: true }, client: s.client }));
});

it("never throws into the customer's request", async () => {
  s.afterImpl = () => { throw new Error("after() outside request scope"); };
  expect(() => scheduleTicketPartsCheck("t1")).not.toThrow();
  s.afterImpl = (fn) => { s.pending.push(fn); };
  s.check.mockRejectedValue(new Error("db down"));
  scheduleTicketPartsCheck("t2");
  await expect(s.pending[0]()).resolves.toBeUndefined();
});
