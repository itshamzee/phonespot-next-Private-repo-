// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ role: "employee", permissions: [] as string[] }));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => null }));
vi.mock("@/lib/auth/store-scope-server", () => ({
  requireStaffScope: async () => ({
    staff: { id: "s1", name: "Mads", email: "m@x.dk", role: m.role, permissions: m.permissions, location_id: "L1" },
    scope: "vejle",
  }),
  unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
}));
vi.mock("@/lib/legal-entity-server", () => ({ legalEntityForLocation: async () => null }));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  }),
}));

import { GET } from "../route";

describe("GET /api/admin/me permissions", () => {
  it("employee uden ekstra: ingen eksportere; ingen pin-data", async () => {
    m.role = "employee";
    m.permissions = [];
    const body = await (await GET(new Request("http://localhost/api/admin/me"))).json();
    expect(body.permissions).not.toContain("eksportere");
    expect(body.permissions).toContain("lave_retur");
    expect(JSON.stringify(body)).not.toContain("pin_hash");
  });

  it("individuel tilladelse og ejer giver eksportere", async () => {
    m.role = "employee";
    m.permissions = ["eksportere"];
    expect((await (await GET(new Request("http://localhost/api/admin/me"))).json()).permissions).toContain("eksportere");
    m.role = "owner";
    m.permissions = [];
    expect((await (await GET(new Request("http://localhost/api/admin/me"))).json()).permissions).toContain("eksportere");
  });
});
