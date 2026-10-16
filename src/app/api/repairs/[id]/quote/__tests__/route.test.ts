// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const applyQuotePrice = vi.fn();
const inserts: { table: string; row: Record<string, unknown> }[] = [];

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...a: unknown[]) => send(...a) };
  },
}));
vi.mock("@/lib/repairs/ticket-access", () => ({
  requireTicketAccess: async () => ({ ok: true, staff: { id: "s1", role: "owner" }, ticketStoreId: "vejle" }),
}));
vi.mock("@/lib/repairs/quote-price", () => ({ applyQuotePrice: (...a: unknown[]) => applyQuotePrice(...a) }));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              id: "t1",
              ticket_number: "PS-2026-0009",
              status: "modtaget",
              customer_name: "Mette",
              customer_email: "m@example.com",
              device_type: "smartphone",
              device_model: "iPhone 13",
              service_type: "Skærm",
              store_id: "vejle",
            },
            error: null,
          }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return { select: () => ({ single: async () => ({ data: { id: "q1" }, error: null }) }), then: (f: (v: unknown) => void) => f({ error: null }) };
      },
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}));

import { POST } from "../route";
import { CaseError } from "@/lib/repairs/case-errors";

const call = (body: Record<string, unknown>) =>
  POST(new Request("http://localhost/api/repairs/t1/quote", { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: "t1" }),
  });

beforeEach(() => {
  send.mockReset().mockResolvedValue({ error: null });
  applyQuotePrice.mockReset().mockResolvedValue(true);
  inserts.length = 0;
});

describe("POST /api/repairs/[id]/quote", () => {
  it("aligns the case lines to the quote before saving, and the email shows the same amount", async () => {
    const res = await call({ price_dkk: 999 });
    expect(res.status).toBe(200);
    expect(applyQuotePrice).toHaveBeenCalledWith(expect.anything(), "t1", 99_900, expect.objectContaining({ id: "s1" }));
    expect(inserts.find((i) => i.table === "repair_quotes")?.row.price_dkk).toBe(999);
    expect(send.mock.calls[0][0].text).toContain("Pris: 999 DKK");
  });
  it("stores nothing and sends nothing when the quote is below the lines", async () => {
    applyQuotePrice.mockRejectedValueOnce(new CaseError("quote_below_lines", "Ret linjepriserne på sagen først", 409));
    const res = await call({ price_dkk: 100 });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Ret linjepriserne");
    expect(inserts).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects missing or non-positive prices", async () => {
    expect((await call({})).status).toBe(400);
    expect((await call({ price_dkk: -5 })).status).toBe(400);
    expect(applyQuotePrice).not.toHaveBeenCalled();
  });
});
