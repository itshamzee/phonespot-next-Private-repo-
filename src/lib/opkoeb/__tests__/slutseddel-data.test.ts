// @vitest-environment node
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const rows: Record<string, Array<Record<string, unknown>>> = {};

function builder(table: string) {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  const b: Record<string, unknown> = {};
  const matching = () => (rows[table] ?? []).filter((r) => filters.every((f) => f(r)));
  b.select = () => b;
  b.order = () => b;
  b.eq = (k: string, v: unknown) => (filters.push((r) => r[k] === v), b);
  b.maybeSingle = async () => ({ data: matching()[0] ?? null, error: null });
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: matching(), error: null });
  return b;
}
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({ from: builder }) }));

import { loadSlutseddelData } from "../slutseddel-data";
import { SlutseddelDocument } from "@/lib/pdf/slutseddel";

const ESBJERG_STREET = "Hemmelig Esbjergvej 1, 6700 Esbjerg";
const FIXON_ADDRESS = "Løversysselvej 3C, 7100 Vejle";

function textOf(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  const el = node as React.ReactElement<{ children?: unknown }>;
  if (typeof el.type === "function") return textOf((el.type as (p: unknown) => unknown)(el.props));
  return textOf(el.props?.children);
}

beforeEach(() => {
  rows.locations = [
    { id: "loc-esb", name: "Esbjerg", slug: "esbjerg", address: ESBJERG_STREET },
    { id: "loc-sla", name: "Slagelse", slug: "slagelse", address: "VestsjællandsCentret 10, 4200 Slagelse" },
  ];
  rows.staff = [{ id: "staff-1", name: "Maja" }];
  rows.trade_in_receipt_items = [
    { receipt_id: "r1", model: "iPhone 13", storage: "128 GB", imei_serial: "356938035643809", condition_grade: "God", battery_health: 87, price: 350000 },
    { receipt_id: "r1", model: "iPhone 11", storage: null, imei_serial: "", condition_grade: null, battery_health: null, price: 100000 },
  ];
  rows.trade_in_receipts = [
    {
      id: "r1", status: "confirmed", receipt_number: "SS-2026-0042", confirmed_at: "2026-11-09T10:00:00Z",
      created_at: "2026-11-09T09:00:00Z", location_id: "loc-esb", confirmed_by: "staff-1",
      buyer_company: "Fixon ApS", buyer_cvr: "46079019", buyer_address: FIXON_ADDRESS,
      seller_name: "Kunde", seller_address: "Vejen 1", seller_postal_city: "6700 Esbjerg", seller_phone: "12345678",
      seller_email: "k@example.dk", seller_type: "business", seller_cvr: "12345678", invoice_type: "brugtmoms",
      total_amount: 450000, id_type: "pas", id_number: "AB991234", id_expiry: "2030-05-01",
      payout_method: "bank", seller_bank_reg: "1234", seller_bank_account: "1234565678",
    },
    { id: "r2", status: "draft", receipt_number: null, location_id: "loc-esb", created_at: "2026-11-09T09:00:00Z" },
    { id: "r3", status: "confirmed", receipt_number: "SP-2026-0001", location_id: "loc-sla", confirmed_by: null, confirmed_at: "2026-11-09T10:00:00Z", created_at: "x", seller_type: "weird", payout_method: "other", total_amount: 0 },
  ];
});

describe("loadSlutseddelData", () => {
  it("409 for a draft", async () => {
    await expect(loadSlutseddelData("r2")).rejects.toMatchObject({ status: 409, code: "receipt_not_confirmed" });
  });

  it("404 for a missing receipt", async () => {
    await expect(loadSlutseddelData("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("staff name comes from confirmed_by, store name from the location", async () => {
    const { data, sellerEmail } = await loadSlutseddelData("r1");
    expect(data.staff_name).toBe("Maja");
    expect(data.location_name).toBe("Esbjerg");
    expect(sellerEmail).toBe("k@example.dk");
  });

  it("Esbjerg keeps the buying company's address and never shows the store address", async () => {
    const { data } = await loadSlutseddelData("r1");
    expect(data.buyer_address).toBe(FIXON_ADDRESS);
    expect(JSON.stringify(data)).not.toContain("Hemmelig");
    const t = textOf(React.createElement(SlutseddelDocument, { data }));
    expect(t).toContain(FIXON_ADDRESS);
    expect(t).toContain("Esbjerg");
    expect(t).not.toContain(ESBJERG_STREET);
    expect(t).not.toContain("Hemmelig");
  });

  it("maps seller type, payout, battery and blank values", async () => {
    const { data } = await loadSlutseddelData("r1");
    expect(data.seller_type).toBe("business");
    expect(data.payout_method).toBe("bank");
    expect(data.items[0]).toMatchObject({ battery_health: 87, storage: "128 GB", price: 350000 });
    expect(data.items[1]).toMatchObject({ battery_health: null, storage: null, imei_serial: null, condition_grade: null });
    expect(data.total_amount).toBe(450000);

    const { data: odd } = await loadSlutseddelData("r3");
    expect(odd.seller_type).toBe("private");
    expect(odd.payout_method).toBeNull();
    expect(odd.staff_name).toBe("");
  });
});
