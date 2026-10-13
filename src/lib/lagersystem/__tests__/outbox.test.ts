// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { LagersystemError } from "../client";
import type { MovementInput, MovementResult } from "../api-types";
import { drainOutbox, FAIL_AFTER_MS, sendRepairPart } from "../outbox";
import type { NewRepairPartRow } from "../types";
import { memoryRepo } from "./memory-repo";

const T0 = new Date("2026-10-13T10:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

const ok = (replayed = false) => vi.fn(async (input: MovementInput): Promise<MovementResult> => ({
  movement: { id: `mv:${input.idempotency_key}`, location: input.location, shared_sku: input.shared_sku, type: input.type, qty: input.type === "TAKE" ? -input.qty : input.qty, balance_after: 3, company: "phonespot", reference: input.reference ?? null, actor_label: input.actor_label, created_at: T0.toISOString() },
  replayed,
}));
const failing = (err: unknown) => vi.fn(async () => { throw err; });

const take = (id = "t1"): NewRepairPartRow => ({
  id, ticket_id: "ticket-1", movement_type: "TAKE", reverses_id: null, shared_sku: "SCR-IP13-OLED", part_name: "Skærm iPhone 13",
  qty: 1, location_code: "vejle-hub", cost_at_time_ore: 41500, idempotency_key: `repair:ticket-1:take:${id}`,
  actor_label: "PhoneSpot-admin: Maria", reference: "PS-2026-0001", created_by: "staff-1",
});
const ret = (takeId = "t1", id = "r1"): NewRepairPartRow => ({
  ...take(id), movement_type: "RETURN", reverses_id: takeId, idempotency_key: `repair:ticket-1:return:${takeId}`,
});

describe("sendRepairPart", () => {
  it("posts the exact movement and marks the row synced", async () => {
    const repo = memoryRepo();
    const row = (await repo.insert(take(), T0)) as Exclude<Awaited<ReturnType<typeof repo.insert>>, "duplicate">;
    const client = { postMovement: ok() };
    expect(await sendRepairPart(row, { repo, client, now: at(1000) })).toBe("synced");
    expect(client.postMovement).toHaveBeenCalledWith({
      idempotency_key: "repair:ticket-1:take:t1", location: "vejle-hub", shared_sku: "SCR-IP13-OLED",
      type: "TAKE", qty: 1, actor_label: "PhoneSpot-admin: Maria", reference: "PS-2026-0001",
    });
    expect(repo.rows[0]).toMatchObject({ status: "synced", movement_id: "mv:repair:ticket-1:take:t1" });
  });

  it("replayed response marks the row synced (after() and cron raced)", async () => {
    const repo = memoryRepo();
    const row = (await repo.insert(take(), T0)) as never;
    expect(await sendRepairPart(row, { repo, client: { postMovement: ok(true) }, now: T0 })).toBe("synced");
    expect(repo.rows[0].status).toBe("synced");
  });

  it("network error keeps the row pending and counts the attempt", async () => {
    const repo = memoryRepo();
    const row = (await repo.insert(take(), T0)) as never;
    const outcome = await sendRepairPart(row, { repo, client: { postMovement: failing(new LagersystemError(0, "network", "down")) }, now: at(1000) });
    expect(outcome).toBe("retry");
    expect(repo.rows[0]).toMatchObject({ status: "pending", attempts: 1, last_error: "network (0): down" });
  });

  it("401 fails immediately without retrying", async () => {
    const repo = memoryRepo();
    const row = (await repo.insert(take(), T0)) as never;
    const outcome = await sendRepairPart(row, { repo, client: { postMovement: failing(new LagersystemError(401, "unauthorized", "bad key")) }, now: at(1000) });
    expect(outcome).toBe("failed");
    expect(repo.rows[0]).toMatchObject({ status: "failed", last_error: "unauthorized (401): bad key" });
  });

  it("a retryable error after 24 hours turns into failed", async () => {
    const repo = memoryRepo();
    const row = (await repo.insert(take(), T0)) as never;
    const outcome = await sendRepairPart(row, { repo, client: { postMovement: failing(new LagersystemError(503, "internal", "x")) }, now: at(FAIL_AFTER_MS) });
    expect(outcome).toBe("failed");
  });

  it("a RETURN waits while its TAKE is still pending", async () => {
    const repo = memoryRepo();
    await repo.insert(take(), T0);
    const r = (await repo.insert(ret(), at(1))) as never;
    const client = { postMovement: ok() };
    expect(await sendRepairPart(r, { repo, client, now: at(2) })).toBe("waiting");
    expect(client.postMovement).not.toHaveBeenCalled();
  });

  it("a RETURN fails when its TAKE failed", async () => {
    const repo = memoryRepo();
    await repo.insert(take(), T0);
    await repo.markFailed("t1", "x", T0);
    const r = (await repo.insert(ret(), at(1))) as never;
    expect(await sendRepairPart(r, { repo, client: { postMovement: ok() }, now: at(2) })).toBe("failed");
    expect(repo.rows[1].last_error).toMatch(/aldrig bogført/);
  });
});

describe("drainOutbox", () => {
  it("sends TAKE before RETURN in one pass", async () => {
    const repo = memoryRepo();
    await repo.insert(take(), T0);
    await repo.insert(ret(), at(1));
    const client = { postMovement: ok() };
    const report = await drainOutbox({ repo, client, now: () => at(60_000) });
    expect(report).toEqual({ synced: 2, retry: 0, failed: 0, waiting: 0 });
    expect(client.postMovement.mock.calls.map((c) => c[0].type)).toEqual(["TAKE", "RETURN"]);
  });

  it("stops at the first network error so the cron's later steps still run", async () => {
    const repo = memoryRepo();
    await repo.insert(take("a"), T0);
    await repo.insert(take("b"), at(1));
    await repo.insert(take("c"), at(2));
    const client = { postMovement: failing(new LagersystemError(0, "network", "timeout")) };
    expect(await drainOutbox({ repo, client, now: () => at(60_000) })).toEqual({ synced: 0, retry: 1, failed: 0, waiting: 0 });
    expect(client.postMovement).toHaveBeenCalledTimes(1);
  });

  it("keeps going after an upstream (non-network) error", async () => {
    const repo = memoryRepo();
    await repo.insert(take("a"), T0);
    await repo.insert(take("b"), at(1));
    const client = { postMovement: failing(new LagersystemError(503, "bad_response", "busy")) };
    await drainOutbox({ repo, client, now: () => at(60_000) });
    expect(client.postMovement).toHaveBeenCalledTimes(2);
  });

  it("skips rows attempted in the last 30 seconds", async () => {
    const repo = memoryRepo();
    const row = (await repo.insert(take(), T0)) as never;
    await repo.markAttemptFailed(row, "x", at(50_000));
    const client = { postMovement: ok() };
    expect(await drainOutbox({ repo, client, now: () => at(60_000) })).toEqual({ synced: 0, retry: 0, failed: 0, waiting: 0 });
    expect(await drainOutbox({ repo, client, now: () => at(90_000) })).toEqual({ synced: 1, retry: 0, failed: 0, waiting: 0 });
  });
});

describe("pending-only guard", () => {
  it("a late sender cannot flip a synced or failed row back", async () => {
    const repo = memoryRepo();
    const row = (await repo.insert(take(), T0)) as never;
    await repo.markSynced("t1", "m1", at(1));
    await repo.markAttemptFailed(row, "late", at(2));
    await repo.markFailed("t1", "late", at(3));
    expect(repo.rows[0]).toMatchObject({ status: "synced", movement_id: "m1", last_error: null, attempts: 0 });

    const repo2 = memoryRepo();
    await repo2.insert(take(), T0);
    await repo2.markFailed("t1", "x", at(1));
    await repo2.markSynced("t1", "m2", at(2));
    expect(repo2.rows[0]).toMatchObject({ status: "failed", movement_id: null });
  });
});

describe("RETURN never outruns its TAKE", () => {
  it("waits while the TAKE is pending in back-off, even if the RETURN is due", async () => {
    const repo = memoryRepo();
    const row = (await repo.insert(take(), T0)) as never;
    await repo.markAttemptFailed(row, "x", at(50_000));
    await repo.insert(ret(), at(1));
    const client = { postMovement: ok() };
    const report = await drainOutbox({ repo, client, now: () => at(60_000) });
    expect(report).toEqual({ synced: 0, retry: 0, failed: 0, waiting: 1 });
    expect(client.postMovement).not.toHaveBeenCalled();
  });

  it("fails the RETURN with a Danish reason when the TAKE failed, and never sends it", async () => {
    const repo = memoryRepo();
    await repo.insert(take(), T0);
    await repo.insert(ret(), at(1));
    await repo.markFailed("t1", "x", at(2));
    const client = { postMovement: ok() };
    expect(await drainOutbox({ repo, client, now: () => at(60_000) })).toMatchObject({ failed: 1, synced: 0 });
    expect(repo.rows[1]).toMatchObject({ status: "failed", last_error: "Udtaget blev aldrig bogført – intet at returnere" });
    expect(client.postMovement).not.toHaveBeenCalled();
  });
});
