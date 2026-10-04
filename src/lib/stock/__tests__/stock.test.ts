// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));

import {
  canReceiveGoods,
  canRequestRow,
  canSeeCost,
  isLow,
  mapOverviewRow,
  myStoreSlug,
  queryOverview,
  requestSources,
  searchTokens,
  type OverviewRow,
} from "../overview";

function row(over: Partial<OverviewRow> = {}): OverviewRow {
  return {
    rowKey: "k",
    kind: "sku",
    skuProductId: "p",
    templateId: null,
    storage: null,
    grade: null,
    name: "USB-C kabel 1 m",
    itemType: "tilbehoer",
    vatScheme: "regular",
    costPrice: 1800,
    price: 9900,
    priceMax: 9900,
    alwaysInStock: false,
    qty: { vejle: 14, slagelse: 1, webshop: 40 },
    min: { vejle: 5, slagelse: 5, webshop: null },
    inTransit: 0,
    ...over,
  };
}

describe("low stock highlight", () => {
  it("flags quantities under the store's own minimum", () => {
    expect(isLow(row(), "vejle")).toBe(false);
    expect(isLow(row(), "slagelse")).toBe(true);
    expect(isLow(row(), "webshop")).toBe(false); // no minimum set
  });
  it("never flags always-in-stock items or a zero minimum", () => {
    expect(isLow(row({ alwaysInStock: true, qty: { vejle: 0, slagelse: 0, webshop: 0 } }), "vejle")).toBe(false);
    expect(isLow(row({ min: { vejle: 0, slagelse: 0, webshop: 0 } }), "slagelse")).toBe(false);
  });
});

describe("Anmod", () => {
  const device = row({ kind: "device", qty: { vejle: 0, slagelse: 2, webshop: 1 }, min: { vejle: null, slagelse: null, webshop: null } });

  it("is offered when my store has 0 and another store has stock", () => {
    expect(canRequestRow(device, "vejle")).toBe(true);
    expect(requestSources(device, "vejle")).toEqual(["slagelse", "webshop"]);
  });
  it("is not offered when my store has stock, nobody else has, or I have no store", () => {
    expect(canRequestRow(row(), "vejle")).toBe(false);
    expect(canRequestRow(row({ qty: { vejle: 0, slagelse: 0, webshop: 0 } }), "vejle")).toBe(false);
    expect(canRequestRow(device, null)).toBe(false);
  });
  it("is not offered for always-in-stock items", () => {
    expect(canRequestRow(row({ alwaysInStock: true, qty: { vejle: 0, slagelse: 5, webshop: 5 } }), "vejle")).toBe(false);
  });
});

describe("roles and my store", () => {
  it("cost prices and goods receipt are owner/manager only", () => {
    expect(canSeeCost({ role: "owner" })).toBe(true);
    expect(canSeeCost({ role: "manager" })).toBe(true);
    expect(canSeeCost({ role: "employee" })).toBe(false);
    expect(canReceiveGoods({ role: "employee" })).toBe(false);
    expect(canReceiveGoods({ role: "manager" })).toBe(true);
  });
  it("staff's store is their own; the owner's is the switcher value", () => {
    expect(myStoreSlug({ role: "employee", location_slug: "slagelse" }, "alle")).toBe("slagelse");
    expect(myStoreSlug({ role: "employee", location_slug: "slagelse" }, "vejle")).toBe("slagelse"); // cannot widen
    expect(myStoreSlug({ role: "owner", location_slug: null }, "vejle")).toBe("vejle");
    expect(myStoreSlug({ role: "owner", location_slug: null }, "alle")).toBeNull();
  });
});

describe("search tokens", () => {
  it("strips characters that could break a PostgREST filter", () => {
    expect(searchTokens("iPhone 14, Pro) %")).toEqual(["iphone", "14", "pro"]);
    expect(searchTokens("a,b.eq.c")).toEqual(["a", "b.eq.c"]);
    expect(searchTokens(null)).toEqual([]);
  });
});

describe("mapOverviewRow", () => {
  it("maps view columns and numeric strings", () => {
    const r = mapOverviewRow({
      row_key: "dev:1:128:A",
      kind: "device",
      name: "iPhone",
      item_type: "serievare",
      vat_scheme: "brugtmoms",
      cost_price: "310000",
      price: 499900,
      qty_vejle: 0,
      qty_slagelse: 2,
      qty_webshop: 1,
      min_vejle: null,
      in_transit: 1,
    });
    expect(r).toMatchObject({ kind: "device", vatScheme: "brugtmoms", costPrice: 310000, inTransit: 1 });
    expect(r.qty).toEqual({ vejle: 0, slagelse: 2, webshop: 1 });
    expect(r.min.vejle).toBeNull();
  });
});

describe("queryOverview cost privacy", () => {
  function fakeDb(selects: string[]) {
    const q: Record<string, unknown> = {};
    for (const m of ["order", "range", "ilike", "or"]) q[m] = () => q;
    q.select = (cols: string) => {
      selects.push(cols);
      return q;
    };
    q.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 });
    return { from: () => q } as never;
  }

  it("does not even select cost_price for employees", async () => {
    const selects: string[] = [];
    const res = await queryOverview({ role: "employee" }, {}, fakeDb(selects));
    expect(selects[0]).not.toContain("cost_price");
    expect(res.canSeeCost).toBe(false);
  });

  it("selects cost_price for managers and owners", async () => {
    for (const role of ["manager", "owner"]) {
      const selects: string[] = [];
      const res = await queryOverview({ role }, {}, fakeDb(selects));
      expect(selects[0]).toContain("cost_price");
      expect(res.canSeeCost).toBe(true);
    }
  });
});
