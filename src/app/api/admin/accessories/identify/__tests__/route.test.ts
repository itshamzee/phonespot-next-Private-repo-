// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  staff: { id: "o", role: "owner" } as null | Record<string, unknown>,
  parse: vi.fn(),
  find: vi.fn(),
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/accessory-intake/candidates", () => ({ findCandidates: state.find }));
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    messages = { parse: state.parse };
  }
  return { default: Anthropic };
});
vi.mock("@anthropic-ai/sdk/helpers/zod", () => ({ zodOutputFormat: () => ({}) }));

import { POST } from "../route";

const req = (body: unknown) =>
  new Request("http://x/api/admin/accessories/identify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const parsed = {
  productType: "cover", brand: "Apple", isGenuineBrandProduct: true, models: ["iphone-13", "iphone-99"],
  unknownModelText: null, modelConfidence: "high", caseType: "Slim", color: "Grøn", features: [],
  titleDa: "Apple Silicone Case til iPhone 13, grøn", descriptionDa: "Ægte Apple-cover.", supplierCodes: ["RIX02646"],
  readText: "iPhone 13 Silicone Case",
};

beforeEach(() => {
  state.staff = { id: "o", role: "owner" };
  state.parse.mockReset();
  state.find.mockReset().mockResolvedValue({ exact: null, candidates: [] });
  process.env.ANTHROPIC_API_KEY = "test";
});

describe("POST /api/admin/accessories/identify", () => {
  it("401 uden staff", async () => {
    state.staff = null;
    expect((await POST(req({ image: "abc" }))).status).toBe(401);
  });

  it("400 uden image", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it("returnerer renset identified og priceKr 99 for ægte Apple-cover", async () => {
    state.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: parsed });
    const res = await POST(req({ image: "abc" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.identified.models).toEqual(["iphone-13"]);
    expect(data.priceKr).toBe(99);
    expect(state.find).toHaveBeenCalledOnce();
  });

  it("aiError og identified null når Anthropic kaster, status 200", async () => {
    state.parse.mockRejectedValue(new Error("boom"));
    const res = await POST(req({ image: "abc" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.identified).toBeNull();
    expect(data.aiError).toBeTruthy();
  });

  it("aiError uden API-nøgle", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const data = await (await POST(req({ image: "abc" }))).json();
    expect(data.aiError).toMatch(/ikke sat op/);
    expect(state.parse).not.toHaveBeenCalled();
  });

  it("sender exact videre fra findCandidates", async () => {
    state.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: parsed });
    state.find.mockResolvedValue({ exact: { id: "rix" }, candidates: [] });
    const data = await (await POST(req({ image: "abc" }))).json();
    expect(data.exact).toEqual({ id: "rix" });
  });
});
