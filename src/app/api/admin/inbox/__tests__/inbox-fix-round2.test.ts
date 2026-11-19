// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
  sendCalls: [] as Record<string, unknown>[],
  sendError: null as null | Error,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.client }));
vi.mock("@/lib/gateway-api/client", () => ({
  sendSms: vi.fn(async () => ({ success: true, messageId: "sms-1", error: null })),
}));
vi.mock("@/lib/inquiries/send-reply", () => ({
  sendInquiryReply: vi.fn(async (_sb: unknown, args: Record<string, unknown>) => {
    state.sendCalls.push(args);
    if (state.sendError) throw state.sendError;
    return { messageRowId: "msg-1", transport: "onecom", messageId: "<m>" };
  }),
}));

import { createFakeDb } from "@/test/fake-supabase";
import { POST as action } from "@/app/api/admin/inbox/[id]/action/route";
import { POST as approve } from "@/app/api/admin/mail-agent/drafts/[id]/approve/route";
import { POST as discard } from "@/app/api/admin/mail-agent/drafts/[id]/discard/route";
import { POST as reply } from "@/app/api/contact/[id]/reply/route";

const VEJLE = { id: "v1", role: "employee", name: "Mads", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };

type Row = Record<string, unknown>;

function inquiryRow(id: string, over: Row = {}): Row {
  return {
    id,
    store_id: "vejle",
    status: "ny",
    assigned_to: null,
    assigned_name: null,
    snoozed_until: null,
    name: id,
    email: `${id}@example.com`,
    phone: "12345678",
    message: "Hej",
    channel: "email",
    created_at: "2026-11-19T08:00:00Z",
    ...over,
  };
}

let db: ReturnType<typeof createFakeDb>["db"];
function setup(inquiries: Row[], drafts: Row[] = []) {
  const s = createFakeDb({
    contact_inquiries: inquiries,
    ai_drafts: drafts,
    inquiry_messages: [],
    mail_inbound: [],
  });
  db = s.db;
  state.client = s.client;
}
const draft = (id: string, inquiry: string, over: Row = {}): Row => ({
  id,
  inquiry_id: inquiry,
  status: "pending",
  category: "andet",
  draft_body: "Hej, her er svaret",
  draft_subject: "Re: Emne",
  ...over,
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  state.staff = VEJLE;
  state.sendCalls = [];
  state.sendError = null;
  setup([inquiryRow("i1"), inquiryRow("i-s", { store_id: "slagelse" })], [draft("d1", "i1"), draft("d-s", "i-s")]);
});

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (body: unknown) =>
  new Request("http://x/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
const inq = (id: string) => db.tables.contact_inquiries.find((r) => r.id === id)!;
const dr = (id: string) => db.tables.ai_drafts.find((r) => r.id === id)!;
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

describe("A: waiting", () => {
  it("sætter besvaret, nulstiller udsættelse og tildeler hvis ledig", async () => {
    inq("i1").snoozed_until = future(1);
    const res = await action(post({ type: "waiting" }), params("i1"));
    expect(res.status).toBe(200);
    expect(inq("i1")).toMatchObject({ status: "besvaret", snoozed_until: null, assigned_to: "v1", assigned_name: "Mads" });
  });
  it("rører ikke en eksisterende ansvarlig", async () => {
    inq("i1").assigned_to = "x";
    inq("i1").assigned_name = "Sofie";
    await action(post({ type: "waiting" }), params("i1"));
    expect(inq("i1")).toMatchObject({ status: "besvaret", assigned_to: "x" });
  });
  it("lukket sag giver 409", async () => {
    inq("i1").status = "lukket";
    const res = await action(post({ type: "waiting" }), params("i1"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Sagen er lukket. Genåbn den først.");
    expect(inq("i1").status).toBe("lukket");
  });
});

describe("B: reopen med to og snoozedUntil", () => {
  it("standard er ny", async () => {
    inq("i1").status = "lukket";
    await action(post({ type: "reopen" }), params("i1"));
    expect(inq("i1").status).toBe("ny");
  });
  it("to gendanner forrige status", async () => {
    for (const to of ["venter_paa_svar", "besvaret"]) {
      inq("i1").status = "lukket";
      const res = await action(post({ type: "reopen", to }), params("i1"));
      expect(res.status).toBe(200);
      expect((await res.json()).inquiry.status).toBe(to);
      expect(inq("i1").status).toBe(to);
    }
  });
  it("ugyldig to giver 400 og ændrer intet", async () => {
    inq("i1").status = "lukket";
    for (const to of ["lukket", "andet", 5, null]) {
      const res = await action(post({ type: "reopen", to }), params("i1"));
      expect(res.status).toBe(400);
    }
    expect(inq("i1").status).toBe("lukket");
  });
  it("snoozedUntil gendanner udsættelse og valideres som snooze", async () => {
    inq("i1").status = "lukket";
    const until = future(2);
    expect((await action(post({ type: "reopen", snoozedUntil: until }), params("i1"))).status).toBe(200);
    expect(inq("i1")).toMatchObject({ status: "ny", snoozed_until: until });
    inq("i1").status = "lukket";
    for (const bad of [future(40), new Date(Date.now() - 1000).toISOString(), "i morgen"]) {
      expect((await action(post({ type: "reopen", snoozedUntil: bad }), params("i1"))).status).toBe(400);
    }
  });
  it("reopen uden snoozedUntil rører ikke snoozed_until", async () => {
    const until = future(2);
    inq("i1").status = "lukket";
    inq("i1").snoozed_until = until;
    await action(post({ type: "reopen" }), params("i1"));
    expect(inq("i1").snoozed_until).toBe(until);
  });
});

describe("C: approve", () => {
  it("anden butiks udkast giver 404 og sender intet", async () => {
    const res = await approve(post({ body: "x" }), params("d-s"));
    expect(res.status).toBe(404);
    expect(state.sendCalls).toHaveLength(0);
    expect(dr("d-s").status).toBe("pending");
  });
  it("ukendt udkast giver 404 med fast tekst", async () => {
    const res = await approve(post({}), params("nope"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Udkastet blev ikke fundet");
  });
  it("ignorerer body.staff_name og bruger sessionens navn; gammel side virker stadig", async () => {
    const res = await approve(post({ body: "Rettet svar", staff_name: "Admin" }), params("d1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, transport: "onecom", filed: 0 });
    expect(json.warning).toBeUndefined();
    expect(state.sendCalls[0]).toMatchObject({ staffName: "Mads", body: "Rettet svar", inquiryId: "i1" });
    expect(dr("d1")).toMatchObject({ status: "sent", reviewed_by: "Mads", final_body: "Rettet svar" });
    expect(inq("i1")).toMatchObject({ status: "besvaret", assigned_to: "v1" });
  });
  it("after done lukker sagen", async () => {
    const res = await approve(post({ after: "done" }), params("d1"));
    expect(res.status).toBe(200);
    expect(inq("i1").status).toBe("lukket");
  });
  it("ugyldig after giver 400", async () => {
    expect((await approve(post({ after: "slet" }), params("d1"))).status).toBe(400);
    expect(state.sendCalls).toHaveLength(0);
  });
  it("allerede behandlet giver 409", async () => {
    dr("d1").status = "sent";
    const res = await approve(post({}), params("d1"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Udkastet er allerede behandlet.");
  });
  it("sendefejl giver fast dansk tekst, aldrig den rå fejl", async () => {
    state.sendError = new Error("SMTP 535 login hemmeligt-kodeord");
    const res = await approve(post({}), params("d1"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Svaret kunne ikke sendes. Prøv igen." });
    expect(dr("d1").status).toBe("pending");
  });
  it("sendt men bogføring fejler giver 200 med advarsel", async () => {
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
    const res = await approve(post({}), params("d1"));
    expect(res.status).toBe(200);
    expect((await res.json()).warning).toBe("Svaret er sendt, men sagen kunne ikke opdateres. Opdater siden.");
  });
});

describe("C: discard", () => {
  it("anden butik giver 404", async () => {
    expect((await discard(post({}), params("d-s"))).status).toBe(404);
    expect(dr("d-s").status).toBe("pending");
  });
  it("kasserer i sessionens navn og ignorerer body.staff_name", async () => {
    const res = await discard(post({ staff_name: "Admin" }), params("d1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, filed: 0 });
    expect(dr("d1")).toMatchObject({ status: "discarded", reviewed_by: "Mads" });
  });
  it("allerede behandlet giver 409", async () => {
    dr("d1").status = "sent";
    expect((await discard(post({}), params("d1"))).status).toBe(409);
    expect(dr("d1").status).toBe("sent");
  });
});

describe("D: reply lukker ventende udkast", () => {
  it("kasserer ventende udkast på tråden i sessionens navn, ikke andres", async () => {
    const res = await reply(post({ body: "Hej", channel: "sms" }), params("i1"));
    expect(res.status).toBe(201);
    expect((await res.json()).warning).toBeUndefined();
    expect(dr("d1")).toMatchObject({ status: "discarded", reviewed_by: "Mads" });
    expect(dr("d-s").status).toBe("pending");
  });
  it("fejl i udkastlukningen giver kun en advarsel", async () => {
    const real = state.client as { from: (t: string) => { update: (p: Row) => unknown } };
    state.client = {
      from: (t: string) => {
        const q = real.from(t);
        if (t !== "ai_drafts") return q;
        q.update = () => {
          const failing: Row = { eq: () => failing, then: (r: (v: unknown) => void) => r({ error: { message: "db" } }) };
          return failing;
        };
        return q;
      },
    };
    const res = await reply(post({ body: "Hej", channel: "sms" }), params("i1"));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeTruthy();
    expect(json.warning).toBe("Svaret er sendt, men sagen kunne ikke opdateres. Opdater siden.");
  });
});
