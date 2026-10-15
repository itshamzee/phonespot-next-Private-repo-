// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const removeCaseItem = vi.fn();
const updateCaseItemPrice = vi.fn();
let access: unknown;

vi.mock("@/lib/repairs/ticket-access", () => ({ requireTicketAccess: async () => access }));
vi.mock("@/lib/repairs/case-create", () => ({
  removeCaseItem: (...a: unknown[]) => removeCaseItem(...a),
  updateCaseItemPrice: (...a: unknown[]) => updateCaseItemPrice(...a),
}));

import { DELETE, PATCH } from "../[id]/items/[itemId]/route";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = { id: "s", role: "staff", name: "M", location_slug: "vejle" };
const ctx = (id = U(1), itemId = U(2)) => ({ params: Promise.resolve({ id, itemId }) });
const req = (method: string, body?: unknown) =>
  new Request("http://localhost/api/admin/repairs/x/items/y", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  }) as never;

beforeEach(() => {
  removeCaseItem.mockReset();
  updateCaseItemPrice.mockReset();
  access = { ok: true, staff, ticketStoreId: "vejle" };
});

describe("PATCH /api/admin/repairs/:id/items/:itemId", () => {
  it("passes price and reason on to updateCaseItemPrice", async () => {
    updateCaseItemPrice.mockResolvedValueOnce({ lines: [], backorders: [], total_oere: 99_900 });
    const res = await PATCH(req("PATCH", { unit_price_oere: 99_900, reason: "Aftalt pris med kunden" }), ctx());
    expect(res.status).toBe(200);
    expect(updateCaseItemPrice).toHaveBeenCalledWith(U(1), U(2), 99_900, "Aftalt pris med kunden", staff);
    expect((await res.json()).total_oere).toBe(99_900);
  });
  it("400 for a bad price and for a non-JSON body", async () => {
    expect((await PATCH(req("PATCH", { unit_price_oere: -1 }), ctx())).status).toBe(400);
    expect((await PATCH(req("PATCH", "not json"), ctx())).status).toBe(400);
    expect(updateCaseItemPrice).not.toHaveBeenCalled();
  });
  it("404 for malformed ids and returns the access response when not allowed", async () => {
    expect((await PATCH(req("PATCH", { unit_price_oere: 1 }), ctx("x", "y"))).status).toBe(404);
    access = { ok: false, response: new Response("no", { status: 401 }) };
    expect((await PATCH(req("PATCH", { unit_price_oere: 1 }), ctx())).status).toBe(401);
  });
  it("maps business errors from the database", async () => {
    const { CaseError } = await import("@/lib/repairs/case-errors");
    updateCaseItemPrice.mockRejectedValueOnce(new CaseError("price_reason_required", "Skriv en begrundelse", 400));
    const res = await PATCH(req("PATCH", { unit_price_oere: 1 }), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("price_reason_required");
  });
});

describe("DELETE /api/admin/repairs/:id/items/:itemId", () => {
  it("accepts a reason in the body", async () => {
    removeCaseItem.mockResolvedValueOnce({ lines: [], backorders: [], total_oere: 0 });
    const res = await DELETE(req("DELETE", { reason: "Kulance" }), ctx());
    expect(res.status).toBe(200);
    expect(removeCaseItem).toHaveBeenCalledWith(U(1), U(2), staff, "Kulance");
  });
  it("still works without a body (reason null)", async () => {
    removeCaseItem.mockResolvedValueOnce({ lines: [], backorders: [], total_oere: 0 });
    const res = await DELETE(req("DELETE"), ctx());
    expect(res.status).toBe(200);
    expect(removeCaseItem).toHaveBeenCalledWith(U(1), U(2), staff, null);
  });
  it("maps a paid ticket to 409 with a Danish message", async () => {
    const { toCaseError } = await import("@/lib/repairs/case-errors");
    removeCaseItem.mockRejectedValueOnce(toCaseError({ message: "case:ticket_paid" }));
    const res = await DELETE(req("DELETE", { reason: "x" }), ctx());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/betalt/);
  });
  it("requires a reason for used parts (database error is passed through)", async () => {
    const { toCaseError } = await import("@/lib/repairs/case-errors");
    removeCaseItem.mockRejectedValueOnce(toCaseError({ message: "case:remove_reason_required" }));
    const res = await DELETE(req("DELETE"), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("remove_reason_required");
  });
});
