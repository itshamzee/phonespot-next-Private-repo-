// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({
  client: null as null | Record<string, ReturnType<typeof vi.fn>>,
  staff: null as unknown,
}));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => s.staff }));
vi.mock("@/lib/lagersystem/client", async (orig) => ({ ...(await orig<typeof import("@/lib/lagersystem/client")>()), getLagersystemClient: () => s.client }));
import { GET as getLocations } from "../locations/route";
import { GET as getBalances } from "../balances/route";

const asStaff = (role: string, slug: string | null) => { s.staff = { id: "s", role, name: "J", email: null, location_id: null, location_slug: slug }; };
const bal = (qs: string) => getBalances(new NextRequest(`https://x/api/admin/lager/balances${qs}`));
const loc = () => getLocations(new NextRequest("https://x/api/admin/lager/locations"));

beforeEach(() => {
  asStaff("owner", null);
  s.client = {
    listLocations: vi.fn(async () => [
      { code: "phonespot-slagelse", name: "Slagelse", type: "STORE", company: null },
      { code: "fixon-van-1", name: "Van 1", type: "STORE", company: null },
      { code: "vejle-hub", name: "Hub", type: "HUB", company: null },
    ]),
    getBalances: vi.fn(async (l: string) => ({ location: l, as_of: "t", balances: [{ shared_sku: "A", qty: 1, updated_at: "t" }] })),
    getPart: vi.fn(async (sku: string) => ({ shared_sku: sku, name: "Del A" })),
    searchParts: vi.fn(),
  };
});

it("owner sees PhoneSpot locations by name, in fixed order, never the API name", async () => {
  expect((await (await loc()).json()).locations).toEqual([
    { code: "vejle-hub", name: "Hovedlager Vejle" },
    { code: "phonespot-slagelse", name: "Slagelse" },
  ]);
});

it("staff only see their own store location", async () => {
  asStaff("staff", "slagelse");
  expect((await (await loc()).json()).locations).toEqual([{ code: "phonespot-slagelse", name: "Slagelse" }]);
  asStaff("staff", "vejle");
  expect((await (await loc()).json()).locations).toEqual([{ code: "vejle-hub", name: "Hovedlager Vejle" }]);
  asStaff("staff", null);
  expect((await (await loc()).json()).locations).toEqual([]);
});

it("balances: 400 for unknown location, 403 for another store, 200 for own and for owner", async () => {
  expect((await bal("?location=fixon-van-1")).status).toBe(400);
  asStaff("staff", "slagelse");
  expect((await bal("?location=vejle-hub")).status).toBe(403);
  expect((await bal("?location=phonespot-slagelse")).status).toBe(200);
  asStaff("owner", null);
  const res = await bal("?location=vejle-hub");
  expect(res.status).toBe(200);
  expect((await res.json()).rows[0]).toMatchObject({ shared_sku: "A", name: "Del A", qty: 1 });
});

it("404 while off, 401 without staff", async () => {
  s.client = null;
  expect((await bal("?location=vejle-hub")).status).toBe(404);
  expect((await loc()).status).toBe(404);
  s.staff = null;
  expect((await bal("?location=vejle-hub")).status).toBe(401);
});
