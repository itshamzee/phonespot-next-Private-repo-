// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { computeFrisbiiSignature } from "@/lib/payments/frisbii/webhook-signature";

const complete = vi.hoisted(() => vi.fn());
vi.mock("@/lib/payments/frisbii/order-payment", () => ({ completeFrisbiiOrder: complete }));

import { POST } from "../route";

const SECRET = "whsec_test";

function signed(body: Record<string, unknown>, secret = SECRET) {
  const payload = { id: "wh_1", event_id: "ev_1", timestamp: "2026-11-03T12:00:00Z", ...body };
  return { ...payload, signature: computeFrisbiiSignature(secret, payload.timestamp, payload.id) };
}

function req(body: unknown) {
  return new NextRequest("https://example.invalid/api/webhook/frisbii", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/webhook/frisbii", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.FRISBII_WEBHOOK_SECRET = SECRET;
    delete process.env.FRISBII_WEBHOOK_SECRET_PREVIOUS;
  });

  it("afviser forkert signatur", async () => {
    const res = await POST(req(signed({ event_type: "invoice_authorized", invoice: "S-1" }, "andet")));
    expect(res.status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
  });

  it("færdiggør ordren ved invoice_authorized og invoice_settled", async () => {
    complete.mockResolvedValue("completed");
    expect((await POST(req(signed({ event_type: "invoice_authorized", invoice: "S-1" })))).status).toBe(200);
    expect((await POST(req(signed({ event_type: "invoice_settled", invoice: "S-1" })))).status).toBe(200);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenCalledWith("S-1");
  });

  it("kvitterer for andre events uden at røre ordren", async () => {
    const res = await POST(req(signed({ event_type: "customer_created", customer: "c1" })));
    expect(res.status).toBe(200);
    expect(complete).not.toHaveBeenCalled();
  });

  it("svarer 500, så Frisbii prøver igen, når færdiggørelsen fejler", async () => {
    complete.mockRejectedValue(new Error("db nede"));
    const res = await POST(req(signed({ event_type: "invoice_authorized", invoice: "S-1" })));
    expect(res.status).toBe(500);
  });

  it("svarer 500 uden konfigureret secret", async () => {
    delete process.env.FRISBII_WEBHOOK_SECRET;
    const res = await POST(req(signed({ event_type: "invoice_authorized", invoice: "S-1" })));
    expect(res.status).toBe(500);
  });
});
