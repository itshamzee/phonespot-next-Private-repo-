// @vitest-environment node
//
// POST /api/trade-in/receipts/[id]/confirm and GET .../pdf: real receipt-access
// (store scope); the rpc, storage, mail and PDF rendering are faked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const requireStaffMock = vi.fn();
const lookupMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: (...a: unknown[]) => requireStaffMock(...a),
  lookupStaffById: (...a: unknown[]) => lookupMock(...a),
}));
vi.mock("@/lib/auth/operator", () => ({
  OPERATOR_COOKIE: "ps_operator",
  operatorSecret: () => "secret",
  readOperator: () => ({ loggedInId: "00000000-0000-4000-8000-000000000002", staffId: "00000000-0000-4000-8000-000000000003" }),
}));

const afterFns: Array<() => Promise<void>> = [];
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => Promise<void>) => void afterFns.push(fn),
}));

const sendMock = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  resend: { emails: { send: (...a: unknown[]) => sendMock(...a) } },
  EMAIL_FROM: "PhoneSpot <info@phonespot.dk>",
}));

const loadDataMock = vi.fn();
vi.mock("@/lib/opkoeb/slutseddel-data", () => ({ loadSlutseddelData: (...a: unknown[]) => loadDataMock(...a) }));
const renderMock = vi.fn();
vi.mock("@/lib/pdf/slutseddel", () => ({ renderSlutseddelPdf: (...a: unknown[]) => renderMock(...a) }));

const rows: Record<string, Array<Record<string, unknown>>> = {};
const rpcMock = vi.fn();
const uploadMock = vi.fn();
const docUpdates: Array<{ patch: Record<string, unknown>; col: string; val: unknown }> = [];

function builder(table: string) {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  let patch: Record<string, unknown> | null = null;
  let orderBy: string | null = null;
  const matching = () => {
    const m = (rows[table] ?? []).filter((r) => filters.every((f) => f(r)));
    return orderBy ? [...m].sort((a, b) => String(a[orderBy!]).localeCompare(String(b[orderBy!]))) : m;
  };
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.order = (k: string) => ((orderBy = k), b);
  b.neq = (k: string, v: unknown) => (filters.push((r) => r[k] !== v), b);
  b.eq = (k: string, v: unknown) => {
    filters.push((r) => r[k] === v);
    if (patch) {
      docUpdates.push({ patch, col: k, val: v });
      return Promise.resolve({ error: null });
    }
    return b;
  };
  b.update = (p: Record<string, unknown>) => ((patch = p), b);
  b.maybeSingle = async () => ({ data: matching()[0] ?? null, error: null });
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: matching(), error: null });
  return b;
}
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: builder,
    rpc: (...a: unknown[]) => rpcMock(...a),
    storage: { from: (bucket: string) => ({ upload: (...a: unknown[]) => uploadMock(bucket, ...a) }) },
  }),
}));

import { POST } from "../receipts/[id]/confirm/route";
import { GET as GET_PDF } from "../receipts/[id]/pdf/route";

const base = { email: null, permissions: [] };
const vejle = { ...base, id: U(2), name: "Login", role: "employee", location_id: U(20), location_slug: "vejle" };
const clerk = { ...base, id: U(3), name: "Ekspedient", role: "employee", location_id: U(20), location_slug: "vejle" };

const req = (method = "POST") =>
  new NextRequest("http://localhost/x", { method, headers: { cookie: "ps_operator=abc" } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  afterFns.length = 0;
  docUpdates.length = 0;
  requireStaffMock.mockResolvedValue(vejle);
  lookupMock.mockResolvedValue(clerk);
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
  ];
  // A complete draft, so confirmBlockers lets it through to the rpc.
  const complete = {
    receipt_number: null,
    status: "draft",
    total_amount: 100000,
    seller_type: "private",
    seller_address: "Vestergade 1",
    seller_age_confirmed: true,
    lock_checks_confirmed: true,
    payout_method: "bank",
    seller_bank_reg: "1234",
    seller_bank_account: "1234567",
    account_owner_confirmed: true,
  };
  rows.trade_in_receipts = [
    { ...complete, id: U(50), location_id: U(20), seller_name: "A" },
    { ...complete, id: U(51), location_id: U(30), seller_name: "B" },
  ];
  rows.trade_in_receipt_items = [
    { receipt_id: U(50), template_id: U(70), imei_serial: "490154203237518", price: 100000 },
    { receipt_id: U(51), template_id: U(70), imei_serial: "490154203237518", price: 100000 },
  ];
  rpcMock.mockResolvedValue({ data: { receipt_number: "SS-2026-0042", device_ids: [U(900)] }, error: null });
  uploadMock.mockResolvedValue({ error: null });
  renderMock.mockResolvedValue(Buffer.from("%PDF-test"));
  loadDataMock.mockResolvedValue({
    data: { receipt_number: "SS-2026-0042", seller_name: "A <b>" },
    sellerEmail: "kunde@example.dk",
  });
  sendMock.mockResolvedValue({ data: {}, error: null });
});

describe("POST /api/trade-in/receipts/[id]/confirm", () => {
  it("calls the rpc with the clerk (not the logged-in user), uploads privately, answers only the number", async () => {
    const res = await POST(req(), ctx(U(50)));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("trade_in_confirm", { p_receipt_id: U(50), p_staff_id: U(3) });
    expect(uploadMock).toHaveBeenCalledWith("slutsedler", "SS-2026-0042.pdf", expect.any(Buffer), {
      contentType: "application/pdf",
      upsert: true,
    });
    expect(docUpdates).toContainEqual({
      patch: { pdf_url: "slutsedler/SS-2026-0042.pdf" },
      col: "trade_in_receipt_id",
      val: U(50),
    });
    expect(await res.json()).toEqual({ receipt_number: "SS-2026-0042", device_ids: [U(900)] });
  });

  it("mails the pdf to the seller after the response, escaped, from EMAIL_FROM", async () => {
    await POST(req(), ctx(U(50)));
    expect(sendMock).not.toHaveBeenCalled();
    await afterFns[0]();
    const arg = sendMock.mock.calls[0][0];
    expect(arg.from).toBe("PhoneSpot <info@phonespot.dk>");
    expect(arg.to).toBe("kunde@example.dk");
    expect(arg.subject).toBe("Slutseddel SS-2026-0042");
    expect(arg.html).toContain("A &lt;b&gt;");
    expect(arg.attachments[0].filename).toBe("Slutseddel-SS-2026-0042.pdf");
  });

  it("sends nothing without a seller email, and a mail failure never throws", async () => {
    loadDataMock.mockResolvedValue({ data: { receipt_number: "SS-2026-0042", seller_name: "A" }, sellerEmail: null });
    await POST(req(), ctx(U(50)));
    expect(afterFns).toHaveLength(0);

    loadDataMock.mockResolvedValue({ data: { receipt_number: "SS-2026-0042", seller_name: "A" }, sellerEmail: "k@e.dk" });
    sendMock.mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await POST(req(), ctx(U(50)));
    await expect(afterFns[0]()).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("still answers the number when the pdf step fails (the receipt is already confirmed)", async () => {
    renderMock.mockRejectedValue(new Error("render"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req(), ctx(U(50)));
    spy.mockRestore();
    expect(res.status).toBe(200);
    expect((await res.json()).receipt_number).toBe("SS-2026-0042");
  });

  it("409 with the Danish message when the rpc raises id_required", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:id_required" } });
    const res = await POST(req(), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("ID kræves, når opkøbet er over 2.000 kr.");
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("409 for imei_in_stock with the imei in the message", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:imei_in_stock:356938035643809" } });
    const res = await POST(req(), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("356938035643809");
  });

  it("409 with the first confirmBlockers message before the rpc, and the rpc is never called", async () => {
    rows.trade_in_receipts[0].payout_method = null;
    const res = await POST(req(), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Vælg udbetaling");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("409 when an item lacks a price, read from the receipt's items", async () => {
    rows.trade_in_receipt_items[0].price = 0;
    const res = await POST(req(), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Vare 1: pris mangler");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("409 when the ID expired yesterday in Copenhagen", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T23:30:00Z")); // 00:30 on 10/11 in Copenhagen
    Object.assign(rows.trade_in_receipts[0], { total_amount: 250000, id_type: "pas", id_number: "AB123", id_expiry: "2026-11-09" });
    rows.trade_in_receipt_items[0].price = 250000;
    const res = await POST(req(), ctx(U(50)));
    vi.useRealTimers();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("ID'et er udløbet");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("numbers items in created_at order, like the editor", async () => {
    rows.trade_in_receipt_items = [
      { receipt_id: U(50), template_id: U(70), imei_serial: "490154203237518", price: 0, created_at: "2026-11-09T10:00:02Z" },
      { receipt_id: U(50), template_id: U(70), imei_serial: "490154203237518", price: 100000, created_at: "2026-11-09T10:00:01Z" },
    ];
    Object.assign(rows.trade_in_receipts[0], { total_amount: 100000 });
    const res = await POST(req(), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Vare 2: pris mangler");
  });

  it("downgrades online_accept to paper_scan before the rpc when the total exceeds the accepted offer", async () => {
    Object.assign(rows.trade_in_receipts[0], { attestation: "online_accept", offer_id: U(61), inquiry_id: U(60) });
    rows.trade_in_offers = [{ id: U(61), inquiry_id: U(60), status: "accepted", offer_amount: 90000 }];
    const res = await POST(req(), ctx(U(50)));
    expect(res.status).toBe(200);
    expect(docUpdates).toContainEqual({ patch: { attestation: "paper_scan" }, col: "id", val: U(50) });
    expect(rpcMock).toHaveBeenCalled();
  });

  it("re-checks against the item sum, not a stale stored total", async () => {
    // PATCH writes total and items separately: stored 100.000 øre, items sum to 150.000.
    Object.assign(rows.trade_in_receipts[0], { attestation: "online_accept", offer_id: U(61), inquiry_id: U(60), total_amount: 100000 });
    rows.trade_in_receipt_items[0].price = 150000;
    rows.trade_in_offers = [{ id: U(61), inquiry_id: U(60), status: "accepted", offer_amount: 120000 }];
    await POST(req(), ctx(U(50)));
    expect(docUpdates).toContainEqual({ patch: { attestation: "paper_scan" }, col: "id", val: U(50) });
  });

  it("keeps online_accept when the offer still covers the receipt", async () => {
    Object.assign(rows.trade_in_receipts[0], { attestation: "online_accept", offer_id: U(61), inquiry_id: U(60) });
    rows.trade_in_offers = [{ id: U(61), inquiry_id: U(60), status: "accepted", offer_amount: 100000 }];
    await POST(req(), ctx(U(50)));
    expect(docUpdates.some((d) => "attestation" in d.patch)).toBe(false);
  });

  it("404 for another store, and the rpc is never called", async () => {
    const res = await POST(req(), ctx(U(51)));
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("401 when nobody is logged in", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await POST(req(), ctx(U(50)))).status).toBe(401);
  });
});

describe("GET /api/trade-in/receipts/[id]/pdf", () => {
  it("ignores x-internal-key: no staff session means 401", async () => {
    requireStaffMock.mockResolvedValue(null);
    const r = new NextRequest("http://localhost/x", { headers: { "x-internal-key": "anything" } });
    expect((await GET_PDF(r, ctx(U(50)))).status).toBe(401);
  });

  it("404 for another store", async () => {
    expect((await GET_PDF(req("GET"), ctx(U(51)))).status).toBe(404);
    expect(loadDataMock).not.toHaveBeenCalled();
  });

  it("returns the pdf for a visible receipt", async () => {
    const res = await GET_PDF(req("GET"), ctx(U(50)));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("Slutseddel-SS-2026-0042.pdf");
  });
});
