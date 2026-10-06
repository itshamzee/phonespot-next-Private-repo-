// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendSms = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/gateway-api/client", () => ({ sendSms: (...a: unknown[]) => sendSms(...a) }));
vi.mock("@/lib/auth/store-scope-server", () => ({ loadLocationIndex: async () => ({ idBySlug: {}, slugById: {} }) }));

import { buildGroupPayload, createRepairCaseGroup } from "../case-create";
import { createCaseGroupSchema } from "../case-schemas";
import type { StaffIdentity } from "@/lib/auth/require-staff";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff: StaffIdentity = {
  id: U(1),
  role: "staff",
  name: "Mette",
  email: null,
  location_id: U(50),
  location_slug: "vejle",
};
const ctx = { staff, scope: "vejle" as const };

const parse = (notify: boolean) =>
  createCaseGroupSchema.parse({
    customer: { type: "privat", name: "Mette", phone: "20123456" },
    devices: [
      { device: { repair_model_id: U(7) }, items: [{ kind: "repair", repair_service_id: U(8) }] },
      {
        device: { repair_model_id: U(9) },
        items: [{ kind: "repair", repair_service_id: U(10) }],
        details: { assigned_to: "Jens" },
      },
    ],
    notify_sms: notify,
  });

const raw = (replayed = false) => ({
  group_id: U(300),
  customer_id: U(200),
  tickets: [
    { ticket_id: U(101), ticket_number: "PS-2026-0101", customer_id: U(200), lines: [{ id: U(1), cost_oere: 5000 }], total_oere: 50000 },
    { ticket_id: U(102), ticket_number: "PS-2026-0102", customer_id: U(200), lines: [], total_oere: 30000 },
  ],
  ticket_ids: [U(101), U(102)],
  total_oere: 80000,
  needs_deposit: false,
  replayed,
  warnings: [],
});

/** Minimal db: rpc + repair_tickets select(...).in(...) + sms_log insert. */
function makeDb(rpcResult: { data: unknown; error: unknown }) {
  const insert = vi.fn(async (_rows: unknown) => ({ error: null }));
  const rows = [
    { id: U(101), ticket_number: "PS-2026-0101", store_id: "vejle", customer_id: U(200), customer_name: "Mette", device_model: "iPhone 13" },
    { id: U(102), ticket_number: "PS-2026-0102", store_id: "vejle", customer_id: U(200), customer_name: "Mette", device_model: "iPad 9" },
  ];
  const db = {
    rpc: vi.fn(async (_name: string, _args: unknown) => rpcResult),
    from: vi.fn((table: string) =>
      table === "sms_log"
        ? { insert }
        : { select: () => ({ in: async (_c: string, ids: string[]) => ({ data: rows.filter((r) => ids.includes(r.id)), error: null }) }) },
    ),
  };
  return { db, insert };
}

beforeEach(() => {
  sendSms.mockReset();
  sendSms.mockResolvedValue({ success: true, messageId: "m-1" });
});

describe("buildGroupPayload", () => {
  it("has staff, store, key, customer and one entry per device", () => {
    const p = buildGroupPayload(parse(false), staff, "vejle", "key-key-key-1");
    expect(p).toMatchObject({ staff_id: U(1), store_id: "vejle", idempotency_key: "key-key-key-1" });
    expect(p.customer.name).toBe("Mette");
    expect(p.devices).toHaveLength(2);
    expect(p.devices[0].device.repair_model_id).toBe(U(7));
    expect(p.devices[0].items).toHaveLength(1);
  });
  it("defaults assigned_to to the staff member but keeps an explicit choice", () => {
    const p = buildGroupPayload(parse(false), staff, "vejle", null);
    expect(p.devices[0].details.assigned_to).toBe("Mette");
    expect(p.devices[1].details.assigned_to).toBe("Jens");
    expect(p.idempotency_key).toBeNull();
  });
});

describe("createRepairCaseGroup", () => {
  it("calls repair_case_create_group with the payload and shapes the response", async () => {
    const { db } = makeDb({ data: raw(), error: null });
    const res = await createRepairCaseGroup(parse(false), ctx, "key-key-key-1", db as never);
    const call = db.rpc.mock.calls[0] as unknown as [string, { p: Record<string, unknown> }];
    expect(call[0]).toBe("repair_case_create_group");
    expect(call[1].p).toMatchObject({ staff_id: U(1), store_id: "vejle", idempotency_key: "key-key-key-1" });
    expect(res.group_id).toBe(U(300));
    expect(res.ticket_ids).toEqual([U(101), U(102)]);
    expect(res.tickets).toHaveLength(2);
    expect(res.tickets[0].kasse_url).toBe(`/admin/kasse?sag=${U(101)}`);
    expect(res.tickets[0].lines[0]).not.toHaveProperty("cost_oere");
    expect(res.total_oere).toBe(80000);
    expect(res.replayed).toBe(false);
  });
  it("sends no SMS when notify_sms is off", async () => {
    const { db } = makeDb({ data: raw(), error: null });
    await createRepairCaseGroup(parse(false), ctx, "key-key-key-1", db as never);
    expect(sendSms).not.toHaveBeenCalled();
  });
  it("sends exactly one SMS for the group and logs it once per ticket", async () => {
    const { db, insert } = makeDb({ data: raw(), error: null });
    const res = await createRepairCaseGroup(parse(true), ctx, "key-key-key-1", db as never);
    expect(sendSms).toHaveBeenCalledTimes(1);
    const [phone, message] = sendSms.mock.calls[0] as [string, string];
    expect(phone).toBe("20123456");
    expect(message).toContain("PS-2026-0101");
    expect(message).toContain("PS-2026-0102");
    expect(insert).toHaveBeenCalledTimes(1);
    const logged = insert.mock.calls[0][0] as { ticket_id: string; status: string }[];
    expect(logged.map((r) => r.ticket_id)).toEqual([U(101), U(102)]);
    expect(logged.every((r) => r.status === "sent")).toBe(true);
    expect(res.warnings).toEqual([]);
  });
  it("sends no SMS when the request is a replay", async () => {
    const { db, insert } = makeDb({ data: raw(true), error: null });
    const res = await createRepairCaseGroup(parse(true), ctx, "key-key-key-1", db as never);
    expect(res.replayed).toBe(true);
    expect(res.ticket_ids).toEqual([U(101), U(102)]);
    expect(sendSms).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
  it("adds a warning, not an error, when the SMS fails", async () => {
    sendSms.mockResolvedValue({ success: false, messageId: null });
    const { db } = makeDb({ data: raw(), error: null });
    const res = await createRepairCaseGroup(parse(true), ctx, "key-key-key-1", db as never);
    expect(res.warnings).toHaveLength(1);
    expect(res.ticket_ids).toHaveLength(2);
  });
  it("maps PS003 case:no_devices and too_many_devices to 400 CaseErrors", async () => {
    const a = makeDb({ data: null, error: { message: "case:no_devices" } });
    await expect(createRepairCaseGroup(parse(false), ctx, "key-key-key-1", a.db as never)).rejects.toMatchObject({
      code: "no_devices",
      status: 400,
    });
    const b = makeDb({ data: null, error: { message: "case:too_many_devices" } });
    await expect(createRepairCaseGroup(parse(false), ctx, "key-key-key-1", b.db as never)).rejects.toMatchObject({
      code: "too_many_devices",
      status: 400,
    });
  });
  it("maps idempotency conflicts to 409 and unknown errors to a plain Error", async () => {
    const a = makeDb({ data: null, error: { message: "case:idempotency_conflict" } });
    await expect(createRepairCaseGroup(parse(false), ctx, "key-key-key-1", a.db as never)).rejects.toMatchObject({ status: 409 });
    const b = makeDb({ data: null, error: { message: "boom" } });
    await expect(createRepairCaseGroup(parse(false), ctx, "key-key-key-1", b.db as never)).rejects.toThrow(/boom/);
  });
  it("requires a store for an owner without one, before any RPC call", async () => {
    const { db } = makeDb({ data: raw(), error: null });
    const owner = { staff: { ...staff, role: "owner" as const, location_slug: null }, scope: "alle" as const };
    await expect(createRepairCaseGroup(parse(false), owner, "key-key-key-1", db as never)).rejects.toMatchObject({ code: "store_required" });
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
