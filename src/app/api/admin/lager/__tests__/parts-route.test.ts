// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LagersystemError } from "@/lib/lagersystem/client";

const s = vi.hoisted(() => ({ client: null as null | { searchParts: ReturnType<typeof vi.fn> }, staff: { id: "s", role: "owner", name: "M", email: null } as Record<string, unknown> }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => s.staff }));
vi.mock("@/lib/lagersystem/client", async (orig) => ({ ...(await orig<typeof import("@/lib/lagersystem/client")>()), getLagersystemClient: () => s.client }));
import { GET } from "../parts/route";

const get = (q: string) => GET(new NextRequest(`https://x/api/admin/lager/parts?q=${encodeURIComponent(q)}`));
beforeEach(() => { s.staff = { id: "s", role: "owner", name: "M", email: null }; s.client = { searchParts: vi.fn(async () => [{ shared_sku: "S", name: "Skærm", cost_price_ore: 41500 }]) }; });

it("returns catalog hits for 2+ characters", async () => {
  expect(await (await get("ip")).json()).toEqual({ parts: [{ shared_sku: "S", name: "Skærm", cost_price_ore: 41500 }] });
  expect(s.client!.searchParts).toHaveBeenCalledWith("ip", 20);
});
it("does not call the lagersystem for 0-1 characters", async () => {
  expect(await (await get("i")).json()).toEqual({ parts: [] });
  expect(s.client!.searchParts).not.toHaveBeenCalled();
});
it("maps a lagersystem outage to 502 with Danish text", async () => {
  s.client!.searchParts.mockRejectedValue(new LagersystemError(0, "network", "down"));
  const res = await get("iphone");
  expect(res.status).toBe(502);
  expect((await res.json()).error).toBe("Lagersystemet svarer ikke lige nu. Prøv igen om lidt.");
});
it("404s when the feature is off", async () => {
  s.client = null;
  expect((await get("iphone")).status).toBe(404);
});

it("omits cost_price_ore for non-owner staff", async () => {
  s.staff = { id: "s2", role: "staff", name: "J", email: null, location_slug: "vejle" };
  const { parts } = await (await get("iphone")).json();
  expect(parts).toEqual([{ shared_sku: "S", name: "Skærm" }]);
  expect(parts[0]).not.toHaveProperty("cost_price_ore");
});
