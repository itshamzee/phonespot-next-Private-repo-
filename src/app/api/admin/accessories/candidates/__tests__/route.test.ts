// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ staff: { id: "o" } as null | Record<string, unknown>, find: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/accessory-intake/candidates", () => ({ findCandidates: state.find }));

import { POST } from "../route";

const req = (body: unknown) =>
  new Request("http://x/api/admin/accessories/candidates", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  state.staff = { id: "o" };
  state.find.mockReset().mockResolvedValue({ exact: null, candidates: [{ id: "c1" }] });
});

describe("POST /api/admin/accessories/candidates", () => {
  it("401 uden staff", async () => {
    state.staff = null;
    expect((await POST(req({ productType: "cover", models: ["iphone-13"] }))).status).toBe(401);
  });

  it("filtrerer ukendte modeller fra og returnerer kandidater", async () => {
    const res = await POST(req({ productType: "cover", brand: "Apple", caseType: "Slim", color: "Sort", models: ["iphone-13", "iphone-99"] }));
    expect(res.status).toBe(200);
    expect((await res.json()).candidates).toEqual([{ id: "c1" }]);
    expect(state.find.mock.calls[0][1].models).toEqual(["iphone-13"]);
    expect(state.find.mock.calls[0][1].supplierCodes).toEqual([]);
  });

  it("tom liste uden gyldige modeller", async () => {
    const data = await (await POST(req({ productType: "cover", models: ["x"] }))).json();
    expect(data.candidates).toEqual([]);
    expect(state.find).not.toHaveBeenCalled();
  });
});
