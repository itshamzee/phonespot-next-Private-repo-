import { describe, it, expect, vi } from "vitest";
import { logBuybackEvent } from "../events";
import { makeFakeClient } from "./fake-supabase";

describe("logBuybackEvent", () => {
  it("inserts the event into buyback_events", async () => {
    const { client, calls } = makeFakeClient({ buyback_events: [] });
    await logBuybackEvent(client, {
      type: "priced",
      summary: "iPhone 12 128GB prissat til 1.450 kr",
      inquiryId: "inq-1",
    });
    const call = calls.find((c) => c.table === "buyback_events");
    expect(call).toBeTruthy();
    const insert = call?.ops.find(([op]) => op === "insert");
    expect(insert?.[1]).toMatchObject({
      type: "priced",
      severity: "info",
      summary: "iPhone 12 128GB prissat til 1.450 kr",
      inquiry_id: "inq-1",
    });
  });

  it("defaults severity to info and optional ids to null", async () => {
    const { client, calls } = makeFakeClient({ buyback_events: [] });
    await logBuybackEvent(client, { type: "resumed", summary: "Automatik genstartet" });
    const insert = calls.find((c) => c.table === "buyback_events")?.ops.find(([op]) => op === "insert");
    expect(insert?.[1]).toMatchObject({ severity: "info", inquiry_id: null, offer_id: null, detail: null });
  });

  it("carries severity and detail through", async () => {
    const { client, calls } = makeFakeClient({ buyback_events: [] });
    await logBuybackEvent(client, {
      type: "bounced",
      severity: "critical",
      summary: "Tilbudsmail bouncede",
      detail: { email: "kunde@example.com" },
    });
    const insert = calls.find((c) => c.table === "buyback_events")?.ops.find(([op]) => op === "insert");
    expect(insert?.[1]).toMatchObject({ severity: "critical", detail: { email: "kunde@example.com" } });
  });

  it("never throws when the insert fails", async () => {
    const client = {
      from: vi.fn(() => {
        throw new Error("db down");
      }),
    } as never;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(logBuybackEvent(client, { type: "error", summary: "noget gik galt" })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
