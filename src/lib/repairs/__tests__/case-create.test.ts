// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/gateway-api/client", () => ({ sendSms: vi.fn() }));
vi.mock("@/lib/auth/store-scope-server", () => ({ loadLocationIndex: async () => ({ idBySlug: {}, slugById: {} }) }));

import { assertPricesValid, decideUnitPrice, discountOere, productListOere, serviceListOere } from "../case-pricing";
import { CaseError, toCaseError } from "../case-errors";
import { createCaseSchema, parseIdempotencyKey } from "../case-schemas";
import { buildCreatePayload, createRepairCase, kasseUrls, resolveCaseStore, shapeLines } from "../case-create";
import type { StaffIdentity } from "@/lib/auth/require-staff";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = (over: Partial<StaffIdentity> = {}): StaffIdentity => ({
  id: U(1),
  role: "staff",
  name: "Mette",
  email: null,
  location_id: U(50),
  location_slug: "vejle",
  ...over,
});

describe("pricing and discounts", () => {
  it("converts kroner to oere and picks the lower sale price", () => {
    expect(serviceListOere(1199)).toBe(119900);
    expect(productListOere({ selling_price: 10000, sale_price: 7500 })).toBe(7500);
    expect(productListOere({ selling_price: 10000, sale_price: 12000 })).toBe(10000);
  });
  it("uses the list price when the client sends none", () => {
    expect(decideUnitPrice(79900, undefined, undefined)).toMatchObject({ unit_oere: 79900, reason: null, discounted: false });
  });
  it("a deviation needs a reason", () => {
    expect(() => decideUnitPrice(79900, 69900, null, "Skærm")).toThrow(/begrundelse/);
    expect(() => decideUnitPrice(79900, 69900, "  ")).toThrow(CaseError);
    const d = decideUnitPrice(79900, 69900, "Stamkunde");
    expect(d).toMatchObject({ unit_oere: 69900, reason: "Stamkunde", discounted: true });
    expect(discountOere(79900, 69900, 2)).toBe(20000);
  });
  it("the same price as the list price needs no reason; negative or fractional prices fail", () => {
    expect(decideUnitPrice(1000, 1000, null).reason).toBeNull();
    expect(() => decideUnitPrice(1000, -1, "x")).toThrow(/Ugyldig/);
    expect(() => decideUnitPrice(1000, 10.5, "x")).toThrow(/Ugyldig/);
    expect(() => assertPricesValid([{ kind: "free_text", description: "x", unit_price_oere: -5 }])).toThrow();
  });
});

describe("schema and idempotency header", () => {
  const base = {
    customer: { type: "privat", name: "Mette", phone: "20123456" },
    device: { repair_model_id: U(7) },
    items: [{ kind: "repair", repair_service_id: U(8) }],
  };
  it("accepts a minimal body and trims empty strings to null", () => {
    const r = createCaseSchema.parse({ ...base, customer: { ...base.customer, email: "  " } });
    expect(r.customer.email).toBeNull();
  });
  it("rejects an empty item list and unknown item kinds", () => {
    expect(createCaseSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(createCaseSchema.safeParse({ ...base, items: [{ kind: "gift" }] }).success).toBe(false);
  });
  it("accepts a device passcode", () => {
    expect(createCaseSchema.parse({ ...base, device: { ...base.device, passcode: "1234" } }).device.passcode).toBe("1234");
  });
  it("validates the Idempotency-Key format", () => {
    expect(parseIdempotencyKey("3f2b8c1e-5d4a-4c1b-9a77-0123456789ab")).toBeTruthy();
    expect(parseIdempotencyKey("short")).toBeNull();
    expect(parseIdempotencyKey(null)).toBeNull();
    expect(parseIdempotencyKey("bad key with spaces!!")).toBeNull();
  });
});

describe("store scope", () => {
  it("staff always get their own store, whatever the client sends", () => {
    expect(resolveCaseStore(staff(), "vejle", "slagelse")).toBe("vejle");
  });
  it("the owner chooses; without a physical store it is an error", () => {
    const owner = staff({ role: "owner", location_slug: null });
    expect(resolveCaseStore(owner, "alle", "slagelse")).toBe("slagelse");
    expect(() => resolveCaseStore(owner, "alle", null)).toThrow(/Vælg hvilken butik/);
  });
  it("staff without a store cannot create cases", () => {
    expect(() => resolveCaseStore(staff({ location_slug: null }), "ingen", null)).toThrow(CaseError);
  });
});

describe("createRepairCase", () => {
  const body = createCaseSchema.parse({
    customer: { type: "privat", name: "Mette", phone: "20123456" },
    device: { repair_model_id: U(7) },
    items: [{ kind: "repair", repair_service_id: U(8) }],
    notify_sms: false,
  });
  const raw = {
    ticket_id: U(100),
    ticket_number: "PS-2026-0100",
    customer_id: U(200),
    lines: [{ id: U(1), cost_oere: 5000, kind: "repair" }],
    backorders: [],
    total_oere: 79900,
    needs_deposit: false,
    replayed: false,
    warnings: [],
  };

  it("sends the staff id, the server-resolved store and the idempotency key to the RPC", async () => {
    const rpc = vi.fn(async () => ({ data: raw, error: null }));
    const res = await createRepairCase(body, { staff: staff(), scope: "vejle" }, "key-key-key-1", { rpc } as never);
    const arg = (rpc.mock.calls[0] as unknown as [string, { p: Record<string, unknown> }])[1].p;
    expect((rpc.mock.calls[0] as unknown as [string])[0]).toBe("repair_case_create");
    expect(arg).toMatchObject({ staff_id: U(1), store_id: "vejle", idempotency_key: "key-key-key-1" });
    expect(res.kasse_url).toBe(`/admin/kasse?sag=${U(100)}`);
    expect(res.deposit_url).toBe(`/admin/kasse?sag=${U(100)}&depositum=1`);
  });
  it("hides cost from staff and shows it to managers", async () => {
    const rpc = async () => ({ data: raw, error: null });
    const asStaff = await createRepairCase(body, { staff: staff(), scope: "vejle" }, "key-key-key-2", { rpc } as never);
    expect(asStaff.lines[0]).not.toHaveProperty("cost_oere");
    const asManager = await createRepairCase(body, { staff: staff({ role: "manager" }), scope: "vejle" }, "key-key-key-2", { rpc } as never);
    expect(asManager.lines[0].cost_oere).toBe(5000);
  });
  it("passes a replayed response through (same key, same case)", async () => {
    const rpc = async () => ({ data: { ...raw, replayed: true }, error: null });
    const res = await createRepairCase(body, { staff: staff(), scope: "vejle" }, "key-key-key-3", { rpc } as never);
    expect(res.replayed).toBe(true);
    expect(res.ticket_id).toBe(U(100));
  });
  it("maps database business errors to Danish messages", async () => {
    const rpc = async () => ({ data: null, error: { message: "case:price_reason_required:Skærm" } });
    await expect(createRepairCase(body, { staff: staff(), scope: "vejle" }, "key-key-key-4", { rpc } as never)).rejects.toMatchObject({
      code: "price_reason_required",
      status: 400,
    });
    expect(toCaseError({ message: "case:idempotency_conflict" })?.status).toBe(409);
    expect(toCaseError({ message: "boom" })).toBeNull();
  });
  it("defaults the responsible person to the logged-in staff member", () => {
    const p = buildCreatePayload(body, staff(), "vejle", null);
    expect(p.details.assigned_to).toBe("Mette");
    expect(kasseUrls("x y").kasse_url).toBe("/admin/kasse?sag=x%20y");
  });
  it("shapeLines strips cost for non-managers only", () => {
    const lines = [{ cost_oere: 1 }] as never;
    expect(shapeLines(lines, "staff")[0]).not.toHaveProperty("cost_oere");
    expect(shapeLines(lines, "owner")[0]).toHaveProperty("cost_oere");
  });
});
