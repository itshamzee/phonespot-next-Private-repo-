/**
 * Indholdet i hovedmenuens paneler. Bygges fra de skabeloner, der har enheder
 * på lager lige nu, så menuen aldrig linker til en model uden noget at købe.
 * Ren funktion; selve hentningen ligger i mega-menu-data.ts.
 */

export type MenuLink = { label: string; href: string; fromKr?: number | null; note?: string };
export type MenuGroup = { title: string; links: MenuLink[] };
export type MenuFeatured = { label: string; href: string; image: string; fromKr: number };
export type MenuPanel = { groups: MenuGroup[]; featured: MenuFeatured | null; allHref: string; allLabel: string };
export type MegaMenu = Record<"/iphones" | "/smartphones" | "/ipads" | "/baerbare" | "/smartwatches", MenuPanel>;

export type MenuTemplate = {
  category: string;
  brand: string | null;
  display_name: string;
  slug: string;
  image: string | null;
  /** Laveste pris på en enhed på lager, i øre. */
  minPriceOre: number;
  stock: number;
};

export type LaptopTierLink = { slug: string; title: string; tagline: string };

const MAX_LINKS = 8;

/** "Apple iPhone 15 Pro" -> "iPhone 15 Pro"; mærket står allerede i kategorien. */
export function shortName(name: string): string {
  return name.replace(/^Apple\s+/, "").replace(/\s+Wi-Fi \+ Cellular$/, "").trim();
}

const link = (t: MenuTemplate): MenuLink => ({ label: shortName(t.display_name), href: `/refurbished/${t.slug}`, fromKr: Math.round(t.minPriceOre / 100) });

function byName(a: MenuTemplate, b: MenuTemplate) {
  return shortName(a.display_name).localeCompare(shortName(b.display_name), "da", { numeric: true });
}

function featuredOf(list: MenuTemplate[]): MenuFeatured | null {
  // Den mest solgbare: flest på lager, derefter laveste pris. Kun med billede.
  const pick = list.filter((t) => t.image).sort((a, b) => b.stock - a.stock || a.minPriceOre - b.minPriceOre)[0];
  return pick ? { label: shortName(pick.display_name), href: `/refurbished/${pick.slug}`, image: pick.image!, fromKr: Math.round(pick.minPriceOre / 100) } : null;
}

function groupBy(list: MenuTemplate[], key: (t: MenuTemplate) => string): Map<string, MenuTemplate[]> {
  const out = new Map<string, MenuTemplate[]>();
  for (const t of list) out.set(key(t), [...(out.get(key(t)) ?? []), t]);
  return out;
}

const cap = (links: MenuLink[]) => links.slice(0, MAX_LINKS);

/** iPhones i serier, nyeste først. De tre nyeste får hver en kolonne; resten samles. */
function iphoneGroups(list: MenuTemplate[]): MenuGroup[] {
  const series = groupBy(list, (t) => shortName(t.display_name).match(/iPhone\s+(\d+)/)?.[1] ?? "andre");
  const numbered = [...series.keys()].filter((k) => k !== "andre").sort((a, b) => Number(b) - Number(a));
  const groups: MenuGroup[] = numbered.slice(0, 3).map((n) => ({
    title: `iPhone ${n}-serien`,
    links: cap(series.get(n)!.sort(byName).map(link)),
  }));
  const older = [...numbered.slice(3).flatMap((n) => series.get(n)!.sort(byName)), ...(series.get("andre") ?? [])];
  if (older.length) groups.push({ title: "Ældre iPhones", links: cap(older.map(link)) });
  return groups;
}

function ipadFamily(t: MenuTemplate): string {
  const name = shortName(t.display_name);
  if (/iPad Pro/i.test(name)) return "iPad Pro";
  if (/iPad Air/i.test(name)) return "iPad Air";
  if (/iPad mini/i.test(name)) return "iPad mini";
  return "iPad";
}

function familyGroups(list: MenuTemplate[], family: (t: MenuTemplate) => string, order: string[]): MenuGroup[] {
  const groups = groupBy(list, family);
  return [...groups.keys()]
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b, "da"))
    .map((title) => ({ title, links: cap(groups.get(title)!.sort(byName).map(link)) }));
}

export function buildMegaMenu(templates: MenuTemplate[], laptopTiers: LaptopTierLink[]): MegaMenu {
  const inStock = templates.filter((t) => t.stock > 0);
  const of = (category: string) => inStock.filter((t) => t.category === category);
  const brandOf = (t: MenuTemplate) => t.brand ?? "Andre";

  const laptops = of("laptop");
  const popularLaptops = [...laptops].sort((a, b) => b.stock - a.stock || a.minPriceOre - b.minPriceOre).slice(0, 6);

  return {
    "/iphones": { groups: iphoneGroups(of("iphone")), featured: featuredOf(of("iphone")), allHref: "/iphones", allLabel: "Se alle iPhones" },
    "/smartphones": {
      groups: familyGroups(of("smartphone"), brandOf, ["Samsung", "Google", "OnePlus"]),
      featured: featuredOf(of("smartphone")),
      allHref: "/smartphones",
      allLabel: "Se alle smartphones",
    },
    "/ipads": {
      groups: familyGroups(of("ipad"), ipadFamily, ["iPad Pro", "iPad Air", "iPad", "iPad mini"]),
      featured: featuredOf(of("ipad")),
      allHref: "/ipads",
      allLabel: "Se alle iPads",
    },
    "/baerbare": {
      groups: [
        { title: "Efter budget", links: laptopTiers.map((t) => ({ label: t.title, href: `/baerbare/${t.slug}`, note: t.tagline })) },
        ...(popularLaptops.length ? [{ title: "Flest på lager", links: popularLaptops.map(link) }] : []),
      ],
      featured: featuredOf(laptops),
      allHref: "/baerbare",
      allLabel: "Se alle bærbare",
    },
    "/smartwatches": {
      groups: familyGroups(of("smartwatch"), brandOf, ["Apple", "Samsung"]),
      featured: featuredOf(of("smartwatch")),
      allHref: "/smartwatches",
      allLabel: "Se alle ure",
    },
  };
}
