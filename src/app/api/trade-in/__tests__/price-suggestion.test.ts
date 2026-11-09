// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requirePosStaffMock = vi.fn();
vi.mock("@/lib/pos/route-helpers", async (orig) => ({
  ...(await orig<typeof import("@/lib/pos/route-helpers")>()),
  requirePosStaff: (...a: unknown[]) => requirePosStaffMock(...a),
}));

const estimateMock = vi.fn();
vi.mock("@/lib/buyback/estimate", () => ({ estimateBuyback: (...a: unknown[]) => estimateMock(...a) }));
vi.mock("@/lib/buyback/settings", () => ({ loadBuybackSettings: async () => ({ marker: "settings" }) }));

let template: Record<string, unknown> | null = null;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: template, error: null }) }) }),
    }),
  }),
}));

import { POST } from "../price-suggestion/route";

const TID = "00000000-0000-4000-8000-000000000001";
const req = (body: unknown) =>
  new NextRequest("http://localhost/api/trade-in/price-suggestion", {
    method: "POST",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  requirePosStaffMock.mockResolvedValue({ loggedIn: { id: "s1" }, actor: { id: "s1" } });
  template = { brand: "Apple", model: "iPhone 14", category: "iphone", storage_options: ["128 GB"] };
  estimateMock.mockResolvedValue({ status: "ok", aimOfferOre: 250000, floorOfferOre: 200000 });
});

describe("POST /api/trade-in/price-suggestion", () => {
  it("401 without staff", async () => {
    requirePosStaffMock.mockResolvedValue(null);
    const res = await POST(req({ template_id: TID, condition: "God", find_my_off: true }));
    expect(res.status).toBe(401);
  });

  it("400 on invalid body", async () => {
    const res = await POST(req({ template_id: "nope", condition: "God", find_my_off: true }));
    expect(res.status).toBe(400);
  });

  it("404 on unknown template", async () => {
    template = null;
    const res = await POST(req({ template_id: TID, condition: "God", find_my_off: true }));
    expect(res.status).toBe(404);
  });

  it("find_my_off false gives manual (cloudLocked Ja passed to engine)", async () => {
    estimateMock.mockResolvedValue({
      status: "manual", manualReason: "iCloud-låst", aimOfferOre: 0, floorOfferOre: 0,
    });
    const res = await POST(req({ template_id: TID, condition: "God", find_my_off: false }));
    const json = await res.json();
    expect(json.status).toBe("manual");
    expect(json.manual_reason).toBe("iCloud-låst");
    expect(estimateMock.mock.calls[0][2].cloudLocked).toBe("Ja");
  });

  it("returns aim and floor from the engine, with device and condition mapped", async () => {
    const res = await POST(
      req({ template_id: TID, storage: "128 GB", condition: "God", battery_health: 85, find_my_off: true }),
    );
    const json = await res.json();
    expect(json).toMatchObject({ status: "ok", aim_oere: 250000, floor_oere: 200000 });
    expect(json.green_url).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    expect(json.green_url).toContain(encodeURIComponent("iPhone 14"));
    expect(json.note).toBeUndefined();
    const [, device, condition] = estimateMock.mock.calls[0];
    expect(device).toMatchObject({ deviceType: "Telefon", brand: "Apple", model: "iPhone 14", storage: "128 GB", useCustom: false });
    expect(condition).toMatchObject({ cloudLocked: "Nej", battery: "God (80%+)", allWorking: "Ja" });
  });

  it("battery under 80 maps to a battery fault string the engine treats as a fault", async () => {
    await POST(req({ template_id: TID, condition: "God", battery_health: 72, find_my_off: true }));
    expect(estimateMock.mock.calls[0][2].battery).toBe("Okay (60-80%)");
  });

  it("Defekt is always manual, the engine does not price allWorking", async () => {
    const res = await POST(req({ template_id: TID, condition: "Defekt", find_my_off: true }));
    const json = await res.json();
    expect(json.status).toBe("manual");
    expect(json.manual_reason).toBeTruthy();
    expect(estimateMock.mock.calls[0][2].allWorking).toBe("Nej");
  });

  it("Acceptabel adds a note but no fault; Perfekt and God do not", async () => {
    const NOTE = "Prisforslaget tager ikke højde for ridser og slid. Justér selv prisen.";
    const acc = await (await POST(req({ template_id: TID, condition: "Acceptabel", find_my_off: true }))).json();
    expect(acc.status).toBe("ok");
    expect(acc.note).toBe(NOTE);
    expect(estimateMock.mock.calls[0][2]).toMatchObject({ screen: "Perfekt", back: "Perfekt", brokenParts: [] });
    for (const condition of ["Perfekt", "God"]) {
      const json = await (await POST(req({ template_id: TID, condition, find_my_off: true }))).json();
      expect(json.note).toBeUndefined();
    }
  });
});
