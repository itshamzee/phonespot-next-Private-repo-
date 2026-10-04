// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Migrationerne køres ikke mod en database i tests. De her tests låser de
 * regler i SQL'en, som lager-sikkerheden hviler på, så en senere redigering ikke
 * stille åbner for salg af varer på vej eller for dobbelt modtagelse.
 */
const dir = path.resolve(__dirname, "../../../../supabase/migrations");
const read = (f: string) => readFileSync(path.join(dir, f), "utf8");

const tables = read("20261004400000_stock_transfers_tables.sql");
const functions = read("20261004400100_stock_transfer_functions.sql");
const view = read("20261004400200_stock_overview_view.sql");
const posRpcs = read("20261003130000_pos_rpcs.sql");

function fn(name: string): string {
  const start = functions.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start, `${name} exists`).toBeGreaterThan(-1);
  const next = functions.indexOf("CREATE OR REPLACE FUNCTION", start + 10);
  return functions.slice(start, next === -1 ? undefined : next);
}

describe("devices.status", () => {
  it("keeps every existing status and adds in_transit", () => {
    const c = /CHECK \(status IN \(([^)]*)\)\)/.exec(tables)?.[1] ?? "";
    for (const s of ["intake", "graded", "listed", "reserved", "sold", "shipped", "picked_up", "returned", "delisted", "in_transit"]) {
      expect(c).toContain(`'${s}'`);
    }
  });
});

describe("devices in transit cannot be sold", () => {
  it("pos_create_sale only sells listed devices (or expired reservations), never in_transit", () => {
    const sale = posRpcs.slice(posRpcs.indexOf("FUNCTION public.pos_create_sale("), posRpcs.indexOf("FUNCTION public.pos_create_return("));
    expect(sale).toContain("d.status = 'listed'");
    expect(sale).not.toContain("in_transit");
    expect(sale).toMatch(/UPDATE public\.devices SET status = 'sold'[\s\S]*?status = 'listed'/);
  });

  it("transfer_send is the only thing that moves a device into in_transit, and only from listed", () => {
    expect(fn("transfer_send")).toMatch(/status = 'in_transit'[\s\S]*?status = 'listed' AND location_id = t\.from_location_id/);
    expect(fn("transfer_request")).not.toContain("SET status");
  });
});

describe("state machine in SQL", () => {
  it("every transition locks the header first", () => {
    for (const name of ["transfer_send", "transfer_receive", "transfer_cancel"]) {
      expect(fn(name)).toMatch(/FROM public\.stock_transfers WHERE id = p_transfer_id FOR UPDATE/);
    }
  });

  it("send requires 'requested'; receive requires 'sent' and rejects received/cancelled", () => {
    expect(fn("transfer_send")).toContain("t.status <> 'requested'");
    const receive = fn("transfer_receive");
    expect(receive).toContain("'already_received'");
    expect(receive).toContain("'cancelled'");
    expect(receive).toContain("t.status <> 'sent'");
  });

  it("receive guards against over-receipt and finishes only when nothing is open", () => {
    const receive = fn("transfer_receive");
    expect(receive).toContain("ln.received_qty + ln.returned_qty + r.q > ln.sent_qty");
    expect(receive).toContain("sent_qty - received_qty - returned_qty > 0");
    expect(receive).toMatch(/IF v_open = 0 THEN[\s\S]*?status = 'received'/);
  });

  it("devices only become sellable at the receiver on receipt (listed + new location)", () => {
    const receive = fn("transfer_receive");
    expect(receive).toMatch(/SET status = 'listed', location_id = t\.to_location_id[\s\S]*?status = 'in_transit'/);
  });

  it("sending decrements the sender; only receiving adds to the receiver", () => {
    const send = fn("transfer_send");
    expect(send).toContain("quantity = quantity - v_qty");
    expect(send).not.toContain("t.to_location_id");
    const request = fn("transfer_request");
    expect(request).not.toContain("sku_stock");
    expect(request).not.toContain("stock_movements");
  });

  it("cancelling after send returns the stock to the sender and is blocked after partial receipt", () => {
    const cancel = fn("transfer_cancel");
    expect(cancel).toContain("'partially_received'");
    expect(cancel).toContain("t.from_location_id");
    expect(cancel).toContain("returned_qty = sent_qty");
  });
});

describe("permissions in SQL", () => {
  it("each function checks the acting staff member's store", () => {
    expect(fn("transfer_request")).toContain("transfer_check_actor(p_staff_id, p_to)");
    expect(fn("transfer_send")).toContain("transfer_check_actor(p_staff_id, t.from_location_id)");
    expect(fn("transfer_receive")).toContain("transfer_check_actor(p_staff_id, t.to_location_id)");
    expect(fn("stock_receive_goods")).toContain("transfer_check_actor(p_staff_id, p_location_id, true)");
  });

  it("every function is SECURITY DEFINER with a fixed search_path (except the helpers)", () => {
    for (const name of ["transfer_request", "transfer_send", "transfer_receive", "transfer_cancel", "stock_receive_goods"]) {
      expect(fn(name)).toContain("SECURITY DEFINER SET search_path = pg_catalog, public");
    }
  });

  it("all functions are revoked from public roles and granted to service_role only", () => {
    expect(functions).toContain("REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated");
    expect(functions).toContain("GRANT EXECUTE ON FUNCTION %s TO service_role");
    for (const sig of [
      "transfer_request(uuid,uuid,uuid,jsonb,text)",
      "transfer_send(uuid,uuid,jsonb)",
      "transfer_receive(uuid,uuid,jsonb,boolean)",
      "transfer_cancel(uuid,uuid,text)",
      "stock_receive_goods(uuid,uuid,text,date,jsonb)",
    ]) {
      expect(functions).toContain(`'public.${sig}'`);
    }
  });

  it("the new tables are RLS-locked with no policies", () => {
    expect(tables).toContain("ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY");
    expect(tables).toContain("ALTER TABLE public.stock_transfer_lines ENABLE ROW LEVEL SECURITY");
    expect(tables).not.toMatch(/CREATE POLICY/);
  });
});

describe("migration hygiene", () => {
  it("are transactional and idempotent", () => {
    for (const sql of [tables, functions, view]) {
      expect(sql).toMatch(/^BEGIN;$/m);
      expect(sql).toMatch(/^COMMIT;$/m);
    }
    expect(tables).toContain("CREATE TABLE IF NOT EXISTS public.stock_transfers");
    expect(tables).toContain("CREATE TABLE IF NOT EXISTS public.stock_transfer_lines");
    expect(view).toContain("CREATE OR REPLACE VIEW public.stock_overview");
  });

  it("the overview view is service_role only (it carries cost price)", () => {
    expect(view).toContain("REVOKE ALL ON public.stock_overview FROM PUBLIC, anon, authenticated");
    expect(view).toContain("GRANT SELECT ON public.stock_overview TO service_role");
  });
});
