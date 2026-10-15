// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { removeCaseItem, updateCaseItemPrice } from "../case-create";
import { toCaseError } from "../case-errors";
import { decideUnitPrice } from "../case-pricing";
import { removeItemSchema, updateItemSchema } from "../case-schemas";
import { activityText, buildTimeline } from "../case-timeline";
import { oereToInput, parseKrToOere } from "../price-input";

const staff = { id: "s1", role: "staff", name: "Mikkel", location_slug: "vejle" } as never;
const raw = { lines: [], backorders: [], total_oere: 99_900 };

describe("parseKrToOere", () => {
  it("accepts whole kroner, comma decimals and Danish thousand separators", () => {
    expect(parseKrToOere("999")).toBe(99_900);
    expect(parseKrToOere("999,50")).toBe(99_950);
    expect(parseKrToOere("999.5")).toBe(99_950);
    expect(parseKrToOere("1.299,50")).toBe(129_950);
    expect(parseKrToOere("1.299")).toBe(129_900);
    expect(parseKrToOere(" 999 kr. ")).toBe(99_900);
    expect(parseKrToOere("0")).toBe(0);
  });
  it("rejects empty, negative, text and more than two decimals", () => {
    for (const bad of ["", "abc", "-5", "9,999", "1,2,3", "99999999999"]) expect(parseKrToOere(bad)).toBeNull();
  });
  it("formats back to a field value", () => {
    expect(oereToInput(99_900)).toBe("999");
    expect(oereToInput(99_905)).toBe("999,05");
  });
});

describe("updateItemSchema / removeItemSchema", () => {
  it("requires an integer, non-negative price in oere", () => {
    expect(updateItemSchema.safeParse({ unit_price_oere: 99_900 }).success).toBe(true);
    expect(updateItemSchema.safeParse({ unit_price_oere: 0 }).success).toBe(true);
    expect(updateItemSchema.safeParse({ unit_price_oere: -1 }).success).toBe(false);
    expect(updateItemSchema.safeParse({ unit_price_oere: 9.5 }).success).toBe(false);
    expect(updateItemSchema.safeParse({}).success).toBe(false);
  });
  it("trims the reason, and an empty reason becomes null", () => {
    expect(updateItemSchema.parse({ unit_price_oere: 1, reason: "  Kulance " }).reason).toBe("Kulance");
    expect(updateItemSchema.parse({ unit_price_oere: 1, reason: "  " }).reason).toBeNull();
    expect(updateItemSchema.safeParse({ unit_price_oere: 1, reason: "x".repeat(201) }).success).toBe(false);
  });
  it("accepts an empty removal body", () => {
    expect(removeItemSchema.parse({}).reason).toBeNull();
    expect(removeItemSchema.parse({ reason: " Fejl " }).reason).toBe("Fejl");
  });
});

describe("price rule (same as the update RPC)", () => {
  it("a price other than the list price needs a reason, equal price clears it", () => {
    expect(() => decideUnitPrice(119_900, 99_900, null, "Skærmskift")).toThrow(/begrundelse/);
    expect(decideUnitPrice(119_900, 99_900, "Aftalt pris med kunden")).toMatchObject({ unit_oere: 99_900, reason: "Aftalt pris med kunden", discounted: true });
    expect(decideUnitPrice(119_900, 119_900, "gammel grund").reason).toBeNull();
  });
});

describe("updateCaseItemPrice / removeCaseItem", () => {
  it("calls repair_case_update_item with the staff id and returns the shaped lines", async () => {
    const rpc = vi.fn(async () => ({ data: raw, error: null }));
    const res = await updateCaseItemPrice("t1", "i1", 99_900, "Aftalt pris med kunden", staff, { rpc } as never);
    expect(rpc).toHaveBeenCalledWith("repair_case_update_item", {
      p: { ticket_id: "t1", item_id: "i1", staff_id: "s1", unit_price_oere: 99_900, reason: "Aftalt pris med kunden" },
    });
    expect(res.total_oere).toBe(99_900);
  });
  it("rejects an invalid price before touching the database", async () => {
    const rpc = vi.fn();
    await expect(updateCaseItemPrice("t1", "i1", -5, null, staff, { rpc } as never)).rejects.toMatchObject({ code: "invalid_price" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("turns a database price_reason_required into a Danish CaseError", async () => {
    const rpc = async () => ({ data: null, error: { message: "case:price_reason_required:Skærmskift" } });
    await expect(updateCaseItemPrice("t1", "i1", 1, null, staff, { rpc } as never)).rejects.toMatchObject({
      code: "price_reason_required",
      status: 400,
      message: expect.stringContaining("Skærmskift"),
    });
  });
  it("passes the removal reason on", async () => {
    const rpc = vi.fn(async () => ({ data: raw, error: null }));
    await removeCaseItem("t1", "i1", staff, "Kunden ville ikke have den", { rpc } as never);
    expect(rpc).toHaveBeenCalledWith("repair_case_remove_item", {
      p: { ticket_id: "t1", item_id: "i1", staff_id: "s1", reason: "Kunden ville ikke have den" },
    });
  });
});

describe("new error codes", () => {
  it("maps them to Danish messages", () => {
    expect(toCaseError({ message: "case:remove_reason_required" })).toMatchObject({ status: 400, message: expect.stringContaining("Skriv hvorfor") });
    expect(toCaseError({ message: "case:item_not_priced:Skærm" })?.status).toBe(400);
    expect(toCaseError({ message: "case:item_released" })?.status).toBe(409);
    expect(toCaseError({ message: "case:ticket_paid" })?.message).toMatch(/refundere|returnere/);
  });
});

describe("timeline of line actions", () => {
  const at = "2026-10-15T10:00:00Z";
  it("renders a price change with list price and reason", () => {
    const text = activityText({
      action: "repair_case_price_changed",
      details: { description: "Skærmskift", old_unit_oere: 119_900, new_unit_oere: 99_900, list_oere: 119_900, reason: "Aftalt pris med kunden", kind: "repair" },
    });
    expect(text).toBe("Pris rettet på Skærmskift: 1.199 kr. til 999 kr. (listepris 1.199 kr.). Begrundelse: Aftalt pris med kunden");
  });
  it("renders a removal with reason and a note when the part was already used", () => {
    const text = activityText({
      action: "repair_case_item_removed",
      details: { description: "Skærmskift", unit_oere: 99_900, reason: "Kulance", used_parts: [{ description: "Skærm", qty: 1 }] },
    });
    expect(text).toContain("Skærmskift fjernet fra sagen (999 kr.)");
    expect(text).toContain("lageret er ikke rettet");
    expect(text).toContain("Begrundelse: Kulance");
  });
  it("ignores unknown actions and merges known ones into the timeline", () => {
    expect(activityText({ action: "something_else", details: {} })).toBeNull();
    const items = buildTimeline({
      ticket: { id: "t", created_at: "2026-10-15T09:00:00Z" },
      activity: [
        { id: "a1", action: "repair_case_price_changed", created_at: at, actor_name: "Mikkel", details: { description: "Skærmskift", old_unit_oere: 1, new_unit_oere: 2, list_oere: 1, reason: "x" } },
        { id: "a2", action: "unknown", created_at: at, details: {} },
      ],
    });
    expect(items.map((i) => i.kind)).toEqual(["linjer", "oprettet"]);
    expect(items[0].actor).toBe("Mikkel");
  });
});

describe("migration 20261015100000_repair_case_price_edit", () => {
  const sql = readFileSync(path.resolve(__dirname, "../../../../supabase/migrations/20261015100000_repair_case_price_edit.sql"), "utf8");
  const fn = (name: string) => {
    const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    expect(start).toBeGreaterThan(-1);
    const next = sql.indexOf("CREATE OR REPLACE FUNCTION", start + 10);
    return sql.slice(start, next === -1 ? undefined : next);
  };

  it("is one transaction and grants only service_role", () => {
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toMatch(/^COMMIT;$/m);
    expect(sql).toContain("'public.repair_case_update_item(jsonb)'");
    expect(sql).toContain("REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION %s TO service_role");
  });

  it("update: locks, checks actor and editability, and allows consumed parts", () => {
    const f = fn("repair_case_update_item");
    expect(f).toContain("SECURITY DEFINER SET search_path = pg_catalog, public");
    expect(f).toContain("FOR UPDATE");
    expect(f).toContain("repair__check_actor");
    expect(f).toContain("repair__assert_editable");
    expect(f).not.toContain("item_consumed");
    expect(f).toContain("case_fail('item_sold')");
    expect(f).toContain("case_fail('item_not_priced'");
    expect(f).toContain("case_fail('price_reason_required'");
    expect(f).toContain("repair_case_price_changed");
    expect(f).toContain("repair__sync_services");
  });

  it("update: keeps the unit = list OR reason constraint satisfied", () => {
    const f = fn("repair_case_update_item");
    expect(f).toContain("CASE WHEN v_new <> v_list THEN v_reason END");
    expect(f).toContain("WHEN it.kind = 'free_text' THEN v_new");
  });

  it("remove: allows consumed parts with a reason and never touches stock for them", () => {
    const f = fn("repair_case_remove_item");
    expect(f).toContain("remove_reason_required");
    expect(f).not.toContain("item_consumed");
    expect(f).toContain("case_fail('item_sold')");
    expect(f).not.toMatch(/UPDATE public\.sku_stock/);
    expect(f).not.toMatch(/(INSERT INTO|UPDATE|DELETE FROM) public\.stock_movements/);
    // Kun ikke-brugte dele frigives
    expect(f).toMatch(/ELSE\s+PERFORM public\.repair__release_item\(ch\.id\)/);
    expect(f).toContain("'reason', v_reason");
  });
});
