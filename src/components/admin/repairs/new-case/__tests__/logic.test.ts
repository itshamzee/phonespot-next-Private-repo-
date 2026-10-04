import { describe, expect, it } from "vitest";
import type { CatalogParentBrand, RepairServiceCategory, RepairServiceOption } from "@/lib/repairs/new-case-types";
import { INITIAL_CHECKLIST } from "@/lib/repairs/intake-checklist";
import {
  EMPTY_CUSTOMER,
  buildPanelLines,
  buildRequest,
  defaultPromisedAt,
  defaultService,
  depositHint,
  hasBackorder,
  looksLikeImei,
  searchModels,
  stockInfo,
  totalOere,
} from "../logic";

const stock = (available: number | null, others: { slug: "vejle" | "slagelse"; available: number }[] = []) => ({
  tracked: available !== null,
  available,
  other_locations: others,
  in_transit: 0,
});

function svc(over: Partial<RepairServiceOption> & { id: string; price_dkk: number }): RepairServiceOption {
  return {
    slug: over.id,
    name: "Skærmskift",
    price_oere: over.price_dkk * 100,
    quality_tier: "standard",
    quality_label: null,
    estimated_minutes: 30,
    warranty_info: null,
    part_mode: "part",
    part: null,
    ...over,
  };
}

const screen: RepairServiceCategory = {
  name: "Skærmskift",
  recommended_service_id: null,
  services: [
    svc({ id: "orig", price_dkk: 3800, quality_tier: "original", part: { sku_product_id: "s3", title: null, ...stock(0) } }),
    svc({ id: "oem", price_dkk: 1999, quality_tier: "premium", part: { sku_product_id: "s2", title: null, ...stock(0, [{ slug: "slagelse", available: 2 }]) } }),
    svc({ id: "budget", price_dkk: 1599, quality_tier: "standard", part: { sku_product_id: "s1", title: null, ...stock(4) } }),
  ],
};

describe("stockInfo", () => {
  it("tracked with stock: X på lager i butik", () => {
    expect(stockInfo(stock(4), "vejle")).toEqual({ state: "in_stock", text: "4 på lager i Vejle", tone: "ok" });
  });
  it("0 here but elsewhere: kan flyttes", () => {
    const r = stockInfo(stock(0, [{ slug: "slagelse", available: 2 }]), "vejle");
    expect(r.text).toBe("0 i Vejle · 2 i Slagelse — kan flyttes");
    expect(r.state).toBe("movable");
  });
  it("0 everywhere: bestil", () => {
    expect(stockInfo(stock(0), "vejle")).toMatchObject({ state: "backorder", text: "0 på lager · bestil" });
    expect(stockInfo({ ...stock(0), in_transit: 2 }, "slagelse").text).toBe("0 på lager · bestil (2 på vej)");
  });
  it("untracked: Ikke optalt, and no part: no text state", () => {
    expect(stockInfo(stock(null), "vejle")).toMatchObject({ state: "untracked", text: "Ikke optalt" });
    expect(stockInfo(null, "vejle").state).toBe("none");
  });
});

describe("defaultService", () => {
  it("picks the cheapest quality that can be delivered now", () => {
    expect(defaultService(screen, "vejle")?.id).toBe("budget");
  });
  it("skips out-of-stock tiers", () => {
    const c = { ...screen, services: screen.services.filter((s) => s.id !== "budget") };
    // ingen på lager: billigste overall
    expect(defaultService(c, "vejle")?.id).toBe("oem");
  });
  it("treats untracked parts as available", () => {
    const c = {
      ...screen,
      services: [
        svc({ id: "a", price_dkk: 500, part: { sku_product_id: "p", title: null, ...stock(0) } }),
        svc({ id: "b", price_dkk: 900, quality_tier: "premium", part: { sku_product_id: "q", title: null, ...stock(null) } }),
      ],
    };
    expect(defaultService(c, "vejle")?.id).toBe("b");
  });
  it("prefers the server recommendation", () => {
    expect(defaultService({ ...screen, recommended_service_id: "orig" }, "vejle")?.id).toBe("orig");
  });
});

describe("panel lines", () => {
  it("sums repairs, free text and add-ons, and flags deposit", () => {
    const lines = buildPanelLines({
      categories: [screen],
      selected: { Skærmskift: "oem" },
      free: [{ id: "f1", description: "Rens", price_dkk: 100 }],
      addons: [{ key: "p:x", kind: "product", sku_product_id: "x", title: "Beskyttelsesglas", price_oere: 9900, qty: 2 }],
      location: "vejle",
    });
    expect(lines).toHaveLength(3);
    expect(totalOere(lines)).toBe(199_900 + 10_000 + 19_800);
    expect(lines[0].note).toBe("Del flyttes fra anden butik");
    expect(depositHint(lines)).toBe(true);
    expect(hasBackorder(lines)).toBe(false);
  });
  it("backorder line", () => {
    const lines = buildPanelLines({ categories: [screen], selected: { Skærmskift: "orig" }, free: [], addons: [], location: "vejle" });
    expect(hasBackorder(lines)).toBe(true);
    expect(lines[0].note).toBe("Del skal bestilles");
  });
  it("in-stock line needs no deposit", () => {
    const lines = buildPanelLines({ categories: [screen], selected: { Skærmskift: "budget" }, free: [], addons: [], location: "vejle" });
    expect(depositHint(lines)).toBe(false);
  });
});

describe("searchModels", () => {
  const parents: CatalogParentBrand[] = [
    {
      key: "apple",
      name: "Apple",
      logo: null,
      brands: [
        {
          id: "b",
          slug: "iphone",
          name: "iPhone",
          device_type: "smartphone",
          logo_url: null,
          series: [
            {
              name: "iPhone 15",
              models: [
                { id: "1", slug: "a", name: "iPhone 15", image_url: null },
                { id: "2", slug: "b", name: "iPhone 15 Pro", image_url: null },
                { id: "3", slug: "c", name: "iPhone 15 Pro Max", image_url: null },
              ],
            },
            { name: "iPhone 14", models: [{ id: "4", slug: "d", name: "iPhone 14 Pro", image_url: null }] },
          ],
        },
      ],
    },
  ];
  it("matches abbreviations across series and name", () => {
    expect(searchModels(parents, "iph 15 pro").map((h) => h.model.id)).toEqual(["2", "3"]);
  });
  it("returns nothing for empty queries", () => {
    expect(searchModels(parents, "  ")).toEqual([]);
  });
  it("detects scanner IMEI", () => {
    expect(looksLikeImei("356938035643809")).toBe(true);
    expect(looksLikeImei("iph 15")).toBe(false);
  });
});

describe("defaultPromisedAt", () => {
  it("backorder goes to next business day 16:00", () => {
    const fri = new Date(2026, 9, 2, 10, 0); // fredag
    const d = defaultPromisedAt(fri, 30, true);
    expect(d.getDay()).toBe(1);
    expect(d.getHours()).toBe(16);
  });
  it("adds estimated minutes, rounded up to a quarter hour", () => {
    const d = defaultPromisedAt(new Date(2026, 9, 5, 10, 2), 30, false);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(45);
  });
  it("without estimate: today 16:00 before 16, otherwise next business day", () => {
    expect(defaultPromisedAt(new Date(2026, 9, 5, 9, 0), null, false).getHours()).toBe(16);
    expect(defaultPromisedAt(new Date(2026, 9, 5, 17, 0), null, false).getDate()).toBe(6);
  });
});

describe("buildRequest", () => {
  it("builds the API payload and never sends prices for catalog items", () => {
    const req = buildRequest({
      customerType: "privat",
      existing: null,
      draft: { ...EMPTY_CUSTOMER, name: "Kunde A", phone: "20 45 12 34" },
      storeId: null,
      model: { id: "m", name: "iPhone 15", brandName: "iPhone" },
      device: { serial: "123", color: "", passcode: "1234" },
      categories: [screen],
      selected: { Skærmskift: "budget" },
      free: [{ id: "f", description: "Rens", price_dkk: 100 }],
      addons: [{ key: "p:x", kind: "product", sku_product_id: "x", title: "Glas", price_oere: 9900, qty: 1 }],
      checklist: INITIAL_CHECKLIST,
      photos: [],
      notes: "Hurtig",
      promisedAt: "2026-10-05T16:00",
      assignedTo: "Mikkel",
      sendSms: true,
    });
    expect(req.items).toEqual([
      { kind: "repair", repair_service_id: "budget" },
      { kind: "free_text", description: "Rens", qty: 1, unit_price_oere: 10_000 },
      { kind: "product", sku_product_id: "x", qty: 1 },
    ]);
    expect(req.customer).toMatchObject({ id: null, name: "Kunde A", type: "privat", company_name: null });
    expect(req.details?.internal_notes).toBe("Hurtig\nAdgangskode: 1234");
    expect(req.details?.checklist?.find((c) => /adgangskode/i.test(c.label))?.status).toBe("ok");
    expect(req.notify_sms).toBe(true);
    expect(req.store_id).toBeNull();
  });
});
