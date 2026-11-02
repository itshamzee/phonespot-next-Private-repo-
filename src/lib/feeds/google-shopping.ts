// Rene mapping-funktioner til Google Shopping-feedet
// (src/app/feeds/google-shopping/route.ts). Ingen I/O her, så de kan testes.

import { accessoryAvailability } from "@/lib/accessory-availability";
import { effectiveGrade, GRADE_SHORT_LABEL, isNewGrade, merchantCondition } from "@/lib/grades";
import { FREE_SHIPPING_THRESHOLD, getShippingPrice } from "@/lib/shipping";
import { accessoryProductPath } from "@/lib/tilbehoer-config";
import { extractColor } from "@/lib/product-color-siblings";
import type { DeviceGrade } from "@/lib/supabase/platform-types";

export const BASE_URL = "https://phonespot.dk";

// ---------------------------------------------------------------------------
// Små hjælpere
// ---------------------------------------------------------------------------

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatPrice(oreAmount: number): string {
  return (oreAmount / 100).toFixed(2) + " DKK";
}

export function isValidGtin(ean: string | null | undefined): boolean {
  if (!ean) return false;
  return /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(ean.trim());
}

/** GS1-kontrolciffer for GTIN-8/12/13/14. Afviser alt, der ikke er rene cifre af de længder. */
export function hasValidGtinCheckDigit(gtin: string | null | undefined): boolean {
  if (!gtin || !isValidGtin(gtin)) return false;
  const digits = gtin.trim().padStart(14, "0").split("").map(Number);
  const sum = digits.slice(0, 13).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === digits[13];
}

/** Fjerner HTML-tags og kollapser whitespace; Google tillader max 5000 tegn. */
export function cleanText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4900);
}

/** sale_price sendes kun, når den er strengt lavere end price (og > 0). */
export function validSalePrice(price: number, sale: number | null | undefined): number | null {
  if (sale == null || !Number.isFinite(sale)) return null;
  return sale > 0 && sale < price ? sale : null;
}

// ---------------------------------------------------------------------------
// Fragt
// ---------------------------------------------------------------------------

/**
 * Fragt i feedet følger src/lib/shipping.ts:
 *  - pakkeshop er ALTID gratis (SHIPPING_PRICES.pakkeshop.price === 0), så
 *    "0.00 DKK" er korrekt for pakkeshop uanset varens pris.
 *  - levering til døren (postnord) koster 39 kr og er gratis fra 500 kr.
 */
export function shippingLines(priceOre: number): string[] {
  const pakkeshop = getShippingPrice("pakkeshop") ?? 0;
  const door = getShippingPrice("postnord") ?? 3900;
  const doorPrice = priceOre >= FREE_SHIPPING_THRESHOLD ? 0 : door;
  const block = (service: string, p: number) => [
    "      <g:shipping>",
    "        <g:country>DK</g:country>",
    `        <g:service>${escapeXml(service)}</g:service>`,
    `        <g:price>${formatPrice(p)}</g:price>`,
    "      </g:shipping>",
  ];
  return [...block("Pakkeshop", pakkeshop), ...block("Levering til døren", doorPrice)];
}

// ---------------------------------------------------------------------------
// Tilbehør
// ---------------------------------------------------------------------------

export interface CategoryMapping {
  googleCategory: string;
  productType: string;
}

const SCREEN_PROTECTOR: CategoryMapping = {
  googleCategory:
    "Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Screen Protectors",
  productType: "Tilbehoer > Beskyttelsesglas",
};

export const ACCESSORY_FEED_CATEGORY: Record<string, CategoryMapping> = {
  cover: {
    googleCategory:
      "Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases",
    productType: "Tilbehoer > Covers & Cases",
  },
  screen_protector: SCREEN_PROTECTOR,
  "spot-glass": SCREEN_PROTECTOR,
  charger: {
    googleCategory: "Electronics > Electronics Accessories > Power > Power Adapters & Chargers",
    productType: "Tilbehoer > Opladere",
  },
  cable: {
    googleCategory: "Electronics > Electronics Accessories > Cables > USB Cables",
    productType: "Tilbehoer > Kabler",
  },
  audio: {
    googleCategory: "Electronics > Audio > Headphones & Earbuds",
    productType: "Tilbehoer > Lyd",
  },
  other: {
    googleCategory: "Electronics > Communications > Telephony > Mobile Phone Accessories",
    productType: "Tilbehoer > Holdere",
  },
};

export interface AccessoryRow {
  id: string;
  title: string;
  slug: string | null;
  category?: string | null;
  subcategory: string | null;
  brand: string | null;
  selling_price: number;
  sale_price: number | null;
  images: string[] | null;
  ean: string | null;
  product_number: string | null;
  description: string | null;
  short_description: string | null;
  status: string;
  is_active: boolean;
  always_in_stock: boolean;
  attributes?: Record<string, string | number | boolean | null> | null;
}

/** description før short_description, når short er kortere end 50 tegn. */
export function accessoryDescription(
  p: Pick<AccessoryRow, "title" | "description" | "short_description">,
): string {
  const short = cleanText(p.short_description);
  const long = cleanText(p.description);
  if (short.length >= 50) return short;
  return long || short || cleanText(p.title);
}

/** Samme URL som sitemap (delt funktion i tilbehoer-config). */
export function accessoryUrl(p: Pick<AccessoryRow, "slug" | "subcategory" | "category">): string {
  return `${BASE_URL}${accessoryProductPath({ subcategory: p.subcategory, category: p.category, slug: p.slug ?? "" })}`;
}

/**
 * Titler skal være unikke i feedet. Ved kollision tilføjes farve (fra
 * attributes) eller varenummer. Returnerer id -> endelig titel.
 */
export function dedupeAccessoryTitles(rows: AccessoryRow[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = r.title.trim().toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const r of rows) {
    let title = r.title.trim();
    if ((counts.get(title.toLowerCase()) ?? 0) > 1) {
      const attrs = r.attributes ?? {};
      const color = String(attrs.color ?? attrs.colour ?? attrs.farve ?? "").trim();
      if (color && !title.toLowerCase().includes(color.toLowerCase())) {
        title = `${title} - ${color}`;
      } else if (r.product_number && !title.includes(r.product_number)) {
        title = `${title} (${r.product_number})`;
      }
    }
    out.set(r.id, title);
  }
  return out;
}

/** item_group_id for farvevarianter: samme basistitel, forskellig farve. */
export function accessoryGroupId(title: string): string | null {
  const c = extractColor(title);
  if (!c) return null;
  return "grp-" + c.baseTitle.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-").replace(/^-|-$/g, "");
}

/** Gruppe-id'er, der forekommer på mindst to varer (ellers giver item_group_id ingen mening). */
export function sharedGroupIds(rows: AccessoryRow[]): Set<string> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const g = accessoryGroupId(r.title);
    if (g) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([g]) => g));
}

/** Samme betingelser som buildAccessoryItem: kun disse varer findes i feedet. */
export function isPublishableAccessory(product: AccessoryRow): boolean {
  if (!product.images || product.images.length === 0) return false;
  if (product.status !== "published" || !product.is_active) return false;
  return Boolean(product.slug);
}

export function buildAccessoryItem(
  product: AccessoryRow,
  stockQuantity: number | null,
  title: string = product.title,
  groupIds: Set<string> = new Set(),
): string | null {
  if (!isPublishableAccessory(product)) return null;
  // Kontrolleret ovenfor; TypeScript kan ikke se det gennem hjælperen.
  const images = product.images!;

  const mapping =
    ACCESSORY_FEED_CATEGORY[product.subcategory ?? "other"] ?? ACCESSORY_FEED_CATEGORY.other;
  const availability = accessoryAvailability(stockQuantity, product.always_in_stock);
  const sale = validSalePrice(product.selling_price, product.sale_price);
  const hasGtin = isValidGtin(product.ean);
  const group = accessoryGroupId(product.title);

  const lines: string[] = [
    "    <item>",
    `      <g:id>${escapeXml(product.id)}</g:id>`,
    `      <g:title>${escapeXml(title)}</g:title>`,
    `      <g:description>${escapeXml(accessoryDescription(product))}</g:description>`,
    `      <g:link>${escapeXml(accessoryUrl(product))}</g:link>`,
    `      <g:image_link>${escapeXml(images[0])}</g:image_link>`,
    `      <g:condition>new</g:condition>`,
    `      <g:availability>${availability.feed}</g:availability>`,
    `      <g:price>${formatPrice(product.selling_price)}</g:price>`,
  ];
  if (sale != null) lines.push(`      <g:sale_price>${formatPrice(sale)}</g:sale_price>`);
  if (group && groupIds.has(group)) {
    lines.push(`      <g:item_group_id>${escapeXml(group)}</g:item_group_id>`);
  }
  if (product.brand) lines.push(`      <g:brand>${escapeXml(product.brand)}</g:brand>`);
  if (hasGtin) lines.push(`      <g:gtin>${escapeXml(product.ean!.trim())}</g:gtin>`);
  if (product.product_number) {
    lines.push(`      <g:mpn>${escapeXml(product.product_number)}</g:mpn>`);
  }
  if (!hasGtin && !product.product_number) {
    lines.push("      <g:identifier_exists>no</g:identifier_exists>");
  }
  lines.push(
    `      <g:google_product_category>${escapeXml(mapping.googleCategory)}</g:google_product_category>`,
    `      <g:product_type>${escapeXml(mapping.productType)}</g:product_type>`,
    ...shippingLines(product.selling_price),
    "    </item>",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Enheder
// ---------------------------------------------------------------------------

export interface FeedTemplate {
  id: string;
  brand: string;
  category: string | null;
  display_name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  images: string[] | null;
  default_attributes?: Record<string, unknown> | null;
  /** processor, ram, screen_size, os osv. Bruges til titel og product_detail på bærbare. */
  specifications?: Record<string, unknown> | null;
}

export interface FeedDevice {
  template_id: string;
  grade: string | null;
  condition_notes?: string | null;
  storage: string | null;
  color: string | null;
  selling_price: number | null;
  photos: string[] | null;
  /** Kun brugt af det lokale lagerfeed. */
  location_id?: string | null;
  source?: string | null;
  /** Leverandørens varenummer; ofte producentens MPN med et suffiks. */
  source_sku?: string | null;
  /** Indkøbspris i øre. Kun til avancemærket (custom_label_0), aldrig synlig. */
  purchase_price?: number | null;
}

export interface DeviceGroup {
  /** g:id. Længde højst 50 tegn (Googles grænse). */
  id: string;
  template: FeedTemplate;
  grade: string;
  minPrice: number;
  count: number;
  photos: string[];
  storages: Set<string>;
  colors: Set<string>;
  /** Kun sat, når hele gruppen er én præcis variant med kendt GTIN. */
  gtin: string | null;
  /** Producentens varenummer, kun når alle enheder i gruppen har det samme. */
  mpn: string | null;
  /** Variant, som linket skal forvælge, fordi ?grade= alene ville vise en anden pris. */
  linkVariant: { storage: string | null; color: string | null } | null;
  devices: FeedDevice[];
}

/**
 * EAN'er, leverandøren selv har tildelt brugte enheder. Samme præfiks går igen
 * på Apple, Dell, HP og Lenovo, så det er ikke producentens GTIN og matcher
 * ikke Googles produktkatalog. De bliver i gtins_by_variant til internt brug,
 * men må ikke sendes som g:gtin.
 */
export const SUPPLIER_ASSIGNED_GTIN_PREFIXES = ["5707271", "5715251"] as const;

/**
 * GTIN for præcis denne lagerplads og farve, ellers null.
 *
 * default_attributes.gtin bruges bevidst ikke: den hører til én ukendt
 * konfiguration af modellen. Uden både lagerplads og farve er varianten ikke
 * entydig, så de skal begge være kendte.
 */
export function variantGtin(
  template: FeedTemplate,
  storage: string | null | undefined,
  color: string | null | undefined,
): string | null {
  const s = storage?.trim();
  const c = color?.trim();
  if (!s || !c) return null;
  const map = template.default_attributes?.gtins_by_variant as Record<string, unknown> | null | undefined;
  const raw = map?.[`${s}|${c}`];
  if (typeof raw !== "string") return null;
  const gtin = raw.trim();
  if (!hasValidGtinCheckDigit(gtin)) return null;
  const bare = gtin.replace(/^0+/, "");
  if (SUPPLIER_ASSIGNED_GTIN_PREFIXES.some((p) => bare.startsWith(p))) return null;
  return gtin;
}

/**
 * Producentens varenummer (MPN) ud fra leverandørens source_sku, ellers null.
 *
 * Leverandøren hænger egne suffikser på ("-NORDICS", "-CTO-04", "-G") og
 * bruger for nogle partier egne koder ("TLT14G1MX24P", "PRE7-114762-08-A").
 * Kun mønstre, der er producentens egne, slipper igennem: Lenovos
 * maskintype (10 tegn, 20/21/82/83) og HP's varenummer med eller uden
 * landekode (#UUW). Et forkert MPN er værre end intet, så alt andet afvises.
 */
export function manufacturerMpn(brand: string | null | undefined, sourceSku: string | null | undefined): string | null {
  const b = brand?.trim().toLowerCase();
  let sku = sourceSku?.trim().toUpperCase();
  if (!b || !sku) return null;
  const suffix = /-(NORDICS?|NORDIC(-\d+)?|CTO(-\d+)?|[A-Z]|\d{2})$/;
  sku = sku.replace(suffix, "").replace(suffix, "");
  if (b === "lenovo") return /^(20|21|82|83)[A-Z0-9]{8}$/.test(sku) ? sku : null;
  if (b === "hp") {
    if (/^[0-9A-Z]{6,9}#[A-Z0-9]{3}$/.test(sku) && /\d/.test(sku) && /[A-Z]/.test(sku)) return sku;
    if (/^[0-9A-Z]{4,6}E[ACT][A-Z]?$/.test(sku) && /\d/.test(sku)) return sku;
    return null;
  }
  return null;
}

/** "Intel Core i5-1145G7" -> "i5-1145G7", "AMD Ryzen 5 Pro 4650U" -> "Ryzen 5 Pro 4650U". */
export function shortProcessor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s+/g, " ").trim();
  const m =
    s.match(/\b(i[3579]-?\s?\d{4,5}[A-Z]{0,2}\d?)\b/i) ??
    s.match(/\b(Ultra [579] \d{3}[A-Z]?)\b/i) ??
    s.match(/\b(Ryzen (?:AI )?\d+(?: Pro)? \d{3,4}[A-Z]{0,2})\b/i) ??
    s.match(/\b(R[3579]-\d{3,4}[A-Z]{0,2})\b/) ??
    s.match(/\b(M[1-5](?: Pro| Max)?)\b/);
  return m ? m[1].replace(/^i(\d)[ -]?/i, "i$1-") : null;
}

const spec = (t: FeedTemplate, key: string): string | null => {
  const v = t.specifications?.[key];
  return typeof v === "string" && v.trim() && !/^0\s*GB$/i.test(v.trim()) ? v.trim() : null;
};

/** "512GB SSD NVMe M.2" -> "512GB SSD". */
export function shortStorage(storage: string): string {
  const m = storage.match(/(\d+(?:[.,]\d+)?)\s*(GB|TB)/i);
  if (!m) return storage.trim();
  return `${m[1]}${m[2].toUpperCase()}${/ssd/i.test(storage) ? " SSD" : ""}`;
}

/** Kort, stabil hash (FNV-1a), så id'et holder sig under Googles 50 tegn. */
function variantHash(storage: string, color: string): string {
  let h = 0x811c9dc5;
  for (const ch of `${storage}|${color}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function buildGroup(
  id: string,
  template: FeedTemplate,
  grade: string,
  devices: FeedDevice[],
  gtin: string | null,
  linkVariant: DeviceGroup["linkVariant"],
): DeviceGroup {
  const g: DeviceGroup = {
    id,
    template,
    grade,
    minPrice: Math.min(...devices.map((d) => d.selling_price!)),
    count: devices.length,
    photos: devices.find((d) => d.photos?.length)?.photos ?? [],
    storages: new Set(),
    colors: new Set(),
    gtin,
    mpn: null,
    linkVariant,
    devices,
  };
  const mpns = new Set(devices.map((d) => manufacturerMpn(template.brand, d.source_sku)));
  if (mpns.size === 1) g.mpn = [...mpns][0];
  for (const d of devices) {
    if (d.storage?.trim()) g.storages.add(d.storage.trim());
    if (d.color?.trim()) g.colors.add(d.color.trim());
  }
  return g;
}

const variantOf = (d: FeedDevice) => ({
  storage: d.storage?.trim() || null,
  color: d.color?.trim() || null,
});

/**
 * Én vare pr. model og stand (effektiv stand, som på siden). Prisen er den
 * laveste i gruppen = produktsidens pris for den stand.
 *
 * Varianter med kendt GTIN får deres egen vare. Har standen kun den ene
 * variant, beholder varen det gamle id; ellers får varianten id
 * `<model>-<stand>-<hash>`, og resten af standen bliver på det gamle id.
 * Alle varer i en opdelt stand peger på en bestemt variant, da ?grade= alene
 * ville vise standens laveste pris og ikke varens egen.
 */
export function groupDevices(
  devices: FeedDevice[],
  templates: Map<string, FeedTemplate>,
): DeviceGroup[] {
  const byGrade = new Map<string, { template: FeedTemplate; grade: string; devices: FeedDevice[] }>();
  for (const device of devices) {
    const template = templates.get(device.template_id);
    if (!template || !device.selling_price) continue;
    const grade = effectiveGrade(device);
    const key = `${template.id}-${grade}`;
    const entry = byGrade.get(key) ?? { template, grade, devices: [] };
    entry.devices.push(device);
    byGrade.set(key, entry);
  }

  const groups: DeviceGroup[] = [];
  for (const [baseId, { template, grade, devices: units }] of byGrade) {
    const byVariant = new Map<string, FeedDevice[]>();
    for (const d of units) {
      const { storage, color } = variantOf(d);
      const key = `${storage ?? ""}|${color ?? ""}`;
      byVariant.set(key, [...(byVariant.get(key) ?? []), d]);
    }
    const gtinOf = (d: FeedDevice) => variantGtin(template, d.storage, d.color);

    if (byVariant.size === 1) {
      groups.push(buildGroup(baseId, template, grade, units, gtinOf(units[0]), null));
      continue;
    }

    const rest: FeedDevice[] = [];
    for (const variantUnits of byVariant.values()) {
      const gtin = gtinOf(variantUnits[0]);
      if (!gtin) {
        rest.push(...variantUnits);
        continue;
      }
      const v = variantOf(variantUnits[0]);
      groups.push(
        buildGroup(`${baseId}-${variantHash(v.storage!, v.color!)}`, template, grade, variantUnits, gtin, v),
      );
    }
    if (rest.length > 0) {
      const wasSplit = rest.length < units.length;
      const cheapest = rest.reduce((a, b) => (b.selling_price! < a.selling_price! ? b : a));
      groups.push(buildGroup(baseId, template, grade, rest, null, wasSplit ? variantOf(cheapest) : null));
    }
  }
  return groups;
}

export function gradeLabelForTitle(grade: string): string {
  return isNewGrade(grade)
    ? "Fabriksny"
    : (GRADE_SHORT_LABEL[grade as DeviceGrade] ?? `Stand ${grade}`);
}

/**
 * "Apple iPhone 14 Pro 128GB Sort - Refurbished, Som ny". Lagerplads og farve
 * medtages kun, når gruppen har præcis én værdi (ellers ville titlen være
 * forkert for nogle af eksemplarerne).
 */
export function deviceTitle(group: DeviceGroup): string {
  const { template } = group;
  let name = template.display_name.trim();
  if (template.brand && !name.toLowerCase().startsWith(template.brand.toLowerCase())) {
    name = `${template.brand} ${name}`;
  }
  const parts = [name];
  const laptop = template.category?.toLowerCase() === "laptop";
  if (laptop) {
    const cpu = shortProcessor(spec(template, "processor"));
    // Modelnavnet har nogle gange processoren i forvejen ("T14s G1 R5 Pro 4650U").
    const cpuNumber = cpu?.split(/[\s-]/).pop()?.toLowerCase();
    if (cpu && !(cpuNumber && name.toLowerCase().includes(cpuNumber))) parts.push(cpu);
    const ram = spec(template, "ram");
    if (ram && /\d/.test(ram)) parts.push(`${ram.replace(/\s+/g, "")} RAM`);
  }
  if (group.storages.size === 1) {
    const raw = [...group.storages][0];
    const s = laptop ? shortStorage(raw) : raw;
    if (!name.toLowerCase().includes(s.toLowerCase())) parts.push(s);
  }
  if (laptop) {
    const screen = spec(template, "screen_size");
    if (screen) parts.push(screen.replace(/\s+/g, ""));
  }
  if (group.colors.size === 1) {
    const c = [...group.colors][0];
    if (!name.toLowerCase().includes(c.toLowerCase())) parts.push(c);
  }
  const suffix = isNewGrade(group.grade)
    ? "Fabriksny"
    : `Refurbished, ${gradeLabelForTitle(group.grade)}`;
  return `${parts.join(" ")} - ${suffix}`;
}

/** short_description -> description -> genereret tekst. Tom streng tæller som manglende. */
export function deviceDescription(group: DeviceGroup, title: string): string {
  const short = cleanText(group.template.short_description);
  if (short) return short;
  const long = cleanText(group.template.description);
  if (long) return long;
  const name = title.replace(/ - (Refurbished, .*|Fabriksny)$/, "");
  return isNewGrade(group.grade)
    ? `${name} - fabriksny hos PhoneSpot.dk. Sendes fra Danmark.`
    : `${name} - refurbished og testet, ${gradeLabelForTitle(group.grade).toLowerCase()}. 36 mdr. garanti hos PhoneSpot.dk.`;
}

/** Linket forvælger standen på produktsiden, så prisen matcher feedet. */
export function deviceUrl(group: DeviceGroup): string {
  const params = [`grade=${encodeURIComponent(group.grade)}`];
  if (group.linkVariant?.storage) params.push(`storage=${encodeURIComponent(group.linkVariant.storage)}`);
  if (group.linkVariant?.color) params.push(`color=${encodeURIComponent(group.linkVariant.color)}`);
  return `${BASE_URL}/refurbished/${group.template.slug}?${params.join("&")}`;
}

/** Eget foto -> farvens billeder (når varen kun har én farve) -> modellens billeder. */
export function deviceImages(group: DeviceGroup): string[] {
  if (group.photos.length > 0) return group.photos;
  const byColor = group.template.default_attributes?.images_by_color as
    | Record<string, string[]>
    | null
    | undefined;
  const colorImages = group.colors.size === 1 ? byColor?.[[...group.colors][0]] : undefined;
  if (colorImages?.length) return colorImages;
  return group.template.images ?? [];
}

/** Samme betingelser som buildDeviceItem: kun disse varer findes i feedet. */
export function isPublishableDeviceGroup(group: DeviceGroup): boolean {
  return Boolean(group.template.slug) && deviceImages(group).length > 0;
}

export const DEVICE_GOOGLE_CATEGORY: Record<string, string> = {
  iphone: "Electronics > Communications > Telephony > Mobile Phones",
  smartphone: "Electronics > Communications > Telephony > Mobile Phones",
  ipad: "Electronics > Computers > Tablet Computers",
  tablet: "Electronics > Computers > Tablet Computers",
  laptop: "Electronics > Computers > Laptops",
  smartwatch: "Electronics > Electronics Accessories > Wearable Technology > Smartwatches",
};

const DEVICE_TYPE_LABEL: Record<string, string> = {
  iphone: "iPhones",
  smartphone: "Smartphones",
  ipad: "iPads",
  tablet: "Tablets",
  laptop: "Bærbare",
  smartwatch: "Smartwatches",
};

/**
 * Avance på varens pris (den billigste enhed i gruppen), som Google Ads kan
 * byde efter: "bud-a" over 1.500 kr., "bud-b" 500-1.500 kr.,
 * "bud-c" under 500 kr., "bud-x" uden registreret indkøbspris. Neutrale koder,
 * fordi feedet er offentligt og ikke må afsløre avancen.
 */
export function marginLabel(group: DeviceGroup): string {
  const cheapest = group.devices.reduce((a, b) => (b.selling_price! < a.selling_price! ? b : a));
  const cost = cheapest.purchase_price;
  if (!cost || cost <= 0) return "bud-x";
  const margin = (cheapest.selling_price! - cost) / 100;
  if (margin > 1500) return "bud-a";
  if (margin >= 500) return "bud-b";
  return "bud-c";
}

/** Egen kategorisering til kampagnestyring, fx "Refurbished > Bærbare > Lenovo". */
export function deviceProductType(group: DeviceGroup): string {
  const kind = DEVICE_TYPE_LABEL[group.template.category?.toLowerCase() ?? ""] ?? "Enheder";
  return `${isNewGrade(group.grade) ? "Fabriksny" : "Refurbished"} > ${kind} > ${group.template.brand}`;
}

/** Fakta, der gælder alle enheder (se lib/promises.ts). Ingen påstande om den enkelte enhed. */
export function deviceHighlights(group: DeviceGroup): string[] {
  const h = ["36 måneders garanti", "30 dages returret", "Dansk forhandler med butikker i Vejle og Slagelse"];
  if (!isNewGrade(group.grade)) h.unshift(`Refurbished, stand: ${gradeLabelForTitle(group.grade).toLowerCase()}`);
  return h;
}

/** product_detail-linjer til bærbare: processor, RAM, skærm, grafik, styresystem. */
export function deviceDetails(group: DeviceGroup): Array<[string, string]> {
  if (group.template.category?.toLowerCase() !== "laptop") return [];
  const t = group.template;
  const rows: Array<[string, string | null]> = [
    ["Processor", spec(t, "processor")],
    ["RAM", spec(t, "ram")],
    ["Skærmstørrelse", spec(t, "screen_size")],
    ["Grafik", spec(t, "graphics")],
    ["Styresystem", spec(t, "os")],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

export function buildDeviceItem(group: DeviceGroup): string | null {
  const { template } = group;
  if (!isPublishableDeviceGroup(group)) return null;
  const images = deviceImages(group);

  const title = deviceTitle(group);
  const storage = group.storages.size === 1 ? [...group.storages][0] : null;
  const color = group.colors.size === 1 ? [...group.colors][0] : null;
  const lines: string[] = [
    "    <item>",
    `      <g:id>${escapeXml(group.id)}</g:id>`,
    `      <g:item_group_id>${escapeXml(template.id)}</g:item_group_id>`,
    `      <g:title>${escapeXml(title)}</g:title>`,
    `      <g:description>${escapeXml(deviceDescription(group, title))}</g:description>`,
    `      <g:link>${escapeXml(deviceUrl(group))}</g:link>`,
    `      <g:image_link>${escapeXml(images[0])}</g:image_link>`,
    ...images.slice(1, 10).map((src) => `      <g:additional_image_link>${escapeXml(src)}</g:additional_image_link>`),
    `      <g:condition>${merchantCondition(group.grade)}</g:condition>`,
    `      <g:availability>in_stock</g:availability>`,
    `      <g:price>${formatPrice(group.minPrice)}</g:price>`,
    `      <g:brand>${escapeXml(template.brand)}</g:brand>`,
    // GTIN kommer fra product_templates.default_attributes.gtins_by_variant (se
    // variantGtin). Uden præcist variantmatch har enheden hverken GTIN eller MPN.
    ...(group.gtin ? [`      <g:gtin>${escapeXml(group.gtin)}</g:gtin>`] : []),
    ...(group.mpn ? [`      <g:mpn>${escapeXml(group.mpn)}</g:mpn>`] : []),
    ...(!group.gtin && !group.mpn ? [`      <g:identifier_exists>no</g:identifier_exists>`] : []),
    ...(color ? [`      <g:color>${escapeXml(color)}</g:color>`] : []),
    ...(storage ? [`      <g:size>${escapeXml(storage)}</g:size>`] : []),
    `      <g:google_product_category>${escapeXml(DEVICE_GOOGLE_CATEGORY[template.category?.toLowerCase() ?? ""] ?? "Electronics")}</g:google_product_category>`,
    `      <g:product_type>${escapeXml(deviceProductType(group))}</g:product_type>`,
    `      <g:custom_label_0>${marginLabel(group)}</g:custom_label_0>`,
    ...deviceHighlights(group).map((h) => `      <g:product_highlight>${escapeXml(h)}</g:product_highlight>`),
    ...deviceDetails(group).map(
      ([name, value]) =>
        `      <g:product_detail><g:section_name>Specifikationer</g:section_name><g:attribute_name>${escapeXml(name)}</g:attribute_name><g:attribute_value>${escapeXml(value)}</g:attribute_value></g:product_detail>`,
    ),
    ...shippingLines(group.minPrice),
    "    </item>",
  ];
  return lines.join("\n");
}
