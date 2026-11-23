// @vitest-environment node
//
// Store access on POST /api/pos/receipt/send and POST /api/pos/terminal/cancel:
// real assertLocationAccess, only the supabase rows are faked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const sendMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/email/resend", () => ({ resend: { emails: { send: (...a: unknown[]) => sendMock(...a) } }, EMAIL_FROM: "x@y.dk" }));
vi.mock("@/lib/pos/receipt-data", () => ({ renderReceiptPdf: vi.fn().mockResolvedValue(Buffer.from("PDF")) }));
vi.mock("@/lib/pos/terminal-flow", () => ({
  terminalForLocation: vi.fn().mockResolvedValue({ terminal: { kind: "manual" }, locationSlug: "vejle" }),
}));

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows: Record<string, Array<Record<string, unknown>>> = {};

function builder(table: string) {
  const eqs: Array<[string, unknown]> = [];
  const b: Record<string, unknown> = {};
  for (const m of ["select", "in", "order", "limit"]) b[m] = () => b;
  b.eq = (k: string, v: unknown) => (eqs.push([k, v]), b);
  b.maybeSingle = async () => ({ data: (rows[table] ?? []).find((r) => eqs.every(([k, v]) => r[k] === v)) ?? null, error: null });
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows[table] ?? [], error: null });
  return b;
}
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({ from: builder, rpc: vi.fn() }) }));

import { POST as sendPOST } from "../receipt/send/route";
import { POST as cancelPOST } from "../terminal/cancel/route";

const post = (fn: (r: NextRequest) => Promise<Response>, path: string, body: unknown) =>
  fn(new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) }));

const base = { id: U(1), name: "T", email: null, permissions: [] };
const owner = { ...base, role: "owner", location_id: null, location_slug: null };
const vejle = { ...base, role: "employee", location_id: U(20), location_slug: "vejle" };

beforeEach(() => {
  requireStaffMock.mockReset();
  sendMock.mockClear();
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
  ];
  rows.orders = [
    { id: U(40), type: "pos", receipt_number: "V1-000001", order_number: "P1", location_id: U(20) },
    { id: U(41), type: "pos", receipt_number: "S1-000001", order_number: "P2", location_id: U(30) },
  ];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/pos/receipt/send store access", () => {
  it("a Vejle employee cannot send a Slagelse receipt", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await post(sendPOST, "/api/pos/receipt/send", { channel: "email", orderId: U(41), to: "a@b.dk" });
    expect(res.status).toBe(403);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("a Vejle employee can send a Vejle receipt, and the owner any receipt", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await post(sendPOST, "/api/pos/receipt/send", { channel: "email", orderId: U(40), to: "a@b.dk" })).status).toBe(200);
    requireStaffMock.mockResolvedValue(owner);
    expect((await post(sendPOST, "/api/pos/receipt/send", { channel: "email", orderId: U(41), to: "a@b.dk" })).status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/pos/terminal/cancel store access", () => {
  it("a Vejle employee cannot cancel on the Slagelse terminal", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await post(cancelPOST, "/api/pos/terminal/cancel", { reference: "ref-00001", locationId: U(30) });
    expect(res.status).toBe(403);
  });

  it("a Vejle employee can cancel on the Vejle terminal", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await post(cancelPOST, "/api/pos/terminal/cancel", { reference: "ref-00001", locationId: U(20) });
    expect(res.status).toBe(200);
  });
});
