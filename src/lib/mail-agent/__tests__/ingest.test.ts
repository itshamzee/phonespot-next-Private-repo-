import { describe, it, expect } from "vitest";
import { ingestInboundEmail } from "@/lib/mail-agent/ingest";

type Row = Record<string, unknown>;

/**
 * Minimal in-memory stand-in for the Supabase query builder covering exactly
 * the chains ingest.ts uses: select/eq/ilike/gte/in/order/limit/maybeSingle/single,
 * insert().select().single(), update().eq().
 */
function fakeSupabase(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  let idCounter = 1;

  function query(table: string) {
    const rows = tables[table] ?? (tables[table] = []);
    const filters: ((r: Row) => boolean)[] = [];
    let order: { col: string; asc: boolean } | null = null;
    let lim: number | null = null;

    function run() {
      let out = rows.filter((r) => filters.every((f) => f(r)));
      if (order) {
        const { col, asc } = order;
        out = [...out].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
      }
      if (lim) out = out.slice(0, lim);
      return out;
    }

    const api = {
      select() {
        return api;
      },
      eq(col: string, v: unknown) {
        filters.push((r) => r[col] === v);
        return api;
      },
      in(col: string, vs: unknown[]) {
        filters.push((r) => vs.includes(r[col]));
        return api;
      },
      order(col: string, o: { ascending: boolean }) {
        order = { col, asc: o.ascending };
        return api;
      },
      limit(n: number) {
        lim = n;
        return api;
      },
      async maybeSingle() {
        const r = run();
        return { data: r[0] ?? null, error: null };
      },
      async single() {
        const r = run();
        return { data: r[0] ?? null, error: r[0] ? null : { message: "none" } };
      },
      insert(obj: Row) {
        const row = { id: `id-${idCounter++}`, created_at: new Date().toISOString(), ...obj };
        rows.push(row);
        return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
      },
      update(patch: Row) {
        return {
          eq: async (col: string, v: unknown) => {
            rows.filter((r) => r[col] === v).forEach((r) => Object.assign(r, patch));
            return { error: null };
          },
        };
      },
      ilike(col: string, pattern: string) {
        // Postgres ILIKE: unescaped % and _ are wildcards, backslash escapes them.
        const lit = (ch: string) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        let re = "";
        for (let i = 0; i < pattern.length; i++) {
          const c = pattern[i];
          if (c === "\\" && i + 1 < pattern.length) re += lit(pattern[++i]);
          else if (c === "%" || c === "*") re += ".*"; // PostgREST treats * as %
          else if (c === "_") re += ".";
          else re += lit(c);
        }
        const rx = new RegExp(`^${re}$`, "i");
        filters.push((r) => typeof r[col] === "string" && rx.test(r[col] as string));
        return api;
      },
      neq(col: string, v: unknown) {
        filters.push((r) => r[col] !== v);
        return api;
      },
      gte(col: string, v: unknown) {
        filters.push((r) => r[col] != null && String(r[col]) >= String(v));
        return api;
      },
      then(resolve: (v: unknown) => void) {
        resolve({ data: run(), error: null });
      },
    };
    return api;
  }

  return { from: query, _tables: tables };
}

const base = {
  fromEmail: "kunde@example.com",
  fromName: "Kunde",
  subject: "Min ordre",
  text: "Hej, hvor er min pakke?",
  inReplyTo: null,
  messageId: "<m1@example.com>",
  mailbox: "info@phonespot.dk",
};

describe("ingestInboundEmail", () => {
  it("creates a new inquiry and message when nothing matches", async () => {
    const sb = fakeSupabase({});
    const r = await ingestInboundEmail(sb as never, base);
    expect(r.created).toBe(true);
    expect(r.reopened).toBe(false);
    expect(sb._tables.contact_inquiries[0]).toMatchObject({
      email: "kunde@example.com",
      source: "email",
      mailbox: "info@phonespot.dk",
      status: "ny",
      name: "Kunde",
    });
    expect(sb._tables.inquiry_messages[0]).toMatchObject({
      inquiry_id: r.inquiryId,
      sender: "customer",
      channel: "email",
      message_id: "<m1@example.com>",
    });
  });

  it("matches by In-Reply-To against inquiry_messages.message_id and reopens a closed inquiry", async () => {
    const sb = fakeSupabase({
      contact_inquiries: [
        { id: "inq-1", email: "kunde@example.com", status: "besvaret", subject: "Andet", created_at: "2026-01-01" },
      ],
      inquiry_messages: [
        { id: "msg-1", inquiry_id: "inq-1", message_id: "<staff@phonespot.dk>", sender: "staff" },
      ],
    });
    const r = await ingestInboundEmail(sb as never, { ...base, inReplyTo: "<staff@phonespot.dk>" });
    expect(r).toMatchObject({ inquiryId: "inq-1", created: false, reopened: true });
    expect(sb._tables.contact_inquiries[0].status).toBe("venter_paa_svar");
  });

  it("matches by In-Reply-To against mail_log.message_id first", async () => {
    const sb = fakeSupabase({
      contact_inquiries: [{ id: "inq-9", email: "kunde@example.com", status: "ny", subject: "x", created_at: "2026-01-01" }],
      mail_log: [{ id: "log-1", inquiry_id: "inq-9", message_id: "<resend@reply.phonespot.dk>" }],
    });
    const r = await ingestInboundEmail(sb as never, { ...base, inReplyTo: "<resend@reply.phonespot.dk>" });
    expect(r.inquiryId).toBe("inq-9");
    expect(r.reopened).toBe(false);
  });

  it("falls back to the newest open inquiry for the sender, preferring a subject match", async () => {
    const sb = fakeSupabase({
      contact_inquiries: [
        { id: "inq-old", email: "kunde@example.com", status: "ny", subject: "Min ordre", created_at: "2026-01-01" },
        { id: "inq-new", email: "kunde@example.com", status: "ny", subject: "Reparation", created_at: "2026-02-01" },
      ],
    });
    const r = await ingestInboundEmail(sb as never, { ...base, subject: "Re: Min ordre" });
    expect(r.inquiryId).toBe("inq-old");

    const r2 = await ingestInboundEmail(sb as never, { ...base, subject: "Noget helt andet" });
    expect(r2.inquiryId).toBe("inq-new");
  });

  it("does not match an open thread through a * wildcard in the sender address", async () => {
    const sb = fakeSupabase({
      contact_inquiries: [
        { id: "inq-1", email: "anna@gmail.com", status: "ny", subject: "Min ordre", created_at: "2026-01-01" },
      ],
    });
    const r = await ingestInboundEmail(sb as never, { ...base, fromEmail: "*@gmail.com", subject: "Min ordre" });
    expect(r.created).toBe(true);
    expect(r.inquiryId).not.toBe("inq-1");
    expect(sb._tables.contact_inquiries).toHaveLength(2);
  });

  it("ignores closed inquiries when matching by sender", async () => {
    const sb = fakeSupabase({
      contact_inquiries: [
        { id: "inq-closed", email: "kunde@example.com", status: "lukket", subject: "Min ordre", created_at: "2026-01-01" },
      ],
    });
    const r = await ingestInboundEmail(sb as never, base);
    expect(r.created).toBe(true);
    expect(r.inquiryId).not.toBe("inq-closed");
  });

  describe("thread matching by sender", () => {
    const NOW = new Date("2026-11-19T12:00:00Z");
    const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
    const closed = (days: number, subject = "Min ordre") => ({
      id: "inq-closed",
      email: "kunde@example.com",
      status: "lukket",
      subject,
      created_at: "2026-01-01",
      last_inbound_at: daysAgo(days),
    });

    it("matcher uanset store og små bogstaver", async () => {
      const sb = fakeSupabase({
        contact_inquiries: [
          { id: "inq-1", email: "Kunde@Example.dk", status: "ny", subject: "Min ordre", created_at: "2026-01-01" },
        ],
      });
      const r = await ingestInboundEmail(sb as never, { ...base, fromEmail: "kunde@example.dk" }, NOW);
      expect(r.created).toBe(false);
      expect(r.inquiryId).toBe("inq-1");
    });

    it("lægger aldrig en mail på en chat med samme adresse (adressen i chatten er ikke verificeret)", async () => {
      const sb = fakeSupabase({
        contact_inquiries: [
          { id: "chat-1", channel: "chat", email: "kunde@example.dk", status: "ny", subject: "Min ordre", created_at: "2026-01-02" },
        ],
      });
      const r = await ingestInboundEmail(sb as never, { ...base, fromEmail: "kunde@example.dk" }, NOW);
      expect(r.created).toBe(true);
      expect(r.inquiryId).not.toBe("chat-1");
    });

    it("behandler % og _ i adressen som almindelige tegn", async () => {
      const sb = fakeSupabase({
        contact_inquiries: [
          { id: "inq-1", email: "andre@example.dk", status: "ny", subject: "Min ordre", created_at: "2026-01-01" },
        ],
      });
      const r = await ingestInboundEmail(sb as never, { ...base, fromEmail: "%@example.dk" }, NOW);
      expect(r.created).toBe(true);
    });

    it("svar på lukket sag genåbner den", async () => {
      const sb = fakeSupabase({ contact_inquiries: [closed(10)] });
      const r = await ingestInboundEmail(sb as never, { ...base, subject: "Re: Min ordre" }, NOW);
      expect(r.inquiryId).toBe("inq-closed");
      expect(r.created).toBe(false);
      expect(r.reopened).toBe(true);
      expect(sb._tables.contact_inquiries[0].status).toBe("ny");
    });

    it("gammel lukket sag giver ny tråd", async () => {
      const sb = fakeSupabase({ contact_inquiries: [closed(40)] });
      const r = await ingestInboundEmail(sb as never, { ...base, subject: "Re: Min ordre" }, NOW);
      expect(r.created).toBe(true);
      expect(r.inquiryId).not.toBe("inq-closed");
    });

    it("lukket sag med andet emne giver ny tråd", async () => {
      const sb = fakeSupabase({ contact_inquiries: [closed(10, "Reparation")] });
      const r = await ingestInboundEmail(sb as never, { ...base, subject: "Re: Min ordre" }, NOW);
      expect(r.created).toBe(true);
      expect(r.inquiryId).not.toBe("inq-closed");
    });

    it("lukket sag uden last_inbound_at genåbnes ikke af afsendermatch", async () => {
      const sb = fakeSupabase({
        contact_inquiries: [{ ...closed(10), last_inbound_at: null }],
      });
      const r = await ingestInboundEmail(sb as never, { ...base, subject: "Re: Min ordre" }, NOW);
      expect(r.created).toBe(true);
      expect(r.inquiryId).not.toBe("inq-closed");
      expect(sb._tables.contact_inquiries[0].status).toBe("lukket");
    });

    it("lukket sag med tomt emne efter Re: matcher ikke alt", async () => {
      const sb = fakeSupabase({ contact_inquiries: [closed(10, "Re:")] });
      const r = await ingestInboundEmail(sb as never, { ...base, subject: "Re: Min ordre" }, NOW);
      expect(r.created).toBe(true);
      expect(r.inquiryId).not.toBe("inq-closed");
    });

    it("tom afsender matcher aldrig en ældre række med tom email", async () => {
      const sb = fakeSupabase({
        contact_inquiries: [
          { id: "inq-legacy", email: "", status: "ny", subject: "Min ordre", created_at: "2026-01-01" },
        ],
      });
      const r = await ingestInboundEmail(sb as never, { ...base, fromEmail: "" }, NOW);
      expect(r.created).toBe(true);
      expect(r.inquiryId).not.toBe("inq-legacy");
    });

    it("eksisterende tråd beholder sin kanal", async () => {
      const sb = fakeSupabase({
        contact_inquiries: [
          { id: "inq-1", email: "kunde@example.com", status: "ny", subject: "Min ordre", channel: "form", created_at: "2026-01-01" },
        ],
      });
      await ingestInboundEmail(sb as never, base, NOW);
      expect(sb._tables.contact_inquiries[0]).toMatchObject({ channel: "form", last_inbound_at: NOW.toISOString() });
    });

    it("indgående mail sætter last_inbound_at og channel", async () => {
      const sb = fakeSupabase({
        contact_inquiries: [
          { id: "inq-1", email: "kunde@example.com", status: "ny", subject: "Min ordre", created_at: "2026-01-01" },
        ],
      });
      await ingestInboundEmail(sb as never, base, NOW);
      expect(sb._tables.contact_inquiries[0]).toMatchObject({ last_inbound_at: NOW.toISOString() });

      const sb2 = fakeSupabase({});
      await ingestInboundEmail(sb2 as never, base, NOW);
      expect(sb2._tables.contact_inquiries[0]).toMatchObject({ last_inbound_at: NOW.toISOString(), channel: "email" });
    });

    it("indgående mail på en udsat tråd nulstiller snoozed_until", async () => {
      const sb = fakeSupabase({
        contact_inquiries: [
          {
            id: "inq-1",
            email: "kunde@example.com",
            status: "ny",
            subject: "Min ordre",
            snoozed_until: "2026-11-25T08:00:00.000Z",
            created_at: "2026-01-01",
          },
        ],
      });
      await ingestInboundEmail(sb as never, base, NOW);
      expect(sb._tables.contact_inquiries[0].snoozed_until).toBeNull();
    });
  });
});
