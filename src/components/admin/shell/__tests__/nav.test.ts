import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { NAV, resolveActive, visibleNav } from "../nav";

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
    expect(at("/admin/reservedele")).toEqual(["varer", "Reservedele"]);
    expect(at("/admin/reservedele/kategorier")).toEqual(["varer", "Kategorier, reservedele"]);
    expect(at("/admin/reservedele/abc-123")).toEqual(["varer", "Reservedele"]);
    expect(at("/admin/platform/pos/cashup")).toEqual(["kasse", "Dagsopgørelse"]);
    expect(at("/admin/platform/pos")).toEqual(["kasse", "Kasseapparat"]);
    expect(at("/admin/opkoeb/ko")).toEqual(["opkoeb", "Kø"]);
    expect(at("/admin/opkoeb/8f3a/slutseddel")).toEqual(["opkoeb", "Pipeline"]);
  });

  it("sider uden eget menupunkt lander under rette område", () => {
    expect(at("/admin/produkter/ny")).toEqual(["varer", null]);
    expect(at("/admin/produkter/importer")).toEqual(["varer", "Importér fra leverandør"]);
    expect(at("/admin/produkter/d91fbf19")).toEqual(["varer", null]);
    expect(at("/admin/platform/orders/123/faktura")).toEqual(["kasse", "Webshop-ordrer"]);
    expect(at("/admin/spot/opret")).toEqual(["varer", "Tilbehør"]);
    expect(at("/admin/varer/overforsler")).toEqual(["varer", "Overførsler"]);
    expect(at("/admin/varer")).toEqual(["varer", "Lager"]);
    expect(at("/admin/okonomi")).toEqual(["okonomi", null]);
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

  it("har de godkendte hovedpunkter i rækkefølge, med Indstillinger nederst", () => {
    expect(NAV.map((a) => a.label)).toEqual([
      "Overblik",
      "Sagsstyring",
      "Kasse",
      "Kunder",
      "Varer",
      "Opkøb",
      "Statistik",
      "Økonomi",
      "Indstillinger",
    ]);
    expect(NAV.filter((a) => a.pinned).map((a) => a.key)).toEqual(["indstillinger"]);
  });

  it("Økonomi og Medarbejdere er kun for ejeren", () => {
    const staffNav = visibleNav(false);
    expect(staffNav.map((a) => a.key)).not.toContain("okonomi");
    expect(staffNav.flatMap((a) => (a.children ?? []).map((c) => c.label))).not.toContain("Medarbejdere");
    const ownerNav = visibleNav(true);
    expect(ownerNav.map((a) => a.key)).toContain("okonomi");
    expect(ownerNav.flatMap((a) => (a.children ?? []).map((c) => c.label))).toContain("Medarbejdere");
  });

  it("menuen bruger ingen versaler i etiketter (ingen skrigende navigation)", () => {
    const labels = NAV.flatMap((a) => [a.label, ...(a.children ?? []).map((c) => c.label)]);
    expect(labels.filter((l) => l === l.toUpperCase() && l.length > 3)).toEqual([]);
  });
});

describe("Varer, Reparationer", () => {
  it("ligger under Varer og erstatter den gamle Prisliste i Sagsstyring", () => {
    const varer = NAV.find((a) => a.key === "varer");
    expect(varer?.children?.map((c) => c.href)).toContain("/admin/varer/reparationer");
    const sagsstyring = NAV.find((a) => a.key === "sagsstyring");
    expect(sagsstyring?.children?.map((c) => c.href)).not.toContain("/admin/prisliste");
    expect(resolveActive("/admin/varer/reparationer").child?.label).toBe("Reparationer");
  });

  it("den gamle prisliste videresender til den nye side", () => {
    const old = readFileSync(join(process.cwd(), "src/app/(admin)/admin/prisliste/page.tsx"), "utf8");
    expect(old).toContain('redirect("/admin/varer/reparationer")');
  });
});
