import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendReply, ReplyError } from "@/lib/inquiries/reply";

type Row = Record<string, unknown>;
type Call = { table: string; op: "insert" | "update" | "call"; payload: Row };

/** Chainable fake with select/eq/single and insert/update that record every call in order. */
function fakeSupabase(tables: Record<string, Row[]>, calls: Call[], failInsert: string[] = []) {
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
        const res = failInsert.includes(table)
          ? { data: null, error: { message: "db down" } }
          : { data: { id: "msg-1", ...payload }, error: null };
        const chain = {
          select: () => chain,
          single: async () => res,
          then: (resolve: (v: unknown) => void) => resolve({ error: res.error }),
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

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

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

  it("sms hvor udbyderen fejler: send_failed, én failed-log, ingen besked, status uændret", async () => {
    const calls: Call[] = [];
    const sb = fakeSupabase({ contact_inquiries: [{ id: "i1", phone: "12345678" }] }, calls);
    const sendSms = vi.fn().mockResolvedValue({ success: false, messageId: null, error: "x" });
    const err = await sendReply(sb, { ...baseArgs, channel: "sms" }, { sendSms }).catch((e) => e);
    expect(err).toBeInstanceOf(ReplyError);
    expect(err.code).toBe("send_failed");
    expect(err.message).toBe("Beskeden kunne ikke sendes. Prøv igen.");
    const logs = calls.filter((c) => c.table === "sms_log");
    expect(logs).toHaveLength(1);
    expect(logs[0].payload).toMatchObject({ status: "failed", inquiry_id: "i1" });
    expect(calls.filter((c) => c.table === "inquiry_messages")).toHaveLength(0);
    expect(calls.filter((c) => c.table === "contact_inquiries")).toHaveLength(0);
  });

  it("sms hvor sendSms kaster: behandles som fejlet afsendelse", async () => {
    const calls: Call[] = [];
    const sb = fakeSupabase({ contact_inquiries: [{ id: "i1", phone: "12345678" }] }, calls);
    const sendSms = vi.fn().mockRejectedValue(new Error("network"));
    const err = await sendReply(sb, { ...baseArgs, channel: "sms" }, { sendSms }).catch((e) => e);
    expect(err).toBeInstanceOf(ReplyError);
    expect(err.code).toBe("send_failed");
    expect(err.message).not.toContain("network");
    const logs = calls.filter((c) => c.table === "sms_log");
    expect(logs).toHaveLength(1);
    expect(logs[0].payload).toMatchObject({ status: "failed", inquiry_id: "i1" });
    expect(calls.filter((c) => c.table === "inquiry_messages")).toHaveLength(0);
    expect(calls.filter((c) => c.table === "contact_inquiries")).toHaveLength(0);
  });

  it("sms sendt men tråd-insert fejler: saved_failed, sms_log sent, status besvaret", async () => {
    const calls: Call[] = [];
    const sb = fakeSupabase({ contact_inquiries: [{ id: "i1", phone: "12345678" }] }, calls, ["inquiry_messages"]);
    const sendSms = vi.fn().mockResolvedValue({ success: true, messageId: "pm1", error: null });
    const err = await sendReply(sb, { ...baseArgs, channel: "sms" }, { sendSms }).catch((e) => e);
    expect(err).toBeInstanceOf(ReplyError);
    expect(err.code).toBe("saved_failed");
    expect(err.message).toBe("SMS'en er sendt, men kunne ikke gemmes i tråden. Send den ikke igen.");
    expect(calls.find((c) => c.table === "sms_log")?.payload).toMatchObject({ status: "sent", inquiry_id: "i1" });
    expect(calls.find((c) => c.table === "contact_inquiries")?.payload).toMatchObject({ status: "besvaret" });
  });

  it("sms der lykkes: sendSms, sms_log, inquiry_messages, status besvaret i rækkefølge", async () => {
    const calls: Call[] = [];
    const sb = fakeSupabase({ contact_inquiries: [{ id: "i1", phone: "12345678" }] }, calls);
    const sendSms = vi.fn().mockImplementation(async () => {
      calls.push({ table: "sendSms", op: "call", payload: {} });
      return { success: true, messageId: "pm1", error: null };
    });
    const res = await sendReply(sb, { ...baseArgs, channel: "sms" }, { sendSms });
    expect(sendSms).toHaveBeenCalledWith("12345678", "Hej fra butikken");
    expect(res).toEqual({ messageRowId: "msg-1", channel: "sms" });
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual([
      "sendSms:call",
      "sms_log:insert",
      "inquiry_messages:insert",
      "contact_inquiries:update",
    ]);
    const byTable = (t: string) => calls.find((c) => c.table === t)!.payload;
    expect(byTable("sms_log")).toMatchObject({ status: "sent", inquiry_id: "i1", provider_message_id: "pm1" });
    expect(byTable("inquiry_messages")).toMatchObject({ channel: "sms", sender: "staff", staff_name: "Mads" });
    expect(byTable("contact_inquiries")).toMatchObject({ status: "besvaret" });
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
