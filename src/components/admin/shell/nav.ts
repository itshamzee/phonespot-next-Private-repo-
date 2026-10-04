/**
 * Admin-menuen, bygget som POS-systemet C1ST og drevet af de godkendte skærmbilleder
 * (docs/design/admin-2026-10): Overblik, Sagsstyring, Kasse, Kunder, Varer, Opkøb,
 * Statistik, Økonomi (kun ejer) og Indstillinger nederst. Underpunkter vises kun
 * for det område man står i. Alle gamle URL'er virker stadig; `match` lægger sider
 * uden eget menupunkt (opret, detaljer) under rette område.
 *
 * Andre dele af admin udvider menuen ved at tilføje børn her; hvert href skal have
 * en page.tsx (testen i __tests__/nav.test.ts tjekker det).
 */

/** repairs = åbne sager i butikken (menu-tallet); newRepairs = ikke-modtagne, til notifikationer. */
export type CountKey = "orders" | "repairs" | "newRepairs" | "inquiries" | "buyback";

export interface NavChild {
  href: string;
  label: string;
  /** Ekstra sti-præfikser, der hører til dette punkt. */
  match?: string[];
  countKey?: CountKey;
  /** Kun ejeren ser punktet (siden og API'et håndhæver det også). */
  ownerOnly?: boolean;
}

export interface NavArea {
  key: string;
  label: string;
  href: string;
  /** SVG-stier (24x24, streg). */
  icon: string[];
  match?: string[];
  countKey?: CountKey;
  children?: NavChild[];
  /** Vises nederst i menuen, adskilt fra resten. */
  pinned?: boolean;
  /** Kun ejeren ser området. */
  ownerOnly?: boolean;
}

export const NAV: NavArea[] = [
  {
    key: "overblik",
    label: "Overblik",
    href: "/admin",
    match: ["/admin/platform"],
    icon: ["m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"],
  },
  {
    key: "sagsstyring",
    label: "Sagsstyring",
    href: "/admin/reparationer",
    countKey: "repairs",
    icon: ["M9 6h11M9 12h11M9 18h11", "m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"],
    children: [
      { href: "/admin/reparationer", label: "Sager" },
      { href: "/admin/indlevering", label: "Ny indlevering" },
      { href: "/admin/prisliste", label: "Prisliste" },
    ],
  },
  {
    key: "kasse",
    label: "Kasse",
    href: "/admin/kasse",
    match: ["/admin/platform/pos"],
    icon: ["M5 10h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z", "M7 10V5h10v5M7 15h2M11 15h2"],
    children: [
      { href: "/admin/kasse", label: "Kasseapparat", match: ["/admin/platform/pos"] },
      { href: "/admin/platform/pos/cashup", label: "Dagsopgørelse" },
      { href: "/admin/platform/orders", label: "Webshop-ordrer", countKey: "orders" },
      { href: "/admin/platform/draft-orders", label: "Fakturakladder" },
      { href: "/admin/platform/abandoned-checkouts", label: "Forladte kurve" },
      { href: "/admin/platform/rabatkoder", label: "Rabatkoder" },
      { href: "/admin/reservationer", label: "Reservationer" },
      { href: "/admin/venteliste", label: "Venteliste" },
    ],
  },
  {
    key: "kunder",
    label: "Kunder",
    href: "/admin/kunder",
    icon: [
      "M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
      "M3 20c0-3 3-5 6-5s6 2 6 5",
      "M19.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
      "M17 14c2.5 0 4 1.5 4 4",
    ],
    children: [
      { href: "/admin/kunder", label: "Kunder" },
      { href: "/admin/henvendelser", label: "Henvendelser", countKey: "inquiries" },
      { href: "/admin/b2b", label: "Erhverv" },
    ],
  },
  {
    key: "varer",
    label: "Varer",
    href: "/admin/varer",
    match: ["/admin/produkter"],
    icon: ["M4 5v14M7 5v14M11 5v14M14 5v14M17 5v14M20 5v14"],
    children: [
      { href: "/admin/varer", label: "Lager" },
      { href: "/admin/varer/overforsler", label: "Overførsler" },
      { href: "/admin/platform/products", label: "Produkter", match: ["/admin/platform/sku"] },
      { href: "/admin/tilbehoer", label: "Tilbehør", match: ["/admin/spot", "/admin/tilfoej-cover"] },
      { href: "/admin/reservedele", label: "Reservedele" },
      { href: "/admin/platform/stock", label: "Enheder på lager" },
      { href: "/admin/platform/intake", label: "Registrér enhed" },
      { href: "/admin/produkter/importer", label: "Importér fra leverandør" },
      { href: "/admin/platform/kategorier", label: "Kategorier" },
      { href: "/admin/reservedele/kategorier", label: "Kategorier, reservedele" },
      { href: "/admin/reservedele/kvaliteter", label: "Kvalitetsniveauer" },
      { href: "/admin/foneday", label: "Foneday" },
      { href: "/admin/foxway-import", label: "Foxway-import" },
    ],
  },
  {
    key: "opkoeb",
    label: "Opkøb",
    href: "/admin/opkoeb",
    countKey: "buyback",
    icon: ["M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2", "M20 4v5h-5M4 20v-5h5"],
    children: [
      { href: "/admin/opkoeb", label: "Pipeline" },
      { href: "/admin/opkoeb/ko", label: "Kø" },
      { href: "/admin/opkoeb/priser", label: "Priser" },
      { href: "/admin/opkoeb/indstillinger", label: "Automatik" },
    ],
  },
  {
    key: "statistik",
    label: "Statistik",
    href: "/admin/statistik",
    icon: ["M4 20V10M10 20V4M16 20v-8M22 20H2"],
    children: [
      { href: "/admin/statistik", label: "Salg" },
      { href: "/admin/seo", label: "SEO" },
    ],
  },
  {
    key: "okonomi",
    label: "Økonomi",
    href: "/admin/okonomi",
    ownerOnly: true,
    icon: ["M5 7h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z", "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
  },
  {
    key: "indstillinger",
    label: "Indstillinger",
    href: "/admin/indstillinger",
    pinned: true,
    icon: [
      "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z",
      "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    ],
    children: [
      { href: "/admin/indstillinger", label: "Skabeloner" },
      { href: "/admin/indstillinger/virksomhed", label: "Virksomhed" },
      { href: "/admin/indstillinger/medarbejdere", label: "Medarbejdere", ownerOnly: true },
      { href: "/admin/indstillinger/profil", label: "Profil og signatur" },
      { href: "/admin/sms-log", label: "SMS-log" },
      { href: "/admin/mail-log", label: "Mail-log" },
      { href: "/admin/platform/aktivitetslog", label: "Aktivitetslog" },
    ],
  },
];

/** Menuen som den ser ud for en rolle: ejer-områder og -punkter skjules for alle andre. */
export function visibleNav(isOwner: boolean, nav: NavArea[] = NAV): NavArea[] {
  if (isOwner) return nav;
  return nav
    .filter((area) => !area.ownerOnly)
    .map((area) => (area.children ? { ...area, children: area.children.filter((c) => !c.ownerOnly) } : area));
}

export interface ActiveNav {
  area: NavArea | null;
  child: NavChild | null;
}

function covers(prefix: string, pathname: string): boolean {
  if (prefix === "/admin") return pathname === "/admin";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Finder område og underpunkt for en sti. Det længste præfiks vinder, så
 * /admin/reservedele/kategorier ikke også markerer "Reservedele" — den gamle
 * menu brugte ren startsWith og lyste flere punkter op på én gang.
 */
export function resolveActive(pathname: string, nav: NavArea[] = NAV): ActiveNav {
  let best: { area: NavArea; child: NavChild | null; length: number } | null = null;
  const consider = (area: NavArea, child: NavChild | null, prefix: string) => {
    if (!covers(prefix, pathname)) return;
    // Ved lige lange præfikser vinder underpunktet over området
    if (!best || prefix.length > best.length || (prefix.length === best.length && child && !best.child)) {
      best = { area, child, length: prefix.length };
    }
  };
  for (const area of nav) {
    for (const prefix of [area.href, ...(area.match ?? [])]) consider(area, null, prefix);
    for (const child of area.children ?? []) {
      for (const prefix of [child.href, ...(child.match ?? [])]) consider(area, child, prefix);
    }
  }
  if (!best) return { area: null, child: null };
  const found = best as { area: NavArea; child: NavChild | null };
  return { area: found.area, child: found.child };
}
