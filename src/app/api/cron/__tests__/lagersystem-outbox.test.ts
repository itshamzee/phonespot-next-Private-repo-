// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({ client: null as unknown, drain: vi.fn(), recheck: vi.fn(), poll: vi.fn(), syncT: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/lagersystem/supabase-repo", () => ({ createSupabaseRepairPartsRepo: () => ({ repo: true }) }));
vi.mock("@/lib/lagersystem/client", () => ({ getLagersystemClient: () => s.client }));
vi.mock("@/lib/lagersystem/outbox", () => ({ drainOutbox: s.drain }));
vi.mock("@/lib/lagersystem/parts-check-repo", () => ({ createSupabasePartsCheckRepo: () => ({ parts: true }) }));
vi.mock("@/lib/lagersystem/parts-check-run", () => ({ recheckUnknownTickets: s.recheck }));
vi.mock("@/lib/lagersystem/shortage-mail", () => ({ notifyPartsShortage: vi.fn() }));
vi.mock("@/lib/lagersystem/ticket-transfers-repo", () => ({ createSupabaseTicketTransfersRepo: () => ({ links: true }) }));
vi.mock("@/lib/lagersystem/ticket-transfers", () => ({ pollRequestedTransfers: s.poll, syncOpenTicketTransfers: s.syncT }));
vi.mock("@/lib/lagersystem/transfer-mail", () => ({ sendTransferRequestMail: vi.fn() }));

import { GET } from "../lagersystem-outbox/route";

const req = (auth?: string) => new NextRequest("https://x/api/cron/lagersystem-outbox", { headers: auth ? { authorization: auth } : {} });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "sekret");
  s.client = { postMovement: vi.fn() };
  s.drain.mockReset().mockResolvedValue({ synced: 2, retry: 1, failed: 0, waiting: 0 });
  s.recheck.mockReset().mockResolvedValue(3);
  s.poll.mockReset().mockResolvedValue(1);
  s.syncT.mockReset().mockResolvedValue(2);
});

it("rejects calls without the cron secret", async () => {
  expect((await GET(req())).status).toBe(401);
  expect((await GET(req("Bearer wrong"))).status).toBe(401);
  expect(s.drain).not.toHaveBeenCalled();
});

it("is a no-op while the lagersystem is not configured", async () => {
  s.client = null;
  const res = await GET(req("Bearer sekret"));
  expect(await res.json()).toEqual({ skipped: "not_configured" });
  expect(s.drain).not.toHaveBeenCalled();
});

it("drains the outbox and reports the outcome", async () => {
  const res = await GET(req("Bearer sekret"));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ synced: 2, retry: 1, failed: 0, waiting: 0, rechecked: 3, transfer_mails: 1, ticket_transfers_synced: 2 });
  expect(s.drain).toHaveBeenCalledWith(expect.objectContaining({ repo: { repo: true }, client: s.client, limit: 50 }));
});

it("still reports the outbox when the recheck fails", async () => {
  s.recheck.mockRejectedValue(new Error("db"));
  const res = await GET(req("Bearer sekret"));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ synced: 2, rechecked: null });
});

it("reports 500 when the database fails", async () => {
  s.drain.mockRejectedValue(new Error("db down"));
  expect((await GET(req("Bearer sekret"))).status).toBe(500);
});

it("fails closed when CRON_SECRET is unset", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await GET(req("Bearer undefined"))).status).toBe(401);
  expect((await GET(req("Bearer "))).status).toBe(401);
  expect(s.drain).not.toHaveBeenCalled();
});

it("polls requests and syncs ticket transfers, each failure isolated", async () => {
  s.poll.mockRejectedValue(new Error("lager down"));
  const res = await GET(req("Bearer sekret"));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ synced: 2, transfer_mails: null, ticket_transfers_synced: 2 });
  expect(s.poll).toHaveBeenCalledWith(expect.objectContaining({ client: s.client, links: { links: true } }));
});

it("still polls requests when the ticket sync fails", async () => {
  s.syncT.mockRejectedValue(new Error("db"));
  const res = await GET(req("Bearer sekret"));
  expect(await res.json()).toMatchObject({ transfer_mails: 1, ticket_transfers_synced: null });
});
