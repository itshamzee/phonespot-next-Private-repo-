import { describe, expect, it } from "vitest";
import { buildManageTree } from "../catalog-manage";

const brand = (id: string, slug: string, name: string) => ({ id, slug, name, device_type: "smartphone", logo_url: null, sort_order: 0 });
const model = (id: string, brand_id: string, name: string, series: string | null, active = true) => ({
  id,
  brand_id,
  slug: id,
  name,
  series,
  image_url: null,
  sort_order: 0,
  active,
});

describe("buildManageTree", () => {
  const tree = buildManageTree(
    [brand("b-iphone", "iphone", "iPhone"), brand("b-ipad", "ipad", "iPad"), brand("b-sam", "samsung", "Samsung")],
    [
      model("m17", "b-iphone", "iPhone 17 Pro", "iPhone 17"),
      model("m18", "b-iphone", "iPhone 18 Pro", "iPhone 18", false),
      model("mx", "b-iphone", "iPhone Mystery", null),
      model("ipad", "b-ipad", "iPad Air", "iPad Air"),
    ],
    [
      { model_id: "m17", active: true, price_dkk: 1000 },
      { model_id: "m17", active: true, price_dkk: 0 },
      { model_id: "m17", active: false, price_dkk: 500 },
      { model_id: "m18", active: false, price_dkk: 1200 },
    ],
  );

  it("grupperer iPhone og iPad under Apple, nyeste serie først og Øvrige sidst", () => {
    const apple = tree.parents[0];
    expect(apple.name).toBe("Apple");
    expect(apple.brands.map((b) => b.name)).toEqual(["iPad", "iPhone"]);
    expect(apple.brands.find((b) => b.slug === "iphone")!.series.map((s) => s.name)).toEqual(["iPhone 18", "iPhone 17", "Øvrige"]);
  });

  it("tæller kun aktive reparationer med pris som live, og viser skjulte modeller", () => {
    const iphone = tree.parents[0].brands.find((b) => b.slug === "iphone")!;
    const m17 = iphone.series[1].models[0];
    expect(m17).toMatchObject({ id: "m17", live_services: 1, total_services: 3, active: true });
    const m18 = iphone.series[0].models[0];
    expect(m18).toMatchObject({ id: "m18", live_services: 0, total_services: 1, active: false });
  });

  it("modeller uden reparationer har 0 live (Ingen priser)", () => {
    const mx = tree.parents[0].brands.find((b) => b.slug === "iphone")!.series[2].models[0];
    expect(mx).toMatchObject({ id: "mx", live_services: 0, total_services: 0 });
  });

  it("udelader ikke mærker uden modeller (så en ny model kan oprettes under dem)", () => {
    expect(tree.parents.map((p) => p.key)).toContain("samsung");
  });
});
