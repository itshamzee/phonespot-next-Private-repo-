/**
 * Læser en leverandørs produktside, som er kopieret (Ctrl+A, Ctrl+C) og
 * indsat i admin. Leverandørsider ligger typisk bag login/Cloudflare, så vi
 * henter dem ikke selv; udklipsholderen har både HTML (med billed-URL'er) og
 * ren tekst (med spec-tabeller). Skrevet mod Euro Mobile Company, men
 * heuristikkerne er generelle: "Label<tab/newline>Værdi"-par, en "Benefits"-
 * liste og en beskrivelse mellem titel og specs.
 */
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

export interface SupplierProduct {
  title: string;
  articleNumber: string | null;
  brand: string | null;
  /** Modeller som leverandøren skriver dem. */
  modelLabels: string[];
  /** De af modellerne vi kender (slugs fra TILBEHOER_DEVICES). */
  modelSlugs: string[];
  unknownModels: string[];
  modelCodes: string[];
  /** Spec-par med normaliserede nøgler (lowercase). */
  specs: Record<string, string>;
  benefits: string[];
  description: string;
  imageUrls: string[];
  priceEur: number | null;
  advisedPriceEur: number | null;
  /** Vores bedste bud på tilbehørskategori og attributter. */
  guess: { subcategory: string; attributes: Record<string, string> };
}

const KNOWN_LABELS = [
  "article number", "advised price", "manufacturer", "brand", "device brands", "series", "models", "model codes",
  "compatible with", "product group", "product type", "case type", "magsafe", "material", "device", "anti burst case",
  "color", "colour", "what's included in the box?", "what's included in the box", "ean", "sku", "weight",
];

export const SPEC_LABEL_KEYS: Record<string, string> = {
  "article number": "article_number", "advised price": "advised_price", "manufacturer": "brand", "brand": "brand",
  "device brands": "device_brands", "series": "series", "models": "models", "model codes": "model_codes",
  "compatible with": "compatible_with", "product group": "product_group", "product type": "product_type",
  "case type": "case_type", "magsafe": "magsafe", "material": "material", "device": "device",
  "anti burst case": "anti_burst", "color": "color", "colour": "color", "what's included in the box?": "in_the_box",
  "what's included in the box": "in_the_box", "ean": "ean", "sku": "sku", "weight": "weight",
};

/** "iPhone 17e/16e" dækker både "iphone 17e" og "iphone 16e". */
function labelVariants(label: string): string[] {
  const key = normaliseModel(label);
  if (!key.includes("/")) return [key];
  const [first, ...rest] = key.split("/").map((s) => s.trim());
  const prefix = first.split(" ").slice(0, -1).join(" ");
  return [first, ...rest.map((r) => (r.includes(" ") ? r : `${prefix} ${r}`.trim()))];
}

const deviceByLabel = new Map<string, string>();
for (const d of TILBEHOER_DEVICES) for (const v of labelVariants(d.label)) if (!deviceByLabel.has(v)) deviceByLabel.set(v, d.slug);

function normaliseModel(label: string): string {
  return label
    .toLowerCase()
    .replace(/^apple\s+/, "")
    .replace(/^samsung\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "iPhone 18 Pro, iPhone 17 Pro" / "Apple iPhone 17 Pro" → kendte slugs. */
export function matchModels(labels: string[]): { slugs: string[]; unknown: string[] } {
  const slugs: string[] = [];
  const unknown: string[] = [];
  for (const raw of labels) {
    const key = normaliseModel(raw);
    if (!key) continue;
    const slug = deviceByLabel.get(key);
    if (slug) { if (!slugs.includes(slug)) slugs.push(slug); }
    else unknown.push(raw.trim());
  }
  return { slugs, unknown };
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Billed-URL'er fra udklipsholderens HTML — kun rigtige produktbilleder, ikke ikoner/logoer. */
export function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+(?:src|data-src|data-zoom-image)=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = decodeEntities(m[1]).trim();
    if (!/^https?:\/\//i.test(url)) continue;
    if (/\.svg(\?|$)/i.test(url)) continue;
    if (/(logo|icon|flag|payment|badge|sprite|placeholder|loader|pixel|banner|youtube|avatar)/i.test(url)) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue;
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function splitList(value: string): string[] {
  return value.split(/[,;\n]| and /i).map((s) => s.trim()).filter(Boolean);
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function guessAttributes(title: string, specs: Record<string, string>): SupplierProduct["guess"] {
  const t = title.toLowerCase();
  const type = (specs.product_type ?? specs.product_group ?? "").toLowerCase();
  const attributes: Record<string, string> = {};
  let subcategory = "other";
  if (/case|cover|wallet|bumper|folio/.test(t) || /case/.test(type)) {
    subcategory = "cover";
    if (/wallet|book|folio|pung/.test(t)) attributes.case_type = "Wallet";
    else if (/clear|transparent/.test(t)) attributes.case_type = "Clear";
    else if (/rugged|armor|armour|shock|tough/.test(t)) attributes.case_type = "Rugged";
    else if (/flip/.test(t)) attributes.case_type = "Flip";
    else if (/bumper/.test(t)) attributes.case_type = "Bumper";
    else if (/slim|thin/.test(t)) attributes.case_type = "Slim";
  } else if (/screen protector|tempered|glass|beskyttelsesglas|hærdet/.test(t) || /protector/.test(type)) {
    subcategory = "screen_protector";
    attributes.protector_type = /privacy/.test(t) ? "Privacy" : /film|hydrogel/.test(t) ? "Film" : /edge|full/.test(t) ? "Edge to Edge" : "Hærdet glas";
  } else if (/cable|kabel/.test(t)) {
    subcategory = "cable";
    if (/usb-?c.*lightning/.test(t)) attributes.connector_type = "USB-C til Lightning";
    else if (/usb-?c.*usb-?c/.test(t)) attributes.connector_type = "USB-C til USB-C";
    else if (/lightning/.test(t)) attributes.connector_type = "Lightning";
    else if (/usb-?c/.test(t)) attributes.connector_type = "USB-C";
    const len = t.match(/(\d(?:[.,]\d)?)\s?m\b/);
    if (len) attributes.length = `${len[1].replace(",", ".")}m`;
  } else if (/charger|oplader|adapter|magsafe charger|wireless charg/.test(t)) {
    subcategory = "charger";
    attributes.charger_type = /car/.test(t) ? "Biloplader" : /wireless|magsafe/.test(t) ? (/magsafe/.test(t) ? "MagSafe" : "Trådløs") : "Vægoplader";
    const w = t.match(/(\d{2,3})\s?w\b/);
    if (w) attributes.watt = w[1];
  } else if (/power ?bank/.test(t)) {
    subcategory = "powerbank";
    const mah = t.match(/(\d{4,6})\s?mah/);
    if (mah) attributes.capacity = mah[1];
  } else if (/earbud|headphone|speaker|høretelefon|airpods|earphone/.test(t)) {
    subcategory = "audio";
  }
  return { subcategory, attributes };
}

/**
 * Hovedfunktionen. `text` er udklipsholderens rene tekst (påkrævet), `html`
 * er valgfri og bruges kun til billed-URL'er.
 */
export function parseSupplierPaste(text: string, html?: string): SupplierProduct {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.replace(/ /g, " ").trim());
  const specs: Record<string, string> = {};

  // 1. Label/værdi-par. EMC kopierer som "Label\tVærdi" eller "Label\nVærdi".
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const tab = line.split("\t").map((s) => s.trim()).filter(Boolean);
    let label: string | null = null;
    let value: string | null = null;
    if (tab.length >= 2 && KNOWN_LABELS.includes(tab[0].toLowerCase())) {
      label = tab[0].toLowerCase();
      value = tab.slice(1).join(" ");
    } else if (KNOWN_LABELS.includes(line.toLowerCase()) && lines[i + 1] && !KNOWN_LABELS.includes(lines[i + 1].toLowerCase())) {
      label = line.toLowerCase();
      value = lines[i + 1];
      i++;
    }
    if (label && value) {
      const key = SPEC_LABEL_KEYS[label];
      if (key && !specs[key]) specs[key] = value.replace(/^[•\-\s]+/, "").trim();
    }
  }

  // 2. Titel: første linje der ligner et produktnavn (indeholder mærke/For/Apple/iPhone) og ikke er navigation.
  const titleLine =
    lines.find((l) => l.length > 15 && l.length < 160 && /\b(for|til|iphone|galaxy|ipad|pixel|samsung|apple)\b/i.test(l) && !/[\t]/.test(l) && !/^(home|accessories|cases|search|account|cart)/i.test(l)) ?? "";
  const title = titleLine.replace(/\s+/g, " ").trim();

  // 3. Benefits: linjerne efter "Benefits" indtil næste overskrift.
  const benefits: string[] = [];
  const bIdx = lines.findIndex((l) => /^benefits$/i.test(l));
  if (bIdx >= 0) {
    for (let i = bIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l) { if (benefits.length) break; else continue; }
      if (/^(compatible with|technical specifications|specifications|product information)$/i.test(l)) break;
      benefits.push(l.replace(/^[•\-\*\s]+/, "").trim());
      if (benefits.length >= 8) break;
    }
  }

  // 4. Beskrivelse: afsnit mellem "Product Information"/titel og "Benefits"/"Compatible with".
  const description: string[] = [];
  const pIdx = lines.findIndex((l) => /^product information$/i.test(l));
  const start = pIdx >= 0 ? pIdx + 1 : -1;
  if (start > 0) {
    for (let i = start; i < lines.length; i++) {
      const l = lines[i];
      if (/^(benefits|compatible with|technical specifications)$/i.test(l)) break;
      if (l && l !== title && l.length > 40 && !/\t/.test(l)) description.push(l);
      if (description.join(" ").length > 1500) break;
    }
  }

  const modelLabels = splitList(specs.models ?? specs.compatible_with ?? "");
  const { slugs, unknown } = matchModels(modelLabels);
  const priceLine = lines.find((l) => /^€\s?\d/.test(l) || /^\d+[.,]\d{2}\s?€$/.test(l));

  return {
    title,
    articleNumber: specs.article_number ?? null,
    brand: specs.brand ?? null,
    modelLabels,
    modelSlugs: slugs,
    unknownModels: unknown,
    modelCodes: splitList(specs.model_codes ?? ""),
    specs,
    benefits,
    description: description.join("\n\n"),
    imageUrls: html ? extractImageUrls(html) : [],
    priceEur: parsePrice(priceLine),
    advisedPriceEur: parsePrice(specs.advised_price),
    guess: guessAttributes(title, specs),
  };
}

/** Kort, dansk arbejdstitel ud fra leverandørens: fjerner "For Apple …"-halen og mærke-dubletter. */
export function suggestTitle(p: SupplierProduct): string {
  let t = p.title.replace(/\s+(for|til)\s+(apple|samsung|google)?\s*(iphone|galaxy|ipad|pixel).*$/i, "").trim();
  if (p.modelSlugs.length > 1 || p.modelSlugs.length === 1) t = `${t} {model}`;
  return t.replace(/\s+/g, " ").trim();
}
