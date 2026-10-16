// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({ denied: false, enabled: true, calls: [] as unknown[][], result: { data: [] as unknown, error: null as null | { message: string } } }));
vi.mock("@/lib/repairs/catalog-manage", async () => {
  const { NextResponse } = await import("next/server");
  return {
    requireCatalogEditor: async () =>
      s.denied ? { response: NextResponse.json({ error: "Kun managere og ejere kan redigere reparationskataloget" }, { status: 403 }) } : { ctx: {} },
  };
});
vi.mock("@/lib/lagersystem/config", () => ({ isLagersystemEnabled: () => s.enabled }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order", "upsert", "delete"]) q[m] = (...a: unknown[]) => { s.calls.push([m, ...a]); return q; };
    q.single = async () => s.result;
    (q as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(s.result);
    return { from: (t: string) => { s.calls.push(["from", t]); return q; } };
  },
}));
import { DELETE, GET, POST } from "../[id]/parts/route";

const ctx = { params: Promise.resolve({ id: "svc-1" }) };
beforeEach(() => { s.denied = false; s.enabled = true; s.calls = []; s.result = { data: [], error: null }; });

it("GET reports the feature as off without touching the database", async () => {
  s.enabled = false;
  expect(await (await GET(new NextRequest("https://x/api/admin/services/svc-1/parts"), ctx)).json()).toEqual({ enabled: false });
  expect(s.calls).toEqual([]);
});

it("POST upserts the link on (service_id, shared_sku)", async () => {
  s.result = { data: { shared_sku: "SCR-1", qty: 1, part_name: "Skærm" }, error: null };
  const res = await POST(new NextRequest("https://x/api/admin/services/svc-1/parts", { method: "POST", body: JSON.stringify({ shared_sku: "SCR-1", part_name: "Skærm", qty: 1 }) }), ctx);
  expect(res.status).toBe(201);
  expect(s.calls).toContainEqual(["upsert", { service_id: "svc-1", shared_sku: "SCR-1", part_name: "Skærm", qty: 1 }, { onConflict: "service_id,shared_sku" }]);
});

it("POST rejects a bad quantity", async () => {
  const res = await POST(new NextRequest("https://x/api/admin/services/svc-1/parts", { method: "POST", body: JSON.stringify({ shared_sku: "S", part_name: "P", qty: 0 }) }), ctx);
  expect(res.status).toBe(400);
});

it("DELETE removes one link by sku", async () => {
  const res = await DELETE(new NextRequest("https://x/api/admin/services/svc-1/parts?sku=SCR-1", { method: "DELETE" }), ctx);
  expect(res.status).toBe(200);
  expect(s.calls).toContainEqual(["eq", "shared_sku", "SCR-1"]);
});

it("is closed to staff who cannot edit the repair catalog", async () => {
  s.denied = true;
  const req = () => new NextRequest("https://x/api/admin/services/svc-1/parts?sku=S", { method: "POST", body: JSON.stringify({ shared_sku: "S", part_name: "P", qty: 1 }) });
  expect((await GET(req(), ctx)).status).toBe(403);
  expect((await POST(req(), ctx)).status).toBe(403);
  expect((await DELETE(req(), ctx)).status).toBe(403);
  expect(s.calls).toEqual([]);
});
