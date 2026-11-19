import { describe, it, expect, vi } from "vitest";
import { sendReply, ReplyError } from "@/lib/inquiries/reply";

type Row = Record<string, unknown>;
type Call = { table: string; op: "insert" | "update"; payload: Row };

/** Chainable fake with select/eq/single and insert/update that record every call in order. */
function fakeSupabase(tables: Record<string, Row[]>, calls: Call[]) {
  function query(table: string) {
    const rows = tables[table] ?? [];
    const filters: ((r: Row) => boolean)[] = [];
    const run = () => rows.filter((r) => filters.every((f) => f(r)));
    const api = {
      select: () => api,
      eq: (col: string, v: unknown) => {
        filters.push((r) => r[col] === v);
        return api;
      },
      single: async () => {
        const row = run()[0];
        return row ? { data: row, error: null } : { data: null, error: { message: "not found" } };
      },
      insert: (payload: Row) => {
        calls.push({ table, op: "insert", payload });
        const res = { data: { id: "msg-1", ...payload }, error: null };
        const chain = {
          select: () => chain,
          single: async () => res,
          then: (resolve: (v: unknown) => void) => resolve({ error: null }),
        };
        return chain;
      },
      update: (payload: Row) => {
        calls.push({ table, op: "update", payload });
        return api;
      },
      then: (resolve: (v: unknown) => void) => resolve({ error: null }),
    };
    return api;
  }
  return { from: query } as never;
}

const baseArgs = { inquiryId: "i1", body: "Hej fra butikken", staffName: "Mads" };

describe("sendReply", () => {
  it("sms uden telefon: kaster no_phone og skriver ingenting", async () => {
    const calls: Call[] = [];
    const sb = fakeSupabase({ contact_inquiries: [{ id: "i1", phone: null, email: "a@b.dk" }] }, calls);
    const sendSms = vi.fn();
    await expect(sendReply(sb, { ...baseArgs, channel: "sms" }, { sendSms })).rejects.toMatchObject({
      name: "ReplyError",
      code: "no_phone",
    });
    expect(sendSms).not.toHaveBeenCalled();
    expect(calls.filter((c) => c.table === "inquiry_messages")).toHaveLength(0);
    expect(calls.filter((c) => c.table === "contact_inquiries")).toHaveLength(0);
  });

  it("sms hvor udbyderen fejler: send_failed, failed-log, ingen besked, status uændret", async () => {
    const calls: Call[] = [];
    const sb = fakeSupabase({ contact_inquiries: [{ id: "i1", phone: "12345678" }] }, calls);
    const sendSms = vi.fn().mockResolvedValue({ success: false, messageId: null, error: "x" });
    await expect(sendReply(sb, { ...baseArgs, channel: "sms" }, { sendSms })).rejects.toBeInstanceOf(ReplyError);
    await expect(sendReply(sb, { ...baseArgs, channel: "sms" }, { sendSms })).rejects.toMatchObject({
      code: "send_failed",
    });
    const logs = calls.filter((c) => c.table === "sms_log");
    expect(logs).toHaveLength(2);
    expect(logs[0].payload).toMatchObject({ status: "failed", inquiry_id: "i1" });
    expect(calls.filter((c) => c.table === "inquiry_messages")).toHaveLength(0);
    expect(calls.filter((c) => c.table === "contact_inquiries")).toHaveLength(0);
  });

  it("sms der lykkes: sendSms, sms_log, inquiry_messages, status besvaret i rækkefølge", async () => {
    const calls: Call[] = [];
    const order: string[] = [];
    const sb = fakeSupabase({ contact_inquiries: [{ id: "i1", phone: "12345678" }] }, calls);
    const sendSms = vi.fn().mockImplementation(async () => {
      order.push("sendSms");
      return { success: true, messageId: "pm1", error: null };
    });
    const res = await sendReply(sb, { ...baseArgs, channel: "sms" }, { sendSms });
    expect(sendSms).toHaveBeenCalledWith("12345678", "Hej fra butikken");
    expect(res).toEqual({ messageRowId: "msg-1", channel: "sms" });
    // sendSms is called before any write
    expect(order).toEqual(["sendSms"]);
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual([
      "sms_log:insert",
      "inquiry_messages:insert",
      "contact_inquiries:update",
    ]);
    expect(calls[0].payload).toMatchObject({ status: "sent", inquiry_id: "i1", provider_message_id: "pm1" });
    expect(calls[1].payload).toMatchObject({ channel: "sms", sender: "staff", staff_name: "Mads" });
    expect(calls[2].payload).toMatchObject({ status: "besvaret" });
  });

  it("email: delegerer til sendEmail og returnerer dens messageRowId", async () => {
    const calls: Call[] = [];
    const sb = fakeSupabase({}, calls);
    const sendEmail = vi.fn().mockResolvedValue({ messageRowId: "m9", transport: "resend", messageId: null });
    const res = await sendReply(sb, { ...baseArgs, channel: "email" }, { sendEmail });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(sb, { inquiryId: "i1", body: "Hej fra butikken", staffName: "Mads" });
    expect(res).toEqual({ messageRowId: "m9", channel: "email" });
  });
});
