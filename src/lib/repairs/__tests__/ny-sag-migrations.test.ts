// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Migrationerne køres ikke mod en database i tests. De her tests låser de regler i SQL'en,
 * som lager-, pris- og momssikkerheden i "Ny sag" hviler på.
 */
const dir = path.resolve(__dirname, "../../../../supabase/migrations");
const read = (f: string) => readFileSync(path.join(dir, f), "utf8");

const b1 = read("20261005100000_repair_catalog_links.sql");
const b2 = read("20261005110000_repair_parts_stock.sql");
const schema = read("20261005120000_repair_case_schema.sql");
const fns = read("20261005130000_repair_case_functions.sql");
const pos = read("20261005140000_pos_create_sale_repair_items.sql");
const reserved = read("20261005150000_reserved_qty_awareness.sql");
const oldPos = read("20261004300200_pos_order_number.sql");

function fn(src: string, name: string): string {
  const start = src.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start, `${name} exists`).toBeGreaterThan(-1);
  const next = src.indexOf("CREATE OR REPLACE FUNCTION", start + 10);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("every migration is one transaction", () => {
  for (const [name, sql] of Object.entries({ b1, b2, schema, fns, pos, reserved })) {
    it(name, () => {
      expect(sql).toMatch(/^BEGIN;$/m);
      expect(sql).toMatch(/^COMMIT;$/m);
      expect(sql).toMatch(/Verifikation/);
    });
  }
});

describe("B1 catalog", () => {
  it("seeds the tier rules from the spec table", () => {
    expect(b1).toContain("'skaerme' AND q.quality = 'standard' THEN 'standard-incell'");
    expect(b1).toContain("'skaerme' AND q.quality = 'premium' THEN 'premium-soft-oled'");
    expect(b1).toContain("q.quality = 'original' THEN 'service-pack'");
    expect(b1).toContain("ELSE 'oem-equivalent'");
  });
  it("forces the two category names the website reads", () => {
    expect(b1).toContain("SET service_category = 'Skærmskift'");
    expect(b1).toContain("SET service_category = 'Batteriskift'");
  });
  it("adds part_category_id, part_mode and the series trigger", () => {
    expect(b1).toContain("part_mode IN ('part', 'none', 'manual')");
    expect(b1).toContain("repair_series_for");
    expect(b1).toMatch(/CREATE TRIGGER trg_repair_models_set_series/);
  });
});

describe("B2 parts and stock", () => {
  it("new parts start as always_in_stock, draft, repair_only, price 0", () => {
    const create = b2.slice(b2.indexOf("-- 2. create"), b2.indexOf("-- 3. lagerrækker"));
    expect(create).toContain("0, true, 'draft', false");
    expect(create).toContain("repair_model_id, repair_only");
    expect(create).toMatch(/'spare-part', 'spare-part'/);
  });
  it("bootstrap defaults to a dry run and has a single-service mode", () => {
    expect(b2).toMatch(/bootstrap_repair_parts\(p_dry_run boolean DEFAULT true, p_repair_service_id uuid DEFAULT NULL\)/);
    expect(b2).toContain("IF NOT p_dry_run THEN");
    expect(b2).toContain("pg_advisory_xact_lock");
  });
  it("never links foneday prices into the selling price", () => {
    const body = fn(b2, "bootstrap_repair_parts");
    expect(body).toContain("'repair_part', false, false");
    expect(body).not.toMatch(/SET[^;]*selling_price/);
  });
  it("reserved_qty is guarded and reason 'repair' is added without dropping old values", () => {
    expect(b2).toContain("CHECK (reserved_qty >= 0 AND reserved_qty <= quantity)");
    expect(b2).toContain("ARRAY['repair']");
    expect(b2).toContain("ref_repair_ticket_id");
  });
  it("only pos_adjust_stock and stock_receive_goods switch always_in_stock off", () => {
    expect(fn(b2, "pos_adjust_stock")).toContain("repair_part_start_tracking");
    expect(fn(b2, "stock_receive_goods")).toContain("repair_part_start_tracking");
    const all = [b1, b2, schema, fns, pos, reserved].join("\n");
    const writers = all.match(/always_in_stock = false/g) ?? [];
    expect(writers).toHaveLength(1);
    expect(fn(b2, "repair_part_start_tracking")).toContain("always_in_stock = false");
  });
  it("adjusting stock cannot go below what is reserved", () => {
    expect(fn(b2, "pos_adjust_stock")).toContain("stock_below_reserved");
  });
  it("trigger on repair_services bootstraps one service and never blocks an edit", () => {
    expect(b2).toContain("AFTER INSERT OR UPDATE OF part_category_id, part_mode, quality_tier, model_id, active ON public.repair_services");
    expect(b2).toContain("EXCEPTION WHEN OTHERS THEN");
  });
});

describe("B3 schema", () => {
  it("reads the existing status constraint dynamically and adds annulleret", () => {
    expect(schema).toContain("pg_get_constraintdef");
    expect(schema).toContain("ARRAY['annulleret']");
    expect(schema).not.toMatch(/IN \('modtaget'/);
  });
  it("repair_ticket_items has kind and reference checks, price reason check and RLS without policies", () => {
    expect(schema).toContain("kind IN ('repair', 'part', 'device', 'product', 'free_text')");
    expect(schema).toContain("repair_ticket_items_ref_check");
    expect(schema).toContain("unit_price_oere = list_price_oere OR length(btrim(coalesce(price_reason");
    expect(schema).toContain("'none', 'planned', 'reserved', 'backorder', 'consumed', 'released', 'sold'");
    expect(schema).toContain("ALTER TABLE public.repair_ticket_items ENABLE ROW LEVEL SECURITY");
    expect(schema).not.toMatch(/CREATE POLICY/);
  });
  it("keeps store_id and location_id in sync and clears device reservation info", () => {
    expect(schema).toContain("trg_repair_tickets_sync_location");
    expect(fn(schema, "clear_device_reservation")).toContain("reservation_ticket_id := NULL");
  });
  it("the device passcode is a ticket column, never put into notes", () => {
    expect(schema).toContain("device_passcode text");
    expect(fn(fns, "repair_case_create")).toContain("device_passcode");
    expect(fn(fns, "repair_case_cancel")).toContain("device_passcode = NULL");
  });
});

describe("B3 functions", () => {
  const names = [
    "repair_case_create",
    "repair_case_add_item",
    "repair_case_remove_item",
    "repair_case_swap_part",
    "repair_consume_parts",
    "repair_case_cancel",
  ];
  it("are SECURITY DEFINER with a fixed search_path and only for service_role", () => {
    for (const n of names) {
      const body = fn(fns, n);
      expect(body, n).toContain("SECURITY DEFINER SET search_path = pg_catalog, public");
    }
    expect(fns).toMatch(/REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated/);
    expect(fns).toMatch(/GRANT EXECUTE ON FUNCTION %s TO service_role/);
  });
  it("prices always come from the database and a deviation needs a reason", () => {
    const plan = fn(fns, "repair__plan_item");
    expect(plan).toContain("v_list := rs.price_dkk * 100");
    expect(plan).toContain("price_reason_required");
    expect(plan).toContain("sp.selling_price");
    expect(plan).toContain("dv.selling_price");
  });
  it("reserves only tracked parts: none for always-in-stock, backorder at 0", () => {
    const r = fn(fns, "repair__reserve_sku");
    expect(r).toContain("RETURN 'none'");
    expect(r).toContain("RETURN 'backorder'");
    expect(r).toContain("v_q - v_r >= p_qty");
  });
  it("create is idempotent per staff + key and rejects a changed body", () => {
    const c = fn(fns, "repair_case_create");
    expect(c).toContain("ON CONFLICT (staff_id, idem_key) DO NOTHING");
    expect(c).toContain("idempotency_conflict");
    expect(c).toContain("'replayed', true");
  });
  it("create mirrors services jsonb and writes the status log", () => {
    expect(fn(fns, "repair__sync_services")).toContain("'price_dkk'");
    expect(fn(fns, "repair_case_create")).toContain("INSERT INTO public.repair_status_log");
  });
  it("consume is idempotent, subtracts quantity and reserved_qty and writes reason 'repair'", () => {
    const c = fn(fns, "repair_consume_parts");
    expect(c).toContain("stock_status IN ('none', 'planned', 'reserved', 'backorder')");
    expect(c).toContain("quantity = quantity - it.qty, reserved_qty = reserved_qty - it.qty");
    expect(c).toContain("'repair'");
    expect(c).toContain("cost_oere = coalesce(v_cost, cost_oere)");
  });
  it("cancel refuses open deposits and sold items, releases everything", () => {
    const c = fn(fns, "repair_case_cancel");
    expect(c).toContain("cancel_has_deposit");
    expect(c).toContain("cancel_has_sold_items");
    expect(c).toContain("'annulleret'");
    expect(c).toContain("released");
  });
  it("legacy tickets (no items but services/booking/quote) cannot be edited", () => {
    expect(fn(fns, "repair__assert_editable")).toContain("legacy_ticket");
  });
});

describe("pos_create_sale", () => {
  const body = fn(pos, "pos_create_sale");
  it("keeps every behaviour of the previous definition", () => {
    for (const must of [
      "v_receipt_number, 'pos'",
      "pos_distribute_discount",
      "'deposit_applied'",
      "deposit_requires_repair_line",
      "one_ticket_per_sale",
      "payment_mismatch",
      "case_paid",
      "pos_legacy_payment_method",
      "round(v_margin::numeric * 25 / 125)",
      "device_not_pos_sellable",
      "ticket_already_paid",
    ]) {
      expect(body, must).toContain(must);
      expect(fn(oldPos, "pos_create_sale"), must).toContain(must);
    }
    expect(body).toContain("order_number, type, customer_id");
  });
  it("sells case products and devices as real lines and marks the case item sold", () => {
    expect(body).toContain("repair_ticket_item_id");
    expect(body).toContain("stock_status = 'sold', order_item_id = v_oi");
    expect(body).toContain("d.reservation_ticket_id = ti.ticket_id");
    expect(body).toContain("l_scheme := array_append(l_scheme, d.vat_scheme)");
  });
  it("plain lines respect reserved stock; case lines consume their reservation", () => {
    expect(body).toContain("quantity - reserved_qty >= sp.q - sp.q_res");
    expect(body).toContain("reserved_qty = reserved_qty - sp.q_res");
  });
  it("locks cases before devices", () => {
    expect(body.indexOf("FROM public.repair_tickets")).toBeLessThan(body.indexOf("FROM public.devices"));
  });
});

describe("reserved_qty awareness", () => {
  it("webshop checkout, transfers and the inventory views use quantity - reserved_qty", () => {
    expect(fn(reserved, "complete_checkout_order")).toContain("sum(quantity - reserved_qty)");
    expect(fn(reserved, "complete_checkout_order")).toContain("st.quantity - st.reserved_qty AS quantity");
    expect(fn(reserved, "transfer_send")).toContain("SELECT quantity - reserved_qty INTO v_have");
    expect(reserved).toContain("sum(st.quantity - st.reserved_qty) AS total_stock");
  });
  it("keeps the 25/125 brugtmoms formula of the webshop checkout", () => {
    expect(fn(reserved, "complete_checkout_order")).toContain("25 / 125.0");
  });
});
