// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));
vi.mock("@/lib/gateway-api/client", () => ({ sendSms: vi.fn() }));

import { createFakeDb } from "@/test/fake-supabase";
import { GET as listRepairs } from "../route";
import { GET as getRepair, POST as addNote } from "../[id]/route";
import { PATCH as patchRepair } from "@/app/api/repairs/[id]/route";
import { PATCH as patchStatus } from "@/app/api/repairs/[id]/status/route";
import { POST as postQuote } from "@/app/api/repairs/[id]/quote/route";
import { POST as postComment } from "@/app/api/repairs/[id]/comments/route";

const OWNER = { id: "o", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v", role: "employee", name: "Vejle", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };
const NOSTORE = { id: "n", role: "employee", name: "Ny", email: "n@phonespot.dk", location_id: null, location_slug: null };

function seed() {
  return createFakeDb({
    repair_tickets: [
      { id: "t-vejle", store_id: "vejle", customer_name: "Anna", status: "modtaget", is_urgent: false, internal_notes: [], created_at: "2026-10-01" },
      { id: "t-slagelse", store_id: "slagelse", customer_name: "Bo", status: "modtaget", is_urgent: false, internal_notes: [], created_at: "2026-10-02" },
      { id: "t-generel", store_id: null, customer_name: "Caecilie", status: "modtaget", is_urgent: false, internal_notes: [], created_at: "2026-10-03" },
    ],
    repair_quotes: [],
    repair_status_log: [],
    repair_comments: [],
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const get = (url: string, cookie?: string) =>
  new Request(url, { headers: cookie ? { cookie } : {} }) as unknown as NextRequest;
const send = (url: string, method: string, body: unknown, cookie?: string) =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

let db: ReturnType<typeof seed>["db"];

beforeEach(() => {
  const s = seed();
  db = s.db;
  state.client = s.client;
  state.staff = null;
});

const ids = async (res: Response) => ((await res.json()).rows as { id: string }[]).map((t) => t.id).sort();
const storeOf = (id: string) => db.tables.repair_tickets.find((t) => t.id === id)?.store_id;

describe("GET /api/admin/repairs (list)", () => {
  it("401 without staff", async () => {
    expect((await listRepairs(get("http://x/api/admin/repairs"))).status).toBe(401);
  });

  it("a Vejle employee only sees Vejle repairs", async () => {
    state.staff = VEJLE;
    expect(await ids(await listRepairs(get("http://x/api/admin/repairs")))).toEqual(["t-vejle"]);
  });

  it("a Vejle employee cannot widen the list with the ps_store cookie or ?store=", async () => {
    state.staff = VEJLE;
    expect(await ids(await listRepairs(get("http://x/api/admin/repairs", "ps_store=alle")))).toEqual(["t-vejle"]);
    expect(await ids(await listRepairs(get("http://x/api/admin/repairs?store=slagelse", "ps_store=slagelse")))).toEqual(["t-vejle"]);
  });

  it("an employee without a store sees nothing", async () => {
    state.staff = NOSTORE;
    expect(await ids(await listRepairs(get("http://x/api/admin/repairs")))).toEqual([]);
  });

  it("the owner sees everything by default", async () => {
    state.staff = OWNER;
    expect(await ids(await listRepairs(get("http://x/api/admin/repairs")))).toEqual(["t-generel", "t-slagelse", "t-vejle"]);
  });

  it("the owner is filtered by the switcher cookie", async () => {
    state.staff = OWNER;
    expect(await ids(await listRepairs(get("http://x/api/admin/repairs", "ps_store=slagelse")))).toEqual(["t-slagelse"]);
    expect(await ids(await listRepairs(get("http://x/api/admin/repairs", "ps_store=webshop")))).toEqual(["t-generel"]);
  });
});

describe("GET /api/admin/repairs/[id] (detail)", () => {
  it("own store: 200", async () => {
    state.staff = VEJLE;
    const res = await getRepair(get("http://x/api/admin/repairs/t-vejle"), params("t-vejle"));
    expect(res.status).toBe(200);
    expect((await res.json()).ticket.id).toBe("t-vejle");
  });

  it("another store: 404, and no data is returned", async () => {
    state.staff = VEJLE;
    const res = await getRepair(get("http://x/api/admin/repairs/t-slagelse"), params("t-slagelse"));
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain("Bo");
  });

  it("unattributed tickets are not visible to store staff", async () => {
    state.staff = VEJLE;
    expect((await getRepair(get("http://x/a"), params("t-generel"))).status).toBe(404);
  });

  it("the owner can open any ticket, regardless of the switcher", async () => {
    state.staff = OWNER;
    expect((await getRepair(get("http://x/a", "ps_store=vejle"), params("t-slagelse"))).status).toBe(200);
  });

  it("POST note: blocked cross-store, allowed in own store", async () => {
    state.staff = VEJLE;
    const denied = await addNote(send("http://x/a", "POST", { note: "hej" }), params("t-slagelse"));
    expect(denied.status).toBe(404);
    expect(db.tables.repair_tickets.find((t) => t.id === "t-slagelse")?.internal_notes).toEqual([]);

    const ok = await addNote(send("http://x/a", "POST", { note: "hej" }), params("t-vejle"));
    expect(ok.status).toBe(200);
    expect((db.tables.repair_tickets.find((t) => t.id === "t-vejle")?.internal_notes as unknown[]).length).toBe(1);
  });
});

describe("PATCH /api/repairs/[id]", () => {
  it("Vejle staff cannot patch a Slagelse repair (404, row untouched)", async () => {
    state.staff = VEJLE;
    const res = await patchRepair(send("http://x/a", "PATCH", { is_urgent: true }), params("t-slagelse"));
    expect(res.status).toBe(404);
    expect(db.tables.repair_tickets.find((t) => t.id === "t-slagelse")?.is_urgent).toBe(false);
  });

  it("Vejle staff can patch a Vejle repair", async () => {
    state.staff = VEJLE;
    const res = await patchRepair(send("http://x/a", "PATCH", { is_urgent: true }), params("t-vejle"));
    expect(res.status).toBe(200);
    expect(db.tables.repair_tickets.find((t) => t.id === "t-vejle")?.is_urgent).toBe(true);
  });

  it("staff cannot move a repair to another store, or to 'generel'", async () => {
    state.staff = VEJLE;
    expect((await patchRepair(send("http://x/a", "PATCH", { store_id: "slagelse" }), params("t-vejle"))).status).toBe(403);
    expect((await patchRepair(send("http://x/a", "PATCH", { store_id: null }), params("t-vejle"))).status).toBe(403);
    expect(storeOf("t-vejle")).toBe("vejle");
  });

  it("the owner can patch any repair and move it between stores", async () => {
    state.staff = OWNER;
    expect((await patchRepair(send("http://x/a", "PATCH", { is_urgent: true }), params("t-slagelse"))).status).toBe(200);
    expect((await patchRepair(send("http://x/a", "PATCH", { store_id: "vejle" }), params("t-slagelse"))).status).toBe(200);
    expect(storeOf("t-slagelse")).toBe("vejle");
  });

  it("an employee without a store cannot patch anything", async () => {
    state.staff = NOSTORE;
    expect((await patchRepair(send("http://x/a", "PATCH", { is_urgent: true }), params("t-vejle"))).status).toBe(404);
  });
});

describe("other repair routes enforce the same scope", () => {
  it("status, quote and comments answer 404 for another store's ticket", async () => {
    state.staff = VEJLE;
    expect((await patchStatus(send("http://x/a", "PATCH", { status: "diagnostik" }), params("t-slagelse"))).status).toBe(404);
    expect((await postQuote(send("http://x/a", "POST", { price_dkk: 100 }), params("t-slagelse"))).status).toBe(404);
    expect((await postComment(send("http://x/a", "POST", { author: "a", message: "m" }), params("t-slagelse"))).status).toBe(404);
    expect(db.tables.repair_tickets.find((t) => t.id === "t-slagelse")?.status).toBe("modtaget");
  });

  it("status, quote and comments answer 401 without staff", async () => {
    expect((await patchStatus(send("http://x/a", "PATCH", { status: "diagnostik" }), params("t-vejle"))).status).toBe(401);
    expect((await postQuote(send("http://x/a", "POST", { price_dkk: 100 }), params("t-vejle"))).status).toBe(401);
    expect((await postComment(send("http://x/a", "POST", { author: "a", message: "m" }), params("t-vejle"))).status).toBe(401);
  });
});
