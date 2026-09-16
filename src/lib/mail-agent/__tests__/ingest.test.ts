import { describe, it, expect } from "vitest";
import { ingestInboundEmail } from "@/lib/mail-agent/ingest";

type Row = Record<string, unknown>;

/**
 * Minimal in-memory stand-in for the Supabase query builder covering exactly
 * the chains ingest.ts uses: select/eq/in/order/limit/maybeSingle/single,
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
});
