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
import { GET as customer } from "@/app/api/admin/inbox/[id]/customer/route";
import { GET as list } from "@/app/api/admin/inbox/route";
import { POST as reply } from "@/app/api/contact/[id]/reply/route";

const OWNER = { id: "o1", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v1", role: "employee", name: "Mads", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };

type Row = Record<string, unknown>;

function openRow(id: string, over: Row = {}): Row {
  return {
    id,
    store_id: "vejle",
    status: "ny",
    assigned_to: null,
    assigned_name: null,
    snoozed_until: null,
    name: id,
    email: `${id}@example.com`,
    phone: null,
    message: "Hej",
    subject: "S",
    channel: "email",
    mailbox: "info@phonespot.dk",
    source: "email",
    created_at: "2026-11-19T08:00:00Z",
    last_inbound_at: "2026-11-19T08:00:00Z",
    ...over,
  };
}

let db: ReturnType<typeof createFakeDb>["db"];
function setup(inquiries: Row[]) {
  const s = createFakeDb({
    contact_inquiries: inquiries,
    inquiry_messages: [],
    ai_drafts: [],
    repair_tickets: [],
    customers: [],
    orders: [],
    trade_in_offers: [],
    locations: [],
  });
  db = s.db;
  state.client = s.client;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.staff = VEJLE;
  setup([]);
});

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const get = (url: string) => new Request(url) as unknown as NextRequest;
const post = (body: unknown) =>
  new Request("http://x/api/admin/inbox/i/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
const ids = (json: { rows: { id: string }[] }) => json.rows.map((r) => r.id);
const inq = (id: string) => db.tables.contact_inquiries.find((r) => r.id === id)!;
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();

describe("liste: åbne sager fortrænges aldrig af besvarede", () => {
  it("3 nye sager vises i unassigned bag 250 gamle besvarede", async () => {
    const rows: Row[] = [];
    for (let n = 0; n < 250; n++) {
      rows.push(openRow(`old-${n}`, { status: "besvaret", last_inbound_at: `2026-01-01T00:${String(n % 60).padStart(2, "0")}:00Z` }));
    }
    for (const n of ["new-1", "new-2", "new-3"]) rows.push(openRow(n, { last_inbound_at: "2026-11-19T09:00:00Z" }));
    setup(rows);
    const json = await (await list(get("http://x/api/admin/inbox?view=unassigned"))).json();
    expect(ids(json).sort()).toEqual(["new-1", "new-2", "new-3"]);
    expect(json.counts.unassigned).toBe(3);
    expect(db.log).toContain("contact_inquiries.status=in:ny|venter_paa_svar");
  });

  it("tællere stemmer med listerne for en blandet fixture", async () => {
    setup([
      openRow("a", { assigned_to: "v1", assigned_name: "Mads" }),
      openRow("b"),
      openRow("c"),
      openRow("d", { status: "venter_paa_svar" }),
      openRow("e", { status: "lukket" }),
      openRow("f", { status: "besvaret" }),
      openRow("g", { snoozed_until: tomorrow() }),
      openRow("h", { assigned_to: "v1", assigned_name: "Mads", snoozed_until: tomorrow() }),
    ]);
    db.tables.ai_drafts.push(
      { id: "dn", inquiry_id: "c", status: "pending", needs_human: true, reason: "x", draft_body: "y", created_at: "2026-11-19T08:30:00Z" },
      { id: "dn2", inquiry_id: "d", status: "pending", needs_human: true, reason: "x", draft_body: "y", created_at: "2026-11-19T08:30:00Z" },
      { id: "df", inquiry_id: "b", status: "auto_sent", needs_human: false, created_at: "2026-11-19T08:30:00Z" },
    );
    const mine = await (await list(get("http://x/api/admin/inbox?view=mine"))).json();
    const un = await (await list(get("http://x/api/admin/inbox?view=unassigned"))).json();
    const need = await (await list(get("http://x/api/admin/inbox?view=need"))).json();
    expect(mine.counts).toEqual({ mine: mine.rows.length, unassigned: un.rows.length, need: need.rows.length });
    // unassigned: c og d (b er besvaret af Fiks, g er udsat)
    expect(mine.counts).toEqual({ mine: 1, unassigned: 2, need: 2 });
  });

  it("fiks-visningen finder besvarede sager hvor seneste udkast er auto_sent", async () => {
    setup([openRow("f1", { status: "besvaret" }), openRow("f2", { status: "besvaret" }), openRow("f3")]);
    db.tables.ai_drafts.push({ id: "d", inquiry_id: "f1", status: "auto_sent", needs_human: false, created_at: "2026-11-19T08:30:00Z" });
    const json = await (await list(get("http://x/api/admin/inbox?view=fiks"))).json();
    expect(ids(json)).toEqual(["f1"]);
  });

  it("flag er rigtige, selv om en tråd har 60 beskeder ved siden af en med needs_human-udkast", async () => {
    setup([openRow("chatty"), openRow("quiet")]);
    for (let n = 0; n < 60; n++) {
      db.tables.inquiry_messages.push({
        id: `cm${n}`,
        inquiry_id: "chatty",
        sender: "customer",
        channel: "email",
        body: `Besked ${n}`,
        is_internal: false,
        created_at: `2026-11-19T10:${String(n).padStart(2, "0")}:00Z`,
      });
    }
    db.tables.ai_drafts.push({ id: "dq", inquiry_id: "quiet", status: "pending", needs_human: true, reason: "Reklamation", draft_body: "Svar", created_at: "2026-11-19T07:00:00Z" });
    const json = await (await list(get("http://x/api/admin/inbox?view=ch-mail"))).json();
    const byId = Object.fromEntries(json.rows.map((r: { id: string }) => [r.id, r]));
    expect(byId.quiet).toMatchObject({ needsHuman: true, needsHumanReason: "Reklamation", hasDraft: true });
    expect(byId.chatty).toMatchObject({ needsHuman: false, preview: "Besked 59" });
  });

  it("henter udkast og beskeder i grupper på højst 100 id, aldrig globalt", async () => {
    const rows: Row[] = [];
    for (let n = 0; n < 150; n++) rows.push(openRow(`x${n}`));
    setup(rows);
    await list(get("http://x/api/admin/inbox?view=ch-mail"));
    const lines = db.log.filter((l) => l.startsWith("ai_drafts.inquiry_id=in:") || l.startsWith("inquiry_messages.inquiry_id=in:"));
    expect(lines.length).toBeGreaterThanOrEqual(4);
    for (const l of lines) expect(l.slice(l.indexOf(":") + 1).split("|").length).toBeLessThanOrEqual(100);
    expect(db.log.some((l) => l.startsWith("ai_drafts.status=eq:"))).toBe(false);
  });
});

describe("action: krav og vagter", () => {
  beforeEach(() => {
    setup([openRow("i-vejle"), openRow("i-taken", { assigned_to: "kollega", assigned_name: "Sofie" })]);
  });

  it("take uden expectAssignedTo giver 400", async () => {
    const res = await action(post({ type: "take" }), params("i-vejle"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Opdater siden og prøv igen.");
    expect(inq("i-vejle").assigned_to).toBeNull();
  });

  it("take og snooze på lukket sag giver 409, note er tilladt", async () => {
    inq("i-vejle").status = "lukket";
    const t = await action(post({ type: "take", expectAssignedTo: null }), params("i-vejle"));
    expect(t.status).toBe(409);
    expect((await t.json()).error).toBe("Sagen er lukket. Genåbn den først.");
    const sn = await action(post({ type: "snooze", until: tomorrow() }), params("i-vejle"));
    expect(sn.status).toBe(409);
    expect((await action(post({ type: "note", body: "Efterskrift" }), params("i-vejle"))).status).toBe(201);
  });

  it("release: kun den ansvarlige eller ejeren", async () => {
    const no = await action(post({ type: "release" }), params("i-taken"));
    expect(no.status).toBe(409);
    expect((await no.json()).assignedName).toBe("Sofie");
    expect(inq("i-taken").assigned_to).toBe("kollega");
    state.staff = OWNER;
    expect((await action(post({ type: "release" }), params("i-taken"))).status).toBe(200);
    expect(inq("i-taken").assigned_to).toBeNull();
  });

  it("release af egen sag virker", async () => {
    inq("i-vejle").assigned_to = "v1";
    inq("i-vejle").assigned_name = "Mads";
    expect((await action(post({ type: "release" }), params("i-vejle"))).status).toBe(200);
    expect(inq("i-vejle").assigned_to).toBeNull();
  });
});

describe("reply: bogføring efter afsendelse", () => {
  it("fejl i opdateringen giver stadig 201 med advarsel", async () => {
    setup([openRow("i-vejle", { phone: "12345678" })]);
    const real = state.client as { from: (t: string) => { update: (p: Row) => unknown } };
    state.client = {
      from: (t: string) => {
        const q = real.from(t);
        if (t !== "contact_inquiries") return q;
        const orig = q.update.bind(q);
        q.update = (p: Row) => {
          if (!("snoozed_until" in p)) return orig(p);
          const failing: Row = {
            eq: () => failing,
            is: () => failing,
            then: (r: (v: unknown) => void) => r({ error: { message: "db" } }),
          };
          return failing;
        };
        return q;
      },
    };
    const res = await reply(
      new Request("http://x/api/contact/i/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Hej", channel: "sms" }),
      }),
      params("i-vejle"),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeTruthy();
    expect(json.warning).toBe("Svaret er sendt, men sagen kunne ikke opdateres. Opdater siden.");
  });

  it("uden fejl er der ingen advarsel", async () => {
    setup([openRow("i-vejle", { phone: "12345678" })]);
    const res = await reply(
      new Request("http://x/api/contact/i/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Hej", channel: "sms" }),
      }),
      params("i-vejle"),
    );
    expect((await res.json()).warning).toBeUndefined();
  });
});

describe("customer: matchedBy", () => {
  it("email, both, phone og null", async () => {
    setup([openRow("i-vejle", { email: "kunde@example.com", phone: "+45 12 34 56 78", channel: "form" })]);
    db.tables.repair_tickets.push({
      id: "r1", customer_email: "kunde@example.com", customer_phone: "", device_model: "A", issue_description: "B", status: "modtaget", store_id: "vejle", created_at: "1",
    });
    let json = await (await customer(get("http://x/c"), params("i-vejle"))).json();
    expect(json.matchedBy).toBe("email");
    db.tables.repair_tickets.push({
      id: "r3", customer_email: "x@y.dk", customer_phone: "+45 12345678", device_model: "P", issue_description: "B", status: "modtaget", store_id: "vejle", created_at: "3",
    });
    json = await (await customer(get("http://x/c"), params("i-vejle"))).json();
    expect(json.matchedBy).toBe("both");
    db.tables.repair_tickets.splice(0, 1);
    inq("i-vejle").email = "ingen@example.com";
    json = await (await customer(get("http://x/c"), params("i-vejle"))).json();
    expect(json.matchedBy).toBe("phone");
    inq("i-vejle").channel = "messenger";
    json = await (await customer(get("http://x/c"), params("i-vejle"))).json();
    expect(json.matchedBy).toBeNull();
  });
});
