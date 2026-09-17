import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { NAV, resolveActive } from "../nav";

const at = (path: string) => {
  const { area, child } = resolveActive(path);
  return [area?.key ?? null, child?.label ?? null];
};

describe("resolveActive", () => {
  it("forsiden er kun aktiv på præcis /admin", () => {
    expect(at("/admin")).toEqual(["overblik", null]);
    expect(at("/admin/kunder")).toEqual(["kunder", "Kunder"]);
  });

  it("det længste præfiks vinder", () => {
    expect(at("/admin/reservedele")).toEqual(["produkter", "Reservedele"]);
    expect(at("/admin/reservedele/kategorier")).toEqual(["produkter", "Kategorier, reservedele"]);
    expect(at("/admin/reservedele/abc-123")).toEqual(["produkter", "Reservedele"]);
    expect(at("/admin/platform/pos/cashup")).toEqual(["kasse", "Dagsopgørelse"]);
    expect(at("/admin/opkoeb/ko")).toEqual(["opkoeb", "Kø"]);
    expect(at("/admin/opkoeb/8f3a/slutseddel")).toEqual(["opkoeb", "Pipeline"]);
  });

  it("sider uden eget menupunkt lander under rette område", () => {
    expect(at("/admin/produkter/ny")).toEqual(["produkter", null]);
    expect(at("/admin/produkter/importer")).toEqual(["produkter", "Importér fra leverandør"]);
    expect(at("/admin/produkter/d91fbf19")).toEqual(["produkter", null]);
    expect(at("/admin/platform/orders/123/faktura")).toEqual(["ordrer", "Alle ordrer"]);
    expect(at("/admin/spot/opret")).toEqual(["produkter", "Tilbehør"]);
    expect(at("/admin/platform")).toEqual(["overblik", null]);
  });

  it("et præfiks matcher kun hele sti-led", () => {
    expect(at("/admin/kunderne")).toEqual([null, null]);
  });
});

describe("NAV", () => {
  it("hvert menupunkt peger på en side, der findes", () => {
    const root = join(process.cwd(), "src/app/(admin)");
    const hrefs = NAV.flatMap((a) => [a.href, ...(a.children ?? []).map((c) => c.href)]);
    const missing = [...new Set(hrefs)].filter((href) => !existsSync(join(root, href, "page.tsx")));
    expect(missing).toEqual([]);
  });

  it("har ingen dubletter og højst ti områder", () => {
    const hrefs = NAV.flatMap((a) => (a.children ?? []).map((c) => c.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(NAV.length).toBeLessThanOrEqual(10);
  });
});
