/**
 * Admin-menuen: få områder, og underpunkter der kun vises for det område man
 * står i (samme idé som Shopify-admin). Rækkefølgen følger arbejdsdagen i
 * butikken, ikke hvornår siderne blev bygget. Alle gamle URL'er virker stadig;
 * `match` lægger sider uden eget menupunkt (opret, detaljer) under rette område.
 */

export type CountKey = "orders" | "repairs" | "inquiries" | "buyback";

export interface NavChild {
  href: string;
  label: string;
  /** Ekstra sti-præfikser, der hører til dette punkt. */
  match?: string[];
  countKey?: CountKey;
}

export interface NavArea {
  key: string;
  label: string;
  href: string;
  /** Heroicons outline path(s). */
  icon: string[];
  match?: string[];
  countKey?: CountKey;
  children?: NavChild[];
  /** Vises nederst i menuen, adskilt fra resten. */
  pinned?: boolean;
}

export const NAV: NavArea[] = [
  {
    key: "overblik",
    label: "Overblik",
    href: "/admin",
    match: ["/admin/platform"],
    icon: ["M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"],
  },
  {
    key: "ordrer",
    label: "Ordrer",
    href: "/admin/platform/orders",
    countKey: "orders",
    icon: ["M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"],
    children: [
      { href: "/admin/platform/orders", label: "Alle ordrer" },
      { href: "/admin/platform/draft-orders", label: "Fakturakladder" },
      { href: "/admin/platform/abandoned-checkouts", label: "Forladte kurve" },
      { href: "/admin/platform/rabatkoder", label: "Rabatkoder" },
      { href: "/admin/reservationer", label: "Reservationer" },
      { href: "/admin/venteliste", label: "Venteliste" },
    ],
  },
  {
    key: "produkter",
    label: "Produkter",
    href: "/admin/platform/products",
    match: ["/admin/produkter"],
    icon: ["M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z", "M6 6h.008v.008H6V6z"],
    children: [
      { href: "/admin/platform/products", label: "Alle produkter", match: ["/admin/platform/sku"] },
      { href: "/admin/tilbehoer", label: "Tilbehør", match: ["/admin/spot", "/admin/tilfoej-cover"] },
      { href: "/admin/produkter/importer", label: "Importér fra leverandør" },
      { href: "/admin/reservedele", label: "Reservedele" },
      { href: "/admin/platform/kategorier", label: "Kategorier" },
      { href: "/admin/reservedele/kategorier", label: "Kategorier, reservedele" },
      { href: "/admin/reservedele/kvaliteter", label: "Kvalitetsniveauer" },
      { href: "/admin/foneday", label: "Foneday" },
    ],
  },
  {
    key: "lager",
    label: "Lager",
    href: "/admin/platform/stock",
    icon: ["M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"],
    children: [
      { href: "/admin/platform/stock", label: "Enheder på lager" },
      { href: "/admin/platform/intake", label: "Registrér enhed" },
      { href: "/admin/platform/transfers", label: "Overførsler" },
      { href: "/admin/foxway-import", label: "Foxway-import" },
    ],
  },
  {
    key: "reparation",
    label: "Reparation",
    href: "/admin/reparationer",
    countKey: "repairs",
    icon: ["M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"],
    children: [
      { href: "/admin/reparationer", label: "Sager" },
      { href: "/admin/indlevering", label: "Ny indlevering" },
      { href: "/admin/prisliste", label: "Prisliste" },
    ],
  },
  {
    key: "opkoeb",
    label: "Opkøb",
    href: "/admin/opkoeb",
    countKey: "buyback",
    icon: ["M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"],
    children: [
      { href: "/admin/opkoeb", label: "Pipeline" },
      { href: "/admin/opkoeb/ko", label: "Kø" },
      { href: "/admin/opkoeb/priser", label: "Priser" },
      { href: "/admin/opkoeb/indstillinger", label: "Automatik" },
    ],
  },
  {
    key: "kunder",
    label: "Kunder",
    href: "/admin/kunder",
    icon: ["M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"],
    children: [
      { href: "/admin/kunder", label: "Kunder" },
      { href: "/admin/henvendelser", label: "Henvendelser", countKey: "inquiries" },
      { href: "/admin/b2b", label: "Erhverv" },
    ],
  },
  {
    key: "kasse",
    label: "Kasse",
    href: "/admin/platform/pos",
    icon: ["M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"],
    children: [
      { href: "/admin/platform/pos", label: "Kasseapparat" },
      { href: "/admin/platform/pos/cashup", label: "Dagsopgørelse" },
    ],
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
      { href: "/admin/indstillinger/profil", label: "Profil og signatur" },
      { href: "/admin/seo", label: "SEO" },
      { href: "/admin/sms-log", label: "SMS-log" },
      { href: "/admin/mail-log", label: "Mail-log" },
      { href: "/admin/platform/aktivitetslog", label: "Aktivitetslog" },
    ],
  },
];

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
