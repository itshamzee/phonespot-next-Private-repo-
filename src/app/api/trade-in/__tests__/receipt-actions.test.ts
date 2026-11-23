// @vitest-environment node
//
// Upload, files, pay, suspicion and void under /api/trade-in/receipts/[id]/.
// Real receipt-access (store scope); supabase, storage and the rpc are faked.

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
  readOperator: () => ({ loggedInId: U(2), staffId: U(3) }),
}));

const rows: Record<string, Array<Record<string, unknown>>> = {};
type UpdateCall = { table: string; patch: Record<string, unknown>; filters: Array<[string, string, unknown]> };
const updates: UpdateCall[] = [];
const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
const rpcMock = vi.fn();
const storageUpload = vi.fn();
const signedUrl = vi.fn();

function builder(table: string) {
  const filters: Array<[string, string, unknown]> = [];
  let patch: Record<string, unknown> | null = null;
  let insertRow: Record<string, unknown> | null = null;
  const matches = (r: Record<string, unknown>) =>
    filters.every(([op, k, v]) => {
      if (op === "eq") return r[k] === v;
      if (op === "in") return (v as unknown[]).includes(r[k]);
      if (op === "is") return r[k] === v || (v === null && r[k] == null);
      if (op === "not") {
        // .not(col, "in", "(a,b)")
        const list = String(v).replace(/^\(|\)$/g, "").split(",");
        return !list.includes(String(r[k]));
      }
      if (op === "like") {
        const re = new RegExp(`^${String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`);
        return typeof r[k] === "string" && re.test(r[k] as string);
      }
      return true;
    });
  const result = () => {
    if (insertRow) {
      inserts.push({ table, row: insertRow });
      return { data: null, error: null };
    }
    const hit = (rows[table] ?? []).filter(matches);
    if (patch) {
      updates.push({ table, patch, filters: [...filters] });
      for (const r of hit) Object.assign(r, patch);
      return { data: hit, error: null };
    }
    return { data: hit, error: null };
  };
  const b: Record<string, unknown> = {};
  for (const op of ["eq", "in", "is", "not", "like"]) {
    b[op] = (k: string, v: unknown, v2?: unknown) => (filters.push([op, k, op === "not" ? v2 : v]), b);
  }
  b.select = () => b;
  b.order = () => b;
  b.update = (p: Record<string, unknown>) => ((patch = p), b);
  b.insert = (r: Record<string, unknown>) => ((insertRow = r), b);
  b.maybeSingle = async () => ({ data: result().data?.[0] ?? null, error: null });
  b.single = b.maybeSingle;
  b.then = (resolve: (v: unknown) => unknown) => resolve(result());
  return b;
}
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: builder,
    rpc: (...a: unknown[]) => rpcMock(...a),
    storage: {
      from: (bucket: string) => ({
        upload: (...a: unknown[]) => storageUpload(bucket, ...a),
        createSignedUrl: (...a: unknown[]) => signedUrl(bucket, ...a),
      }),
    },
  }),
}));

import { POST as UPLOAD } from "../receipts/[id]/upload/route";
import { GET as FILE } from "../receipts/[id]/files/[kind]/route";
import { POST as PAY } from "../receipts/[id]/pay/route";
import { POST as SUSPECT, DELETE as RELEASE } from "../receipts/[id]/suspicion/route";
import { POST as VOID } from "../receipts/[id]/void/route";

const base = { email: null, permissions: [] };
const login = { ...base, id: U(2), name: "Login", role: "employee", location_id: U(20), location_slug: "vejle" };
const clerk = { ...base, id: U(3), name: "Ekspedient", role: "employee", location_id: U(20), location_slug: "vejle" };
const owner = { ...base, id: U(3), name: "Ejer", role: "owner", location_id: null, location_slug: null };

const ctx = (id: string, kind?: string) => ({ params: Promise.resolve({ id, kind: kind as string }) });
const jsonReq = (body: unknown, method = "POST") =>
  new NextRequest("http://localhost/x", {
    method,
    headers: { cookie: "ps_operator=abc", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const uploadReq = (kind: string, file: File) => {
  const fd = new FormData();
  fd.set("kind", kind);
  fd.set("file", file);
  return new NextRequest("http://localhost/x", { method: "POST", headers: { cookie: "ps_operator=abc" }, body: fd });
};
const getReq = () => new NextRequest("http://localhost/x", { headers: { cookie: "ps_operator=abc" } });

const payBody = {
  payout_method: "bank",
  seller_bank_reg: "1234",
  seller_bank_account: "1234567890",
  account_owner_confirmed: true,
  expected_amount_oere: 100000,
};

beforeEach(() => {
  vi.clearAllMocks();
  updates.length = 0;
  inserts.length = 0;
  requireStaffMock.mockResolvedValue(login);
  lookupMock.mockResolvedValue(clerk);
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
  ];
  rows.trade_in_receipts = [
    {
      id: U(50),
      receipt_number: "SS-2026-0001",
      status: "confirmed",
      location_id: U(20),
      seller_type: "private",
      attestation: null,
      total_amount: 100000,
      offset_amount: null,
      signed_scan_path: null,
      invoice_file_path: null,
      payout_proof_path: null,
      payout_method: "bank",
      seller_bank_reg: "1234",
      seller_bank_account: "1234567890",
      account_owner_confirmed: false,
      suspected_at: null,
      id_number: "AB123456",
    },
    {
      id: U(51),
      receipt_number: "SS-2026-0002",
      status: "confirmed",
      location_id: U(30),
      seller_type: "private",
      signed_scan_path: "SS-2026-0002/signed_scan-1.pdf",
      suspected_at: null,
    },
    {
      id: U(52),
      receipt_number: "SS-2026-0003",
      status: "confirmed",
      location_id: U(20),
      seller_type: "private",
      signed_scan_path: "SS-2026-0003/signed_scan-1.pdf",
      invoice_file_path: null,
      payout_method: "bank",
      seller_bank_reg: "1234",
      seller_bank_account: "1234567890",
      total_amount: 100000,
      suspected_at: "2026-11-09T10:00:00Z",
      suspicion_note: "stjålet?",
    },
  ];
  rows.trade_in_receipt_items = [
    { receipt_id: U(50), device_id: U(900) },
    { receipt_id: U(50), device_id: U(901) },
    { receipt_id: U(50), device_id: U(905) },
    { receipt_id: U(52), device_id: U(902) },
    { receipt_id: U(52), device_id: U(903) },
    { receipt_id: U(52), device_id: U(904) },
    { receipt_id: U(52), device_id: U(906) },
    { receipt_id: U(50), device_id: U(907) },
  ];
  rows.devices = [
    { id: U(900), status: "intake", blocked_at: null, blocked_reason: null },
    { id: U(901), status: "sold", blocked_at: null, blocked_reason: null },
    { id: U(905), status: "delisted", blocked_at: "2026-11-01T00:00:00Z", blocked_reason: "Slutseddel annulleret" },
    { id: U(902), status: "delisted", blocked_at: "2026-11-09T10:00:00Z", blocked_reason: "Mistanke: stjålet?" },
    { id: U(903), status: "sold", blocked_at: "2026-11-09T10:00:00Z", blocked_reason: "Mistanke: stjålet?" },
    { id: U(904), status: "delisted", blocked_at: "2026-11-01T00:00:00Z", blocked_reason: "Slutseddel annulleret" },
    // Receipt 52's block failed for this one (the earlier POST died after flagging the receipt).
    { id: U(906), status: "intake", blocked_at: null, blocked_reason: null },
    { id: U(907), status: "sold", blocked_at: "2026-11-01T00:00:00Z", blocked_reason: "Slutseddel annulleret" },
  ];
  rpcMock.mockResolvedValue({ data: null, error: null });
  storageUpload.mockResolvedValue({ error: null });
  signedUrl.mockResolvedValue({ data: { signedUrl: "https://storage.example/signed?t=1" }, error: null });
});

const withScan = () => {
  rows.trade_in_receipts[0].signed_scan_path = "SS-2026-0001/signed_scan-1.pdf";
};

describe("POST pay", () => {
  it("409 with the first blocker when the signed scan is missing", async () => {
    const res = await PAY(jsonReq(payBody), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Læg den underskrevne slutseddel op");
    expect(updates).toHaveLength(0);
  });

  it("200: marks paid by the clerk and returns a sanitized receipt", async () => {
    withScan();
    const res = await PAY(jsonReq(payBody), ctx(U(50)));
    expect(res.status).toBe(200);
    const patch = updates.find((u) => u.table === "trade_in_receipts")!.patch;
    expect(patch).toMatchObject({ status: "paid", paid_by: U(3), account_owner_confirmed: true });
    expect(typeof patch.paid_at).toBe("string");
    const body = await res.json();
    expect(body.status).toBe("paid");
    expect(body.id_number).toBe("••••3456");
    expect(body.seller_bank_account).toBe("••••7890");
    expect(body).not.toHaveProperty("signed_scan_path");
    expect(body.has_signed_scan).toBe(true);
    expect(inserts.some((i) => i.table === "activity_log" && i.row.actor_id === U(3))).toBe(true);
  });

  it("409 when the receipt is under suspicion", async () => {
    const res = await PAY(jsonReq(payBody), ctx(U(52)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Opkøbet er spærret ved mistanke");
  });

  it("409 when the bank details differ from the ones on the confirmed slip", async () => {
    withScan();
    const res = await PAY(jsonReq({ ...payBody, seller_bank_account: "999999999" }), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Kontooplysningerne stemmer ikke med slutsedlen");
    expect(updates).toHaveLength(0);
  });

  it("409 when the confirmed slip has no bank details", async () => {
    withScan();
    rows.trade_in_receipts[0].seller_bank_account = null;
    const res = await PAY(jsonReq(payBody), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Kontooplysningerne skal stå på slutsedlen før den bekræftes");
  });

  it("409 when the payout amount changed since the page was loaded (a till offset in between)", async () => {
    withScan();
    rows.trade_in_receipts[0].payout_method = "modregning";
    rows.trade_in_receipts[0].offset_amount = 40000;
    const res = await PAY(jsonReq(payBody), ctx(U(50)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Beløbet er ændret — genindlæs slutsedlen");
    expect(updates).toHaveLength(0);
  });

  it("pays the remainder after a partial offset, matches offset_amount in the update and logs the remainder", async () => {
    withScan();
    rows.trade_in_receipts[0].offset_amount = 40000;
    const res = await PAY(jsonReq({ ...payBody, expected_amount_oere: 60000 }), ctx(U(50)));
    expect(res.status).toBe(200);
    const upd = updates.find((u) => u.table === "trade_in_receipts")!;
    expect(upd.filters).toContainEqual(["eq", "offset_amount", 40000]);
    const log = inserts.find((i) => i.row.action === "opkoeb_paid")!;
    expect((log.row.details as Record<string, unknown>).amount).toBe(60000);
  });

  it("guards a slip without offset with offset_amount IS NULL, so a concurrent till offset cannot slip in", async () => {
    withScan();
    const res = await PAY(jsonReq(payBody), ctx(U(50)));
    expect(res.status).toBe(200);
    const upd = updates.find((u) => u.table === "trade_in_receipts")!;
    expect(upd.filters).toContainEqual(["is", "offset_amount", null]);
  });

  it("400 without expected_amount_oere", async () => {
    withScan();
    const { expected_amount_oere: _omit, ...rest } = payBody;
    void _omit;
    const res = await PAY(jsonReq(rest), ctx(U(50)));
    expect(res.status).toBe(400);
  });

  it("400 for modregning", async () => {
    withScan();
    const res = await PAY(jsonReq({ ...payBody, payout_method: "modregning" }), ctx(U(50)));
    expect(res.status).toBe(400);
  });

  it("404 for another store's receipt", async () => {
    const res = await PAY(jsonReq(payBody), ctx(U(51)));
    expect(res.status).toBe(404);
  });
});

describe("POST suspicion / DELETE suspicion", () => {
  it("flags the receipt first, then blocks unsold devices (not already blocked) and sold ones, and logs", async () => {
    const res = await SUSPECT(jsonReq({ note: "Meldt stjålet", police_notified: true }), ctx(U(50)));
    expect(res.status).toBe(200);
    expect(updates[0].table).toBe("trade_in_receipts");
    expect(updates[0].patch).toMatchObject({ suspected_by: U(3), suspicion_note: "Meldt stjålet" });
    expect(typeof updates[0].patch.police_notified_at).toBe("string");
    expect(updates.filter((u) => u.table === "devices")).toHaveLength(2);
    const byId = (id: string) => rows.devices.find((d) => d.id === id)!;
    expect(byId(U(900))).toMatchObject({ status: "delisted", blocked_reason: "Mistanke: Meldt stjålet" });
    expect(typeof byId(U(900)).blocked_at).toBe("string");
    // Sold: blocked, status untouched.
    expect(byId(U(901))).toMatchObject({ status: "sold", blocked_reason: "Mistanke: Meldt stjålet" });
    // Already blocked (voided receipt): reason never overwritten.
    expect(byId(U(905))).toMatchObject({ status: "delisted", blocked_reason: "Slutseddel annulleret" });
    // Sold and already blocked: reason never overwritten either.
    expect(byId(U(907))).toMatchObject({ status: "sold", blocked_reason: "Slutseddel annulleret" });
    expect(inserts.some((i) => i.table === "activity_log" && i.row.action === "opkoeb_suspicion")).toBe(true);
  });

  it("does not touch devices when the receipt update matches nothing", async () => {
    rows.trade_in_receipts[0].status = "voided";
    const res = await SUSPECT(jsonReq({ note: "x", police_notified: false }), ctx(U(50)));
    expect(res.status).toBe(409);
    expect(updates.filter((u) => u.table === "devices")).toHaveLength(0);
  });

  it("already under suspicion: re-applies the blocks (retry after a failed block) and answers 200", async () => {
    const res = await SUSPECT(jsonReq({ note: "x", police_notified: false }), ctx(U(52)));
    expect(res.status).toBe(200);
    // The receipt's suspicion is not rewritten.
    expect(updates.filter((u) => u.table === "trade_in_receipts")).toHaveLength(0);
    expect(rows.trade_in_receipts[2]).toMatchObject({ suspected_at: "2026-11-09T10:00:00Z", suspicion_note: "stjålet?" });
    const byId = (id: string) => rows.devices.find((d) => d.id === id)!;
    // The device the first attempt missed is blocked now, with the original note.
    expect(byId(U(906))).toMatchObject({ status: "delisted", blocked_reason: "Mistanke: stjålet?" });
    expect(typeof byId(U(906)).blocked_at).toBe("string");
    // Existing blocks keep their reason and time.
    expect(byId(U(902))).toMatchObject({ blocked_at: "2026-11-09T10:00:00Z", blocked_reason: "Mistanke: stjålet?" });
    expect(byId(U(904))).toMatchObject({ status: "delisted", blocked_reason: "Slutseddel annulleret" });
    expect((await res.json()).suspected_at).toBe("2026-11-09T10:00:00Z");
  });

  it("DELETE as employee is 403", async () => {
    const res = await RELEASE(jsonReq({ note: "Falsk alarm" }, "DELETE"), ctx(U(52)));
    expect(res.status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it("DELETE as owner releases only Mistanke devices, keeps other blocks, and logs the note", async () => {
    requireStaffMock.mockResolvedValue({ ...owner, id: U(2) });
    lookupMock.mockResolvedValue(owner);
    const res = await RELEASE(jsonReq({ note: "Falsk alarm" }, "DELETE"), ctx(U(52)));
    expect(res.status).toBe(200);
    const byId = (id: string) => rows.devices.find((d) => d.id === id)!;
    expect(byId(U(902))).toMatchObject({ status: "intake", blocked_at: null, blocked_reason: null });
    expect(byId(U(903))).toMatchObject({ status: "sold", blocked_at: null, blocked_reason: null });
    expect(byId(U(904))).toMatchObject({ status: "delisted", blocked_reason: "Slutseddel annulleret" });
    const log = inserts.find((i) => i.row.action === "opkoeb_suspicion_released")!;
    expect((log.row.details as Record<string, unknown>).note).toBe("Falsk alarm");
  });
});

describe("POST upload", () => {
  const pdf = (name = "scan.pdf", type = "application/pdf") => new File([new Uint8Array([1, 2, 3])], name, { type });

  it("400 for an .exe", async () => {
    const res = await UPLOAD(uploadReq("signed_scan", pdf("virus.exe", "application/octet-stream")), ctx(U(50)));
    expect(res.status).toBe(400);
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("400 when the extension is wrong even if the type is allowed", async () => {
    const res = await UPLOAD(uploadReq("signed_scan", pdf("scan.exe", "application/pdf")), ctx(U(50)));
    expect(res.status).toBe(400);
  });

  it("400 above 4 MB with the Danish message", async () => {
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "scan.pdf", { type: "application/pdf" });
    const res = await UPLOAD(uploadReq("signed_scan", big), ctx(U(50)));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Filen er for stor (maks. 4 MB). Tag billedet igen eller gem PDF'en mindre.");
  });

  it("accepts exactly 4 MB", async () => {
    const ok = new File([new Uint8Array(4 * 1024 * 1024)], "scan.pdf", { type: "application/pdf" });
    const res = await UPLOAD(uploadReq("signed_scan", ok), ctx(U(50)));
    expect(res.status).toBe(200);
  });

  it.each([
    ["foto.heif", "image/heif"],
    ["foto.heic", "image/heic"],
    ["foto.heic", ""],
    ["foto.heif", ""],
  ])("accepts %s with declared type %j", async (name, type) => {
    const res = await UPLOAD(uploadReq("signed_scan", new File([new Uint8Array([1])], name, { type })), ctx(U(50)));
    expect(res.status).toBe(200);
  });

  it("rejects an empty declared type for non-heic extensions", async () => {
    const res = await UPLOAD(uploadReq("signed_scan", new File([new Uint8Array([1])], "scan.pdf", { type: "" })), ctx(U(50)));
    expect(res.status).toBe(400);
  });

  it("answers a Danish 500 when storage fails", async () => {
    storageUpload.mockResolvedValue({ error: { message: "mime type not supported" } });
    const res = await UPLOAD(uploadReq("signed_scan", pdf()), ctx(U(50)));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Filen kunne ikke gemmes");
    expect(updates).toHaveLength(0);
  });

  it("400 for invoice on a private receipt", async () => {
    const res = await UPLOAD(uploadReq("invoice", pdf()), ctx(U(50)));
    expect(res.status).toBe(400);
  });

  it("stores under {receipt_number}/{kind}-{ts}.{ext} and sets the column", async () => {
    const res = await UPLOAD(uploadReq("signed_scan", pdf()), ctx(U(50)));
    expect(res.status).toBe(200);
    const [bucket, key] = storageUpload.mock.calls[0];
    expect(bucket).toBe("slutsedler");
    expect(key).toMatch(/^SS-2026-0001\/signed_scan-\d+\.pdf$/);
    expect(updates[0].patch).toEqual({ signed_scan_path: key });
    const body = await res.json();
    expect(body).not.toHaveProperty("signed_scan_path");
    expect(body.has_signed_scan).toBe(true);
  });

  it("409 on a draft", async () => {
    rows.trade_in_receipts[0].status = "draft";
    const res = await UPLOAD(uploadReq("signed_scan", pdf()), ctx(U(50)));
    expect(res.status).toBe(409);
  });

  it("404 for another store's receipt", async () => {
    const res = await UPLOAD(uploadReq("signed_scan", pdf()), ctx(U(51)));
    expect(res.status).toBe(404);
  });
});

describe("GET files/[kind]", () => {
  it("404 for another store's receipt", async () => {
    const res = await FILE(getReq(), ctx(U(51), "signed_scan"));
    expect(res.status).toBe(404);
    expect(signedUrl).not.toHaveBeenCalled();
  });

  it("404 when there is no file", async () => {
    const res = await FILE(getReq(), ctx(U(50), "signed_scan"));
    expect(res.status).toBe(404);
  });

  it("302 to a 60 second signed url", async () => {
    withScan();
    const res = await FILE(getReq(), ctx(U(50), "signed_scan"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://storage.example/signed?t=1");
    expect(signedUrl).toHaveBeenCalledWith("slutsedler", "SS-2026-0001/signed_scan-1.pdf", 60);
  });
});

describe("POST void", () => {
  it("400 without a reason", async () => {
    const res = await VOID(jsonReq({}), ctx(U(50)));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("409 under suspicion, rpc not called", async () => {
    const res = await VOID(jsonReq({ reason: "Fejl" }), ctx(U(52)));
    expect(res.status).toBe(409);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("calls trade_in_void with the clerk and logs", async () => {
    const res = await VOID(jsonReq({ reason: "Forkert pris" }), ctx(U(50)));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("trade_in_void", { p_receipt_id: U(50), p_staff_id: U(3), p_reason: "Forkert pris" });
    expect(inserts.some((i) => i.row.action === "opkoeb_voided" && i.row.actor_id === U(3))).toBe(true);
  });

  it("maps an rpc business error to 409", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:receipt_not_voidable", code: "PS001" } });
    const res = await VOID(jsonReq({ reason: "Fejl" }), ctx(U(50)));
    expect(res.status).toBe(409);
  });
});
