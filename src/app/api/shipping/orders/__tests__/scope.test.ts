// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { GET } from "../route";

const OWNER = { id: "o", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v", role: "employee", name: "Vejle", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };
const WEBSHOP = { id: "w", role: "employee", name: "Web", email: "w@phonespot.dk", location_id: "L-w", location_slug: "webshop" };

function seed() {
  return createFakeDb({
    locations: [
      { id: "L-v", name: "Vejle", type: "store", slug: "vejle" },
      { id: "L-s", name: "Slagelse", type: "store", slug: "slagelse" },
      { id: "L-w", name: "Webshop", type: "online", slug: "webshop" },
    ],
    orders: [
      { id: "pos-vejle", location_id: "L-v", status: "confirmed", created_at: "1" },
      { id: "pos-slagelse", location_id: "L-s", status: "confirmed", created_at: "2" },
      { id: "web", location_id: null, status: "confirmed", created_at: "3" },
    ],
  });
}

const call = (cookie?: string) =>
  GET(new Request("http://x/api/shipping/orders", { headers: cookie ? { cookie } : {} }) as unknown as NextRequest);
const ids = async (res: Response) => ((await res.json()).orders as { id: string }[]).map((o) => o.id).sort();

beforeEach(() => {
  state.client = seed().client;
  state.staff = null;
  resetLocationCache();
});

describe("GET /api/shipping/orders scope", () => {
  it("401 without staff", async () => {
    expect((await call()).status).toBe(401);
  });

  it("physical-store staff do not see webshop-only orders or other stores' orders", async () => {
    state.staff = VEJLE;
    expect(await ids(await call("ps_store=alle"))).toEqual(["pos-vejle"]);
  });

  it("webshop staff see webshop orders only", async () => {
    state.staff = WEBSHOP;
    expect(await ids(await call())).toEqual(["web"]);
  });

  it("the owner sees all orders, or the switched store", async () => {
    state.staff = OWNER;
    expect(await ids(await call())).toEqual(["pos-slagelse", "pos-vejle", "web"]);
    expect(await ids(await call("ps_store=slagelse"))).toEqual(["pos-slagelse"]);
    expect(await ids(await call("ps_store=webshop"))).toEqual(["web"]);
  });

  it("status counts are scoped too", async () => {
    state.staff = VEJLE;
    const json = await (await call()).json();
    expect(json.counts.confirmed).toBe(1);
  });
});
