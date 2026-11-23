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
import { GET as list } from "@/app/api/admin/inbox/route";
import { GET as messages } from "@/app/api/contact/[id]/messages/route";

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
let selects: { table: string; columns: string }[];

function setup(inquiries: Row[]) {
  const s = createFakeDb({ contact_inquiries: inquiries, inquiry_messages: [], ai_drafts: [] });
  db = s.db;
  selects = [];
  const real = s.client;
  state.client = {
    ...real,
    from: (table: string) => {
      const q = real.from(table) as unknown as { select: (c?: string, o?: unknown) => unknown };
      const orig = q.select.bind(q);
      q.select = (c?: string, o?: unknown) => {
        selects.push({ table, columns: c ?? "*" });
        return orig(c, o);
      };
      return q;
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.staff = VEJLE;
  setup([]);
});

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const get = (url: string) => new Request(url) as unknown as NextRequest;

describe("1: gamle beskedrute skjuler interne noter", () => {
  it("returnerer ikke is_internal-rækker", async () => {
    setup([inquiryRow("i1")]);
    db.tables.inquiry_messages.push(
      { id: "m1", inquiry_id: "i1", sender: "staff", channel: "email", body: "Sendt svar", is_internal: false, created_at: "1" },
      { id: "m2", inquiry_id: "i1", sender: "staff", channel: "system", body: "Intern note", is_internal: true, created_at: "2" },
    );
    const res = await messages(get("http://x/m"), params("i1"));
    const json = await res.json();
    expect(json.map((m: { id: string }) => m.id)).toEqual(["m1"]);
  });
});

describe("2: tællere henter aldrig tekst", () => {
  it("counts-forespørgslerne indeholder ikke body, message eller draft_body", async () => {
    setup([inquiryRow("i1"), inquiryRow("i2")]);
    await list(get("http://x/api/admin/inbox?view=ch-mail"));
    const inqSelects = selects.filter((s) => s.table === "contact_inquiries").map((s) => s.columns);
    const countsInquiry = inqSelects.find((c) => !c.includes("message"));
    expect(countsInquiry).toBeDefined();
    const msgSelects = selects.filter((s) => s.table === "inquiry_messages").map((s) => s.columns);
    const draftSelects = selects.filter((s) => s.table === "ai_drafts").map((s) => s.columns);
    // listen henter body; tællerne gør ikke: der er præcis én tekstfri variant af hver
    expect(msgSelects.filter((c) => !c.includes("body"))).toHaveLength(1);
    expect(msgSelects.filter((c) => c.includes("body"))).toHaveLength(1);
    expect(draftSelects.filter((c) => !c.includes("draft_body"))).toHaveLength(1);
    expect(countsInquiry).not.toContain("body");
  });
  it("preview er højst 160 tegn", async () => {
    setup([inquiryRow("i1", { message: "x".repeat(500) })]);
    const json = await (await list(get("http://x/api/admin/inbox?view=ch-mail"))).json();
    expect(json.rows[0].preview.length).toBeLessThanOrEqual(160);
    expect(json.rows[0].preview.length).toBeGreaterThan(100);
  });
});

describe("4: dom fjerner sagen fra Besvaret af Fiks, truncated", () => {
  it("auto_sent-udkast med dom er ikke fiksAnswered", async () => {
    setup([inquiryRow("f1", { status: "besvaret" }), inquiryRow("f2", { status: "besvaret" })]);
    db.tables.ai_drafts.push(
      { id: "d1", inquiry_id: "f1", status: "auto_sent", needs_human: false, review_verdict: "correct", created_at: "2026-11-19T09:00:00Z" },
      { id: "d2", inquiry_id: "f2", status: "auto_sent", needs_human: false, review_verdict: null, created_at: "2026-11-19T09:00:00Z" },
    );
    const json = await (await list(get("http://x/api/admin/inbox?view=fiks"))).json();
    expect(json.rows.map((r: { id: string }) => r.id)).toEqual(["f2"]);
    expect(json.truncated).toBe(false);
  });
  it("truncated er true, når SQL-grænsen er nået", async () => {
    const rows: Row[] = [];
    for (let n = 0; n < 200; n++) rows.push(inquiryRow(`x${n}`));
    setup(rows);
    const json = await (await list(get("http://x/api/admin/inbox?view=ch-mail"))).json();
    expect(json.rows).toHaveLength(200);
    expect(json.truncated).toBe(true);
  });
  it("truncated er false for en lille liste", async () => {
    setup([inquiryRow("a"), inquiryRow("b")]);
    const json = await (await list(get("http://x/api/admin/inbox?view=ch-mail"))).json();
    expect(json.truncated).toBe(false);
  });
});
