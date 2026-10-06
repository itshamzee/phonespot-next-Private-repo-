// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const createRepairCase = vi.fn();
const createRepairCaseGroup = vi.fn();
let ctx: unknown = { staff: { id: "s", role: "staff", name: "M", location_slug: "vejle" }, scope: "vejle" };

vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/auth/store-scope-server", () => ({
  requireStaffScope: async () => ctx,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: "x" }), { status: 401 }),
}));
vi.mock("@/lib/repairs/case-query", () => ({ buildCaseList: vi.fn(), fetchScopedTickets: vi.fn(), parseListParams: vi.fn() }));
vi.mock("@/lib/repairs/case-create", () => ({
  createRepairCase: (...a: unknown[]) => createRepairCase(...a),
  createRepairCaseGroup: (...a: unknown[]) => createRepairCaseGroup(...a),
}));

import { POST } from "../route";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const body = {
  customer: { type: "privat", name: "Mette", phone: "20123456" },
  device: { repair_model_id: U(7) },
  items: [{ kind: "repair", repair_service_id: U(8) }],
};
const call = (b: unknown, key: string | null = "key-key-key-1") =>
  POST(
    new Request("http://localhost/api/admin/repairs", {
      method: "POST",
      headers: key ? { "Idempotency-Key": key, "Content-Type": "application/json" } : {},
      body: JSON.stringify(b),
    }),
  );

describe("POST /api/admin/repairs", () => {
  beforeEach(() => {
    createRepairCase.mockReset();
    createRepairCaseGroup.mockReset();
    ctx = { staff: { id: "s", role: "staff", name: "M", location_slug: "vejle" }, scope: "vejle" };
  });
  it("401 for non-staff", async () => {
    ctx = null;
    expect((await call(body)).status).toBe(401);
  });
  it("requires the Idempotency-Key header", async () => {
    expect((await call(body, null)).status).toBe(400);
    expect(createRepairCase).not.toHaveBeenCalled();
  });
  it("400 for an invalid body", async () => {
    expect((await call({ ...body, items: [] })).status).toBe(400);
  });
  it("201 for a new case, 200 for a replay; the key is passed on", async () => {
    createRepairCase.mockResolvedValueOnce({ ticket_id: U(1), replayed: false });
    expect((await call(body)).status).toBe(201);
    expect(createRepairCase.mock.calls[0][2]).toBe("key-key-key-1");
    createRepairCase.mockResolvedValueOnce({ ticket_id: U(1), replayed: true });
    expect((await call(body)).status).toBe(200);
  });
  it("maps business errors", async () => {
    const { CaseError } = await import("@/lib/repairs/case-errors");
    createRepairCase.mockRejectedValueOnce(new CaseError("device_unavailable", "Enheden er optaget", 409));
    const res = await call(body);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("device_unavailable");
  });
});

describe("POST /api/admin/repairs with several devices", () => {
  const device = (n: number) => ({
    device: { repair_model_id: U(n) },
    items: [{ kind: "repair", repair_service_id: U(n + 100) }],
  });
  const groupBody = (n: number) => ({
    customer: body.customer,
    devices: Array.from({ length: n }, (_, i) => device(i + 1)),
    notify_sms: true,
  });
  const KEY = "3f2b8c1e-5d4a-4c1b-9a77-0123456789ab";

  beforeEach(() => {
    createRepairCase.mockReset();
    createRepairCaseGroup.mockReset();
    ctx = { staff: { id: "s", role: "staff", name: "M", location_slug: "vejle" }, scope: "vejle" };
  });

  it("calls createRepairCaseGroup and leaves the single path untouched", async () => {
    createRepairCaseGroup.mockResolvedValueOnce({ ticket_ids: [U(1), U(2)], replayed: false });
    const res = await call(groupBody(2), KEY);
    expect(res.status).toBe(201);
    expect(createRepairCaseGroup).toHaveBeenCalledTimes(1);
    expect(createRepairCase).not.toHaveBeenCalled();
    const [parsed, passedCtx, key] = createRepairCaseGroup.mock.calls[0];
    expect(parsed.devices).toHaveLength(2);
    expect(parsed.notify_sms).toBe(true);
    expect(passedCtx).toBe(ctx);
    expect(key).toBe(KEY);
  });
  it("200 for a replayed group", async () => {
    createRepairCaseGroup.mockResolvedValueOnce({ ticket_ids: [U(1)], replayed: true });
    expect((await call(groupBody(1), KEY)).status).toBe(200);
  });
  it("accepts exactly 10 devices and rejects 11 with 400", async () => {
    createRepairCaseGroup.mockResolvedValueOnce({ ticket_ids: [], replayed: false });
    expect((await call(groupBody(10), KEY)).status).toBe(201);
    createRepairCaseGroup.mockClear();
    const res = await call(groupBody(11), KEY);
    expect(res.status).toBe(400);
    expect(createRepairCaseGroup).not.toHaveBeenCalled();
  });
  it("rejects an empty device list and a device without items", async () => {
    expect((await call(groupBody(0), KEY)).status).toBe(400);
    const bad = { customer: body.customer, devices: [{ device: { repair_model_id: U(1) }, items: [] }] };
    expect((await call(bad, KEY)).status).toBe(400);
    expect(createRepairCaseGroup).not.toHaveBeenCalled();
  });
  it("requires a valid Idempotency-Key header", async () => {
    expect((await call(groupBody(2), null)).status).toBe(400);
    expect((await call(groupBody(2), "bad key!")).status).toBe(400);
    expect(createRepairCaseGroup).not.toHaveBeenCalled();
  });
  it("401 for non-staff", async () => {
    ctx = null;
    expect((await call(groupBody(2), KEY)).status).toBe(401);
  });
  it("maps business errors from the group call", async () => {
    const { CaseError } = await import("@/lib/repairs/case-errors");
    createRepairCaseGroup.mockRejectedValueOnce(new CaseError("device_unavailable", "Optaget", 409));
    const res = await call(groupBody(2), KEY);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("device_unavailable");
  });
});
