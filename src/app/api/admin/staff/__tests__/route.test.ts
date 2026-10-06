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
import { GET, PATCH, POST } from "../route";
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

const authCalls: Array<{ op: string; args: unknown[] }> = [];
const fakeAuthAdmin = {
  createUser: async (attrs: { email: string }) => {
    authCalls.push({ op: "create", args: [attrs] });
    if (attrs.email === "taken@phonespot.dk") return { data: { user: null }, error: { message: "A user with this email address has already been registered" } };
    return { data: { user: { id: `auth-${attrs.email}` } }, error: null };
  },
  updateUserById: async (id: string, attrs: unknown) => {
    authCalls.push({ op: "update", args: [id, attrs] });
    return { data: {}, error: null };
  },
  deleteUser: async (id: string) => {
    authCalls.push({ op: "delete", args: [id] });
    return { data: {}, error: null };
  },
};

const NEW = { name: "Ali", email: "Ali@PhoneSpot.dk", role: "employee", location_slug: "vejle", password: "abcdefgh23" };
beforeEach(() => {
  const s = seed();
  db = s.db;
  authCalls.length = 0;
  state.client = { ...s.client, auth: { admin: fakeAuthAdmin } };
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

describe("POST /api/admin/staff (ny medarbejder)", () => {
  it("only the owner can create staff", async () => {
    expect((await POST(req("POST", NEW))).status).toBe(401);
    state.staff = VEJLE;
    expect((await POST(req("POST", NEW))).status).toBe(403);
    expect(authCalls).toHaveLength(0);
  });

  it("creates a confirmed login and a staff row in the chosen store", async () => {
    state.staff = OWNER;
    const res = await POST(req("POST", NEW));
    expect(res.status).toBe(201);
    expect(authCalls[0]).toMatchObject({ op: "create", args: [{ email: "ali@phonespot.dk", password: "abcdefgh23", email_confirm: true }] });
    const row = db.tables.staff.find((s) => s.email === "ali@phonespot.dk");
    expect(row).toMatchObject({ auth_id: "auth-ali@phonespot.dk", role: "employee", location_id: "L-v", is_active: true });
    expect((await res.json()).staff.location_slug).toBe("vejle");
  });

  it("validates input and refuses owner role, short passwords and taken e-mails", async () => {
    state.staff = OWNER;
    expect((await POST(req("POST", { ...NEW, role: "owner" }))).status).toBe(400);
    expect((await POST(req("POST", { ...NEW, password: "kort" }))).status).toBe(400);
    expect((await POST(req("POST", { ...NEW, location_slug: "" }))).status).toBe(400);
    expect((await POST(req("POST", { ...NEW, email: "v@phonespot.dk" }))).status).toBe(409);
    expect((await POST(req("POST", { ...NEW, email: "taken@phonespot.dk" }))).status).toBe(409);
    expect(db.tables.staff.some((s) => s.email === "taken@phonespot.dk")).toBe(false);
  });
});

describe("PATCH /api/admin/staff (rolle, aktiv, kode)", () => {
  it("changes role and deactivates, but never the owner", async () => {
    state.staff = OWNER;
    expect((await PATCH(req("PATCH", { id: "n", role: "manager" }))).status).toBe(200);
    expect((await PATCH(req("PATCH", { id: "n", is_active: false }))).status).toBe(200);
    expect(db.tables.staff.find((s) => s.id === "n")).toMatchObject({ role: "manager", is_active: false });
    expect((await PATCH(req("PATCH", { id: "n", role: "owner" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", { id: "o", is_active: false }))).status).toBe(400);
    expect(db.tables.staff.find((s) => s.id === "o")?.is_active).toBe(true);
  });

  it("sets a new password on the login", async () => {
    state.staff = OWNER;
    db.tables.staff.find((s) => s.id === "n")!.auth_id = "auth-n";
    expect((await PATCH(req("PATCH", { id: "n", password: "kort" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", { id: "n", password: "nyKode2345" }))).status).toBe(200);
    expect(authCalls).toContainEqual({ op: "update", args: ["auth-n", { password: "nyKode2345" }] });
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
