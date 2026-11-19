// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const adminCalls: { select?: string; filters: unknown[][] } = { filters: [] };
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const q = {
      select: (cols: string) => ((adminCalls.select = cols), q),
      in: (...a: unknown[]) => (adminCalls.filters.push(["in", ...a]), q),
      eq: (...a: unknown[]) => (adminCalls.filters.push(["eq", ...a]), q),
      not: (...a: unknown[]) => (adminCalls.filters.push(["not", ...a]), q),
      gt: (...a: unknown[]) => (adminCalls.filters.push(["gt", ...a]), Promise.resolve({ data: [], error: null })),
    };
    return { from: () => q };
  },
}));

import { defaultFindDevicesDeps, findDevicesImpl, queryTokens, storageGb, type DeviceRow, type FindDevicesDeps, type TemplateRow } from "@/lib/fiks/devices";

const store = (name: string) => ({ name, type: "store" });

function tpl(id: string, display_name: string, min_price: number, extra: Partial<TemplateRow> = {}): TemplateRow {
  return {
    id,
    slug: display_name.toLowerCase().replace(/\s+/g, "-"),
    display_name,
    brand: display_name.startsWith("Samsung") ? "Samsung" : "Apple",
    model: display_name,
    category: display_name.startsWith("Samsung") ? "smartphone" : "iphone",
    images: [`https://x.supabase.co/${id}.webp`],
    min_price,
    device_count: 1,
    locations: [],
    ...extra,
  };
}

// Rows carry internal fields on purpose: none of them may reach the output.
function dev(template_id: string, grade: string, price: number, storage: string, location: { name: string; type: string } | null = null, extra: Record<string, unknown> = {}): DeviceRow {
  return {
    template_id,
    grade,
    selling_price: price,
    storage,
    location,
    source: "foxway",
    source_sku: "FOXWAY-SKU-1",
    source_url: "https://foxway.example/p/1",
    purchase_price: 100000,
    ...extra,
  } as DeviceRow;
}

const TEMPLATES: TemplateRow[] = [
  tpl("t13", "iPhone 13", 349900, { locations: [{ ...store("Vejle"), count: 1 }, { name: "Foxway dropship lager", type: "dropship", count: 3 }] }),
  tpl("t13p", "iPhone 13 Pro", 449900),
  tpl("t13m", "iPhone 13 mini", 299900),
  tpl("t13pm", "iPhone 13 Pro Max", 529900),
  tpl("t15", "iPhone 15", 689900),
  tpl("t12", "iPhone 12", 249900),
  tpl("t14", "iPhone 14", 399900, { device_count: 0 }),
  tpl("s23", "Samsung Galaxy S23", 299900),
];

const DEVICES: DeviceRow[] = [
  dev("t13", "A", 399900, "128GB", store("Vejle")),
  dev("t13", "B", 349900, "128GB", { name: "Foxway dropship lager", type: "dropship" }),
  dev("t13", "C", 319900, "256GB", { name: "Foxway dropship lager", type: "dropship" }),
  dev("t13p", "A", 449900, "256GB", store("Slagelse")),
  dev("t13m", "B", 299900, "128GB"),
  dev("t13pm", "A", 529900, "512GB"),
  dev("t15", "N", 699900, "128GB", store("Vejle")),
  dev("t15", "A", 689900, "128GB", null, { condition_notes: "Fabriksny, forseglet" }),
  dev("t12", "B", 249900, "64GB"),
  dev("t14", "A", 399900, "128GB"),
  dev("s23", "A", 299900, "256GB", store("Slagelse")),
];

function deps(templates = TEMPLATES, devices = DEVICES): FindDevicesDeps & { loadTemplates: ReturnType<typeof vi.fn>; loadDevices: ReturnType<typeof vi.fn> } {
  return {
    loadTemplates: vi.fn(async (category?: string) => templates.filter((t) => !category || t.category === category)),
    loadDevices: vi.fn(async (ids: string[]) => devices.filter((d) => ids.includes(d.template_id))),
  };
}

describe("findDevicesImpl", () => {
  it("returns the best match first, then the cheapest, at most 4", async () => {
    const out = await findDevicesImpl({ query: "iPhone 13" }, deps());
    expect(out.products.map((p) => p.name)).toEqual(["iPhone 13", "iPhone 13 mini", "iPhone 13 Pro", "iPhone 13 Pro Max"]);
    expect(out.products[0]).toEqual({
      name: "iPhone 13",
      url: "https://phonespot.dk/refurbished/iphone-13",
      image: "https://x.supabase.co/t13.webp",
      priceFrom: 3499,
      gradeLabel: "Stand A, B og C",
      storage: "128GB, 256GB",
      inStore: "Vejle",
    });
    expect(out.text).toContain("1. iPhone 13: fra 3.499 kr.");
    expect(out.text).toContain("Stand B · God stand fra 3.499 kr.");
    expect(out.text).toContain("På lager lige nu");
  });

  it("caps the list at 4", async () => {
    const out = await findDevicesImpl({ category: "iphone" }, deps());
    expect(out.products).toHaveLength(4);
    // Cheapest first when there is no query.
    expect(out.products[0].name).toBe("iPhone 12");
  });

  it("keeps to the budget and prices the card from the cheapest unit that fits", async () => {
    const out = await findDevicesImpl({ query: "iPhone 13", max_price: 3300 }, deps());
    expect(out.products.map((p) => [p.name, p.priceFrom])).toEqual([
      ["iPhone 13", 3199],
      ["iPhone 13 mini", 2999],
    ]);
    expect(out.text).not.toContain("4.499");
  });

  it("filters on stand and links to that stand", async () => {
    const out = await findDevicesImpl({ query: "iPhone 13", grade: "B" }, deps());
    expect(out.products.map((p) => p.name)).toEqual(["iPhone 13", "iPhone 13 mini"]);
    expect(out.products[0]).toMatchObject({
      grade: "B",
      gradeLabel: "Stand B · God stand",
      priceFrom: 3499,
      url: "https://phonespot.dk/refurbished/iphone-13?grade=B",
    });
    // The B unit is not in a store.
    expect(out.products[0].inStore).toBeUndefined();
  });

  it("filters on minimum storage", async () => {
    const out = await findDevicesImpl({ query: "iPhone 13", min_storage_gb: 256 }, deps());
    expect(out.products.map((p) => p.name)).toEqual(["iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max"]);
    expect(out.products[0]).toMatchObject({ priceFrom: 3199, storage: "256GB" });
  });

  it("filters on store", async () => {
    const out = await findDevicesImpl({ category: "iphone", in_store: "slagelse" }, deps());
    expect(out.products.map((p) => [p.name, p.inStore])).toEqual([["iPhone 13 Pro", "Slagelse"]]);
  });

  it("never returns a template without stock", async () => {
    const out = await findDevicesImpl({ query: "iPhone 14" }, deps());
    expect(out.products.map((p) => p.name)).not.toContain("iPhone 14");
    expect(out.text).not.toContain("1. iPhone 14");
  });

  it("calls grade N Fabriksny, also an A unit marked fabriksny, never refurbished", async () => {
    const out = await findDevicesImpl({ query: "iPhone 15" }, deps());
    expect(out.products[0]).toMatchObject({ name: "iPhone 15", gradeLabel: "Fabriksny", priceFrom: 6899 });
    const line = out.text.split("\n").find((l) => l.startsWith("1. "))!;
    expect(line).toContain("Fabriksny fra 6.899 kr.");
    expect(line.toLowerCase()).not.toContain("refurbished");
    expect(line).not.toContain("Stand A");
  });

  it("never lets supplier or location fields through", async () => {
    const out = await findDevicesImpl({ category: "iphone" }, deps());
    const all = JSON.stringify(out).toLowerCase();
    for (const word of ["foxway", "dropship", "source", "lager\"", "purchase", "100000"]) expect(all).not.toContain(word);
    const named = await findDevicesImpl({ query: "iPhone 13" }, deps());
    expect(JSON.stringify(named).toLowerCase()).not.toMatch(/foxway|dropship/);
  });

  it("drops a template whose name carries a forbidden word", async () => {
    const out = await findDevicesImpl({ query: "iPhone 12" }, deps([...TEMPLATES, tpl("tx", "iPhone 12 Foxway", 100000)], [...DEVICES, dev("tx", "A", 100000, "64GB")]));
    expect(out.products.map((p) => p.name)).toEqual(["iPhone 12"]);
  });

  it("says nothing matched and offers the nearest model family", async () => {
    const out = await findDevicesImpl({ query: "iPhone 13 Pro", max_price: 4000 }, deps());
    expect(out.text).toContain("Ingen enheder på lager matcher alle ønskerne");
    expect(out.products.map((p) => p.name)).toEqual(["iPhone 13", "iPhone 13 mini"]);
  });

  it("drops the filters for alternatives when the family has nothing that fits", async () => {
    const out = await findDevicesImpl({ query: "iPhone 12", grade: "A" }, deps());
    expect(out.text).toContain("Ingen enheder på lager matcher alle ønskerne");
    // Family "iphone" with grade A comes first.
    expect(out.products.every((p) => p.grade === "A")).toBe(true);
    const none = await findDevicesImpl({ query: "Samsung Galaxy S23", grade: "C" }, deps());
    expect(none.products.map((p) => p.name)).toEqual(["Samsung Galaxy S23"]);
    expect(none.products[0].grade).toBeUndefined();
  });

  it("returns no products and no prices when nothing is in stock", async () => {
    const out = await findDevicesImpl({ category: "ipad" }, deps());
    expect(out.products).toEqual([]);
    expect(out.text).not.toMatch(/\d kr\./);
  });

  it("loads templates once and units in one batched query", async () => {
    const d = deps();
    await findDevicesImpl({ query: "iPhone 13", grade: "A" }, d);
    expect(d.loadTemplates).toHaveBeenCalledTimes(1);
    expect(d.loadDevices).toHaveBeenCalledTimes(1);
  });
});

describe("default device loader", () => {
  it("asks only for listed, priced units and never selects supplier columns", async () => {
    await defaultFindDevicesDeps.loadDevices(["t1", "t2"]);
    expect(adminCalls.select).not.toMatch(/source|purchase|supplier/);
    expect(adminCalls.filters).toEqual([
      ["in", "template_id", ["t1", "t2"]],
      ["eq", "status", "listed"],
      ["not", "selling_price", "is", null],
      ["gt", "selling_price", 0],
    ]);
  });
});

describe("helpers", () => {
  it("reads model words and storage", () => {
    expect(queryTokens("Apple iPhone13 Pro 256 GB")).toEqual(["iphone", "13", "pro"]);
    expect(storageGb("1 TB")).toBe(1024);
    expect(storageGb("128GB")).toBe(128);
    expect(storageGb(null)).toBeNull();
  });
});
