// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));
vi.mock("@/lib/gateway-api/client", () => ({ sendSms: vi.fn() }));
vi.mock("@/lib/inquiries/send-reply", () => ({ sendInquiryReply: vi.fn() }));

import { createFakeDb } from "@/test/fake-supabase";
import { GET } from "./route";
import { PATCH as patchInquiry } from "@/app/api/contact/[id]/route";
import { GET as getMessages } from "@/app/api/contact/[id]/messages/route";

const OWNER = { id: "o", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v", role: "employee", name: "Vejle", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };

function seed() {
  return createFakeDb({
    contact_inquiries: [
      { id: "i-vejle", store_id: "vejle", source: "kontaktformular", status: "ny", created_at: "1" },
      { id: "i-slagelse", store_id: "slagelse", source: "kontaktformular", status: "ny", created_at: "2" },
      { id: "i-buyback-vejle", store_id: "vejle", source: "saelg-enhed", status: "ny", created_at: "3" },
      { id: "i-buyback-slagelse", store_id: "slagelse", source: "saelg-enhed", status: "ny", created_at: "4" },
      { id: "i-generel", store_id: null, source: "kontaktformular", status: "ny", created_at: "5" },
    ],
    inquiry_messages: [{ id: "m1", inquiry_id: "i-slagelse", body: "hemmeligt", created_at: "1" }],
  });
}

const get = (url: string, cookie?: string) =>
  new Request(url, { headers: cookie ? { cookie } : {} }) as unknown as NextRequest;
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const patch = (body: unknown) =>
  new Request("http://x/api/contact/i", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let db: ReturnType<typeof seed>["db"];
beforeEach(() => {
  const s = seed();
  db = s.db;
  state.client = s.client;
  state.staff = null;
});

const ids = async (res: Response) => ((await res.json()).inquiries as { id: string }[]).map((i) => i.id).sort();

describe("GET /api/admin/inquiries", () => {
  it("401 without staff", async () => {
    expect((await GET(get("http://x/api/admin/inquiries"))).status).toBe(401);
  });

  it("Vejle staff see only Vejle inquiries (henvendelser and opkøb)", async () => {
    state.staff = VEJLE;
    expect(await ids(await GET(get("http://x/api/admin/inquiries", "ps_store=alle")))).toEqual(["i-buyback-vejle", "i-vejle"]);
    expect(await ids(await GET(get("http://x/api/admin/inquiries?source=saelg-enhed")))).toEqual(["i-buyback-vejle"]);
  });

  it("the owner sees all, or the switched store", async () => {
    state.staff = OWNER;
    expect((await ids(await GET(get("http://x/api/admin/inquiries")))).length).toBe(5);
    expect(await ids(await GET(get("http://x/api/admin/inquiries?source=saelg-enhed", "ps_store=slagelse")))).toEqual(["i-buyback-slagelse"]);
  });
});

describe("/api/contact/[id] enforcement", () => {
  it("PATCH on another store's inquiry: 404 and nothing changed", async () => {
    state.staff = VEJLE;
    const res = await patchInquiry(patch({ status: "afsluttet" }), params("i-slagelse"));
    expect(res.status).toBe(404);
    expect(db.tables.contact_inquiries.find((i) => i.id === "i-slagelse")?.status).toBe("ny");
  });

  it("PATCH on own store works, but staff cannot reassign it to another store", async () => {
    state.staff = VEJLE;
    expect((await patchInquiry(patch({ status: "afsluttet" }), params("i-vejle"))).status).toBe(200);
    expect((await patchInquiry(patch({ store_id: "slagelse" }), params("i-vejle"))).status).toBe(403);
    expect(db.tables.contact_inquiries.find((i) => i.id === "i-vejle")?.store_id).toBe("vejle");
  });

  it("the owner can patch any inquiry", async () => {
    state.staff = OWNER;
    expect((await patchInquiry(patch({ store_id: "vejle" }), params("i-slagelse"))).status).toBe(200);
  });

  it("messages of another store's inquiry are not readable", async () => {
    state.staff = VEJLE;
    const res = await getMessages(get("http://x/m"), params("i-slagelse"));
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain("hemmeligt");
  });
});
