// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Staff = { id: string; role: string; name: string; email: string; location_id: string | null; location_slug: string | null; permissions: string[] };

const m = vi.hoisted(() => ({
  staff: null as Staff | null,
  loadNowBlock: vi.fn(async () => ({ updatedAt: "2026-11-18T13:32:00.000Z", today: { revenue: 1 }, rows: [] })),
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => m.staff }));
vi.mock("@/lib/admin/statistik/load", () => ({ loadNowBlock: m.loadNowBlock }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));

import { GET } from "../route";

const employee = (permissions: string[] = []): Staff => ({
  id: "s1",
  role: "employee",
  name: "Mads",
  email: "m@x.dk",
  location_id: "L1",
  location_slug: "vejle",
  permissions,
});
const owner: Staff = { id: "o1", role: "owner", name: "Ejer", email: "e@x.dk", location_id: null, location_slug: null, permissions: [] };

const call = (query = "", cookie?: string) =>
  GET(new Request(`http://localhost/api/admin/statistik/now${query}`, { headers: cookie ? { cookie } : {} }));

beforeEach(() => {
  m.staff = null;
  m.loadNowBlock.mockClear();
});

describe("GET /api/admin/statistik/now", () => {
  it("401 uden personale", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(m.loadNowBlock).not.toHaveBeenCalled();
  });

  it("403 for medarbejder uden se_statistik", async () => {
    m.staff = employee();
    const res = await call("?butik=alle");
    expect(res.status).toBe(403);
    expect(m.loadNowBlock).not.toHaveBeenCalled();
  });

  it("403 for praktikant, også med se_statistik", async () => {
    m.staff = { ...employee(["se_statistik"]), role: "intern" };
    const res = await call();
    expect(res.status).toBe(403);
    expect(m.loadNowBlock).not.toHaveBeenCalled();
  });

  it("200 for medarbejder med se_statistik, altid egen butik og ingen ejer-adgang", async () => {
    m.staff = employee(["se_statistik"]);
    const res = await call("?butik=alle", "ps_store=slagelse");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(m.loadNowBlock).toHaveBeenCalledWith({ isOwner: false, scope: "vejle", canExport: false });
    expect((await res.json()).updatedAt).toBe("2026-11-18T13:32:00.000Z");
  });

  it("ejeren får den ønskede butik, ellers cookien", async () => {
    m.staff = owner;
    expect((await call("?butik=slagelse", "ps_store=vejle")).status).toBe(200);
    expect(m.loadNowBlock).toHaveBeenLastCalledWith({ isOwner: true, scope: "slagelse", canExport: true });
    await call("", "ps_store=vejle");
    expect(m.loadNowBlock).toHaveBeenLastCalledWith({ isOwner: true, scope: "vejle", canExport: true });
  });

  it("500 når indlæsningen fejler", async () => {
    m.staff = owner;
    m.loadNowBlock.mockRejectedValueOnce(new Error("db"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call()).status).toBe(500);
    spy.mockRestore();
  });
});
