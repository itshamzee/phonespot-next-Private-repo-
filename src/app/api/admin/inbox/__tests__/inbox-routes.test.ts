// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));
vi.mock("@/lib/gateway-api/client", () => ({
  sendSms: vi.fn(async () => ({ success: true, messageId: "sms-1", error: null })),
}));
vi.mock("@/lib/inquiries/send-reply", () => ({ sendInquiryReply: vi.fn() }));

import { createFakeDb } from "@/test/fake-supabase";
import { POST as action } from "@/app/api/admin/inbox/[id]/action/route";
import { GET as detail } from "@/app/api/admin/inbox/[id]/route";
import { GET as customer } from "@/app/api/admin/inbox/[id]/customer/route";
import { GET as list } from "@/app/api/admin/inbox/route";
import { POST as reply } from "@/app/api/contact/[id]/reply/route";

const OWNER = { id: "o1", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v1", role: "employee", name: "Mads", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };

function seed() {
  return createFakeDb({
    contact_inquiries: [
      {
        id: "i-vejle",
        store_id: "vejle",
        status: "ny",
        assigned_to: null,
        assigned_name: null,
        snoozed_until: null,
        name: "Kunde",
        email: "kunde@example.com",
        phone: "+45 12 34 56 78",
        message: "Hej",
        channel: "form",
        source: "kontaktformular",
        created_at: "2026-11-19T08:00:00Z",
        last_inbound_at: "2026-11-19T08:00:00Z",
      },
      {
        id: "i-taken",
        store_id: "vejle",
        status: "ny",
        assigned_to: "kollega",
        assigned_name: "Sofie",
        snoozed_until: null,
        name: "Anden",
        email: "anden@example.com",
        phone: null,
        message: "Hej",
        channel: "email",
        source: "email",
        created_at: "2026-11-19T08:00:00Z",
        last_inbound_at: "2026-11-19T08:00:00Z",
      },
      {
        id: "i-slagelse",
        store_id: "slagelse",
        status: "ny",
        assigned_to: null,
        name: "Slagelse-kunde",
        email: "s@example.com",
        phone: null,
        message: "Hemmelig",
        channel: "email",
        source: "email",
        created_at: "2026-11-19T08:00:00Z",
      },
    ],
    inquiry_messages: [],
    ai_drafts: [
      { id: "d1", inquiry_id: "i-vejle", status: "auto_sent", needs_human: false, created_at: "2026-11-19T09:00:00Z" },
    ],
    repair_tickets: [],
    customers: [],
    orders: [],
    trade_in_offers: [],
    locations: [],
  });
}

let db: ReturnType<typeof seed>["db"];
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const s = seed();
  db = s.db;
  state.client = s.client;
  state.staff = VEJLE;
});

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (body: unknown, url = "http://x/api/admin/inbox/i/action") =>
  new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
const get = (url: string) => new Request(url) as unknown as NextRequest;
const inquiry = (id: string) => db.tables.contact_inquiries.find((r) => r.id === id)!;

describe("action: take / release", () => {
  it("tager en ledig sag", async () => {
    const res = await action(post({ type: "take", expectAssignedTo: null }), params("i-vejle"));
    expect(res.status).toBe(200);
    expect(inquiry("i-vejle")).toMatchObject({ assigned_to: "v1", assigned_name: "Mads" });
  });

  it("kollision giver 409 og ændrer intet", async () => {
    const res = await action(post({ type: "take", expectAssignedTo: null }), params("i-taken"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Sagen er allerede taget af Sofie.", assignedName: "Sofie" });
    expect(inquiry("i-taken")).toMatchObject({ assigned_to: "kollega", assigned_name: "Sofie" });
  });

  it("slipper en sag", async () => {
    await action(post({ type: "take", expectAssignedTo: null }), params("i-vejle"));
    const res = await action(post({ type: "release" }), params("i-vejle"));
    expect(res.status).toBe(200);
    expect(inquiry("i-vejle")).toMatchObject({ assigned_to: null, assigned_name: null });
  });
});

describe("action: adgang", () => {
  it("medarbejder uden adgang til butikken får 404", async () => {
    const res = await action(post({ type: "take", expectAssignedTo: null }), params("i-slagelse"));
    expect(res.status).toBe(404);
    expect(inquiry("i-slagelse").assigned_to).toBeNull();
  });
  it("uden login giver 401", async () => {
    state.staff = null;
    const res = await action(post({ type: "take", expectAssignedTo: null }), params("i-vejle"));
    expect(res.status).toBe(401);
  });
});

describe("action: snooze", () => {
  it("accepterer et gyldigt tidspunkt og kan fortrydes", async () => {
    const until = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const res = await action(post({ type: "snooze", until }), params("i-vejle"));
    expect(res.status).toBe(200);
    expect(inquiry("i-vejle").snoozed_until).toBe(until);
    await action(post({ type: "unsnooze" }), params("i-vejle"));
    expect(inquiry("i-vejle").snoozed_until).toBeNull();
  });
  it("afviser fortid, over 30 dage og rod", async () => {
    for (const until of [
      new Date(Date.now() - 60_000).toISOString(),
      new Date(Date.now() + 31 * 86_400_000).toISOString(),
      "i morgen",
      undefined,
    ]) {
      const res = await action(post({ type: "snooze", until }), params("i-vejle"));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Vælg et tidspunkt i fremtiden, højst 30 dage frem.");
    }
    expect(inquiry("i-vejle").snoozed_until).toBeNull();
  });
});

describe("action: done / reopen", () => {
  it("lukker og genåbner", async () => {
    await action(post({ type: "done" }), params("i-vejle"));
    expect(inquiry("i-vejle").status).toBe("lukket");
    await action(post({ type: "reopen" }), params("i-vejle"));
    expect(inquiry("i-vejle").status).toBe("ny");
  });
  it("ukendt handling giver 400", async () => {
    const res = await action(post({ type: "slet" }), params("i-vejle"));
    expect(res.status).toBe(400);
  });
});

describe("action: note", () => {
  it("gemmer en intern note som staff/system", async () => {
    const res = await action(post({ type: "note", body: "Ring tilbage i morgen" }), params("i-vejle"));
    expect(res.status).toBe(201);
    expect(db.tables.inquiry_messages).toHaveLength(1);
    expect(db.tables.inquiry_messages[0]).toMatchObject({
      inquiry_id: "i-vejle",
      sender: "staff",
      channel: "system",
      is_internal: true,
      staff_name: "Mads",
      body: "Ring tilbage i morgen",
    });
  });
  it("tom note giver 400", async () => {
    const res = await action(post({ type: "note", body: "  " }), params("i-vejle"));
    expect(res.status).toBe(400);
    expect(db.tables.inquiry_messages).toHaveLength(0);
  });
});

describe("action: verdict", () => {
  it("wrong uden note giver 400 og ændrer intet", async () => {
    const res = await action(post({ type: "verdict", draftId: "d1", verdict: "wrong" }), params("i-vejle"));
    expect(res.status).toBe(400);
    expect(db.tables.ai_drafts[0].review_verdict).toBeUndefined();
  });
  it("wrong med note åbner sagen og tildeler den", async () => {
    inquiry("i-vejle").status = "besvaret";
    const res = await action(
      post({ type: "verdict", draftId: "d1", verdict: "wrong", note: "Forkert pris" }),
      params("i-vejle"),
    );
    expect(res.status).toBe(200);
    expect(db.tables.ai_drafts[0]).toMatchObject({ review_verdict: "wrong", review_note: "Forkert pris", reviewed_verdict_by: "v1" });
    expect(inquiry("i-vejle")).toMatchObject({ status: "ny", assigned_to: "v1", assigned_name: "Mads" });
  });
  it("correct ændrer ikke sagen", async () => {
    inquiry("i-vejle").status = "besvaret";
    const res = await action(post({ type: "verdict", draftId: "d1", verdict: "correct" }), params("i-vejle"));
    expect(res.status).toBe(200);
    expect(db.tables.ai_drafts[0].review_verdict).toBe("correct");
    expect(inquiry("i-vejle").status).toBe("besvaret");
  });
  it("udkast fra en anden tråd giver 404", async () => {
    db.tables.ai_drafts.push({ id: "d2", inquiry_id: "i-taken", status: "auto_sent", created_at: "1" });
    const res = await action(post({ type: "verdict", draftId: "d2", verdict: "correct" }), params("i-vejle"));
    expect(res.status).toBe(404);
  });
});

describe("reply: after og sessionens navn", () => {
  const replyReq = (body: unknown) =>
    new Request("http://x/api/contact/i/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("after done lukker sagen og bruger sessionens navn", async () => {
    const res = await reply(
      replyReq({ body: "Hej fra butikken", channel: "sms", staff_name: "Snyder", after: "done" }),
      params("i-vejle"),
    );
    expect(res.status).toBe(201);
    expect(inquiry("i-vejle").status).toBe("lukket");
    expect(db.tables.inquiry_messages[0]).toMatchObject({ staff_name: "Mads", sender: "staff" });
    expect(inquiry("i-vejle")).toMatchObject({ assigned_to: "v1", assigned_name: "Mads", snoozed_until: null });
  });

  it("standard er besvaret og en optaget sag beholder sin ansvarlige", async () => {
    inquiry("i-taken").phone = "12345678";
    const res = await reply(replyReq({ body: "Svar", channel: "sms" }), params("i-taken"));
    expect(res.status).toBe(201);
    expect(inquiry("i-taken")).toMatchObject({ status: "besvaret", assigned_to: "kollega" });
  });

  it("ugyldig after giver 400", async () => {
    const res = await reply(replyReq({ body: "Svar", channel: "sms", after: "slet" }), params("i-vejle"));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/inbox/[id]", () => {
  it("returnerer første besked, tråd inkl. interne og udkast", async () => {
    db.tables.inquiry_messages.push(
      { id: "m1", inquiry_id: "i-vejle", sender: "staff", channel: "system", body: "Note", is_internal: true, created_at: "2026-11-19T09:30:00Z" },
    );
    const res = await detail(get("http://x/api/admin/inbox/i-vejle"), params("i-vejle"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.inquiry.id).toBe("i-vejle");
    expect(json.messages.map((m: { body: string }) => m.body)).toEqual(["Hej", "Note"]);
    expect(json.messages[1].is_internal).toBe(true);
    expect(json.drafts).toHaveLength(1);
  });
  it("404 for anden butik", async () => {
    const res = await detail(get("http://x/api/admin/inbox/i-slagelse"), params("i-slagelse"));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/inbox (liste)", () => {
  it("medarbejder ser kun egen butik, og ?store kan ikke udvide", async () => {
    const res = await list(get("http://x/api/admin/inbox?view=ch-form&store=slagelse"));
    expect(res.status).toBe(200);
    const json = await res.json();
    const ids = json.rows.map((r: { id: string }) => r.id);
    expect(ids).toContain("i-vejle");
    expect(ids).not.toContain("i-slagelse");
    expect(json.me).toEqual({ id: "v1", name: "Mads" });
    expect(Object.keys(json.counts).sort()).toEqual(["mine", "need", "unassigned"]);
  });
  it("ejer kan indsnævre til en butik", async () => {
    state.staff = OWNER;
    const res = await list(get("http://x/api/admin/inbox?view=ch-mail&store=slagelse"));
    const ids = (await res.json()).rows.map((r: { id: string }) => r.id);
    expect(ids).toEqual(["i-slagelse"]);
  });
  it("ukendt visning giver 400, uden login 401", async () => {
    expect((await list(get("http://x/api/admin/inbox?view=nope"))).status).toBe(400);
    state.staff = null;
    expect((await list(get("http://x/api/admin/inbox"))).status).toBe(401);
  });
  it("fiks-visning viser sager Fiks har besvaret, ikke ledige", async () => {
    inquiry("i-vejle").status = "besvaret";
    const fiks = (await (await list(get("http://x/api/admin/inbox?view=fiks"))).json()).rows;
    expect(fiks.map((r: { id: string }) => r.id)).toEqual(["i-vejle"]);
    const free = (await (await list(get("http://x/api/admin/inbox?view=unassigned"))).json()).rows;
    expect(free.map((r: { id: string }) => r.id)).not.toContain("i-vejle");
  });
  it("ingen N+1: kun én forespørgsel pr. tabel til rækkerne", async () => {
    await list(get("http://x/api/admin/inbox?view=ch-form"));
    const msgQueries = db.log.filter((l) => l.startsWith("inquiry_messages.inquiry_id=in:"));
    // én for listen og én for tællerne, uanset antal rækker
    expect(msgQueries).toHaveLength(2);
  });
});

describe("GET /api/admin/inbox/[id]/customer", () => {
  it("returnerer kun den rette kundes data og linker til admin-sider", async () => {
    db.tables.repair_tickets.push(
      { id: "r1", customer_email: "Kunde@Example.com", customer_phone: "", device_model: "iPhone 13", issue_description: "Skærm", status: "modtaget", ticket_number: "R-1", store_id: "vejle", created_at: "2026-11-01" },
      { id: "r2", customer_email: "anden@example.com", customer_phone: "99999999", device_model: "X", issue_description: "Y", status: "modtaget", store_id: "vejle", created_at: "2026-11-02" },
      { id: "r3", customer_email: "x@y.dk", customer_phone: "+45 12345678", device_model: "Pixel", issue_description: "Batteri", status: "modtaget", store_id: "vejle", created_at: "2026-11-03" },
    );
    const res = await customer(get("http://x/api/admin/inbox/i-vejle/customer"), params("i-vejle"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.known).toBe(true);
    expect(json.repairs.map((r: { id: string }) => r.id).sort()).toEqual(["r1", "r3"]);
    expect(json.repairs[0].href).toMatch(/^\/admin\/reparationer\//);
  });
  it("anmeldelser og messenger er ikke kendte", async () => {
    inquiry("i-vejle").channel = "google_review";
    const res = await customer(get("http://x/api/admin/inbox/i-vejle/customer"), params("i-vejle"));
    const json = await res.json();
    expect(json).toMatchObject({ known: false, repairs: [], orders: [], buyback: [], previous: [] });
  });
  it("404 for anden butik", async () => {
    const res = await customer(get("http://x/api/admin/inbox/i-slagelse/customer"), params("i-slagelse"));
    expect(res.status).toBe(404);
  });
});
