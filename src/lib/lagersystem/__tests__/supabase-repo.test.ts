// @vitest-environment node
import { expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRepairPartsRepo } from "../supabase-repo";

function fakeSb(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const calls: Array<[string, ...unknown[]]> = [];
  const q: Record<string, (...a: unknown[]) => unknown> = {};
  for (const m of ["select", "eq", "is", "or", "order", "limit", "update", "insert"]) {
    q[m] = (...a: unknown[]) => { calls.push([m, ...a]); return q; };
  }
  q.single = async () => result;
  q.maybeSingle = async () => result;
  (q as unknown as PromiseLike<unknown>).then = ((resolve: (v: unknown) => void) => resolve(result)) as never;
  return { sb: { from: (t: string) => { calls.push(["from", t]); return q; } } as unknown as SupabaseClient, calls };
}

it("maps a unique violation on insert to 'duplicate'", async () => {
  const { sb } = fakeSb({ data: null, error: { code: "23505", message: "dup" } });
  const repo = createSupabaseRepairPartsRepo(sb);
  const res = await repo.insert({ id: "x", ticket_id: "t", movement_type: "TAKE", reverses_id: null, shared_sku: "S", part_name: "P", qty: 1, location_code: "vejle-hub", cost_at_time_ore: null, idempotency_key: "k", actor_label: "a", reference: "r", created_by: null }, new Date());
  expect(res).toBe("duplicate");
});

it("listDue asks for pending rows not attempted in the last 30s, oldest first", async () => {
  const { sb, calls } = fakeSb({ data: [], error: null });
  await createSupabaseRepairPartsRepo(sb).listDue(50, new Date("2026-10-13T10:00:30.000Z"));
  expect(calls).toContainEqual(["eq", "status", "pending"]);
  expect(calls).toContainEqual(["or", "last_attempt_at.is.null,last_attempt_at.lt.2026-10-13T10:00:00.000Z"]);
  expect(calls).toContainEqual(["order", "created_at", { ascending: true }]);
  expect(calls).toContainEqual(["limit", 50]);
});

it("throws on other database errors so callers fail loudly", async () => {
  const { sb } = fakeSb({ data: null, error: { message: "boom" } });
  await expect(createSupabaseRepairPartsRepo(sb).getPart("x")).rejects.toThrow("repair_ticket_parts.getPart: boom");
});

it("markSynced only applies while the row is pending", async () => {
  const { sb, calls } = fakeSb({ data: null, error: null });
  await createSupabaseRepairPartsRepo(sb).markSynced("x", "m", new Date());
  expect(calls).toContainEqual(["eq", "status", "pending"]);
});

it("voidFailedPart is guarded on failed status and unvoided", async () => {
  const { sb, calls } = fakeSb({ data: [{ id: "x" }], error: null });
  expect(await createSupabaseRepairPartsRepo(sb).voidFailedPart("x", new Date())).toBe(true);
  expect(calls).toContainEqual(["eq", "status", "failed"]);
  expect(calls).toContainEqual(["is", "voided_at", null]);
});

it("resetForRetry zeroes attempts", async () => {
  const { sb, calls } = fakeSb({ data: null, error: null });
  await createSupabaseRepairPartsRepo(sb).resetForRetry("x", new Date());
  expect(calls.find((c) => c[0] === "update")?.[1]).toMatchObject({ attempts: 0 });
});
