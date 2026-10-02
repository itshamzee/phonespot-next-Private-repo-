// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { GET, PATCH } from "../route";
import { GET as getMe } from "../../me/route";

const OWNER = { id: "o", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v", role: "manager", name: "Vejle", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };

function seed() {
  return createFakeDb({
    locations: [
      { id: "L-v", name: "Vejle", type: "store", slug: "vejle" },
      { id: "L-s", name: "Slagelse", type: "store", slug: "slagelse" },
      { id: "L-w", name: "Webshop", type: "online", slug: "webshop" },
    ],
    staff: [
      { id: "o", name: "Ejer", email: "o@phonespot.dk", role: "owner", is_active: true, location_id: null },
      { id: "v", name: "Vejle", email: "v@phonespot.dk", role: "manager", is_active: true, location_id: "L-v" },
      { id: "n", name: "Ny", email: "n@phonespot.dk", role: "employee", is_active: true, location_id: null },
    ],
  });
}

const req = (method: string, body?: unknown, cookie?: string) =>
  new Request("http://x/api/admin/staff", {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as NextRequest;

let db: ReturnType<typeof seed>["db"];
beforeEach(() => {
  const s = seed();
  db = s.db;
  state.client = s.client;
  state.staff = null;
  resetLocationCache();
});

describe("/api/admin/staff", () => {
  it("401 without staff, 403 for non-owners (also managers)", async () => {
    expect((await GET(req("GET"))).status).toBe(401);
    expect((await PATCH(req("PATCH", { id: "n", location_slug: "vejle" }))).status).toBe(401);
    state.staff = VEJLE;
    expect((await GET(req("GET"))).status).toBe(403);
    expect((await PATCH(req("PATCH", { id: "n", location_slug: "vejle" }))).status).toBe(403);
    expect(db.tables.staff.find((s) => s.id === "n")?.location_id).toBeNull();
  });

  it("owner lists staff with their store slug and the available stores", async () => {
    state.staff = OWNER;
    const json = await (await GET(req("GET"))).json();
    expect(json.staff.find((s: { id: string }) => s.id === "v").location_slug).toBe("vejle");
    expect(json.staff.find((s: { id: string }) => s.id === "n").location_slug).toBeNull();
    expect(json.stores.map((s: { slug: string }) => s.slug)).toEqual(["vejle", "slagelse", "webshop"]);
  });

  it("owner assigns a store, and can clear it again", async () => {
    state.staff = OWNER;
    expect((await PATCH(req("PATCH", { id: "n", location_slug: "slagelse" }))).status).toBe(200);
    expect(db.tables.staff.find((s) => s.id === "n")?.location_id).toBe("L-s");
    expect((await PATCH(req("PATCH", { id: "n", location_slug: null }))).status).toBe(200);
    expect(db.tables.staff.find((s) => s.id === "n")?.location_id).toBeNull();
  });

  it("rejects unknown stores, unknown staff and attempts to attach the owner to a store", async () => {
    state.staff = OWNER;
    expect((await PATCH(req("PATCH", { id: "n", location_slug: "kbh" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", { id: "missing", location_slug: "vejle" }))).status).toBe(404);
    expect((await PATCH(req("PATCH", { id: "o", location_slug: "vejle" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", {}))).status).toBe(400);
    expect(db.tables.staff.find((s) => s.id === "o")?.location_id).toBeNull();
  });
});

describe("GET /api/admin/me", () => {
  it("owner: the scope follows the cookie", async () => {
    state.staff = OWNER;
    const json = await (await getMe(req("GET", undefined, "ps_store=vejle"))).json();
    expect(json).toMatchObject({ isOwner: true, scope: "vejle", ownSlug: null });
  });

  it("staff: always their own store, whatever the cookie says", async () => {
    state.staff = VEJLE;
    const json = await (await getMe(req("GET", undefined, "ps_store=slagelse"))).json();
    expect(json).toMatchObject({ isOwner: false, scope: "vejle", ownSlug: "vejle" });
  });

  it("401 without staff", async () => {
    expect((await getMe(req("GET"))).status).toBe(401);
  });
});
