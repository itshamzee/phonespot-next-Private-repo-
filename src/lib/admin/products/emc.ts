/**
 * Import fra Euro Mobile Company (euromobilecompany.com), leverandøren af
 * Rixus/NovaNL-tilbehør. Deres produktsider er offentlige og har alt det,
 * personalet ellers taster ind: titel, varenummer, vejledende pris, mærke,
 * modeller, specifikationer og billeder. Kun indkøbsprisen kræver login.
 *
 * Rene funktioner uden netværk, så de kan testes mod en gemt side.
 * Hentningen sker i /api/admin/products/supplier-import.
 */
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { decodeEntities, guessAttributes, matchModels, SPEC_LABEL_KEYS, type SupplierProduct } from "./supplier-paste";

export interface EmcProduct extends SupplierProduct {
  sourceUrl: string;
}

const HOSTS = new Set(["euromobilecompany.com", "www.euromobilecompany.com"]);

export function isEmcUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/** Produktsider ender på "-<id>"; kategorisider gør ikke. */
export function isEmcProductUrl(value: string): boolean {
  return isEmcUrl(value) && /-\d{4,7}$/.test(new URL(value).pathname);
}

function text(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function parseEmcProduct(html: string, sourceUrl: string): EmcProduct {
  const specs: Record<string, string> = {};
  const put = (label: string, value: string) => {
    const key = SPEC_LABEL_KEYS[label.trim().toLowerCase()];
    if (key && value && !specs[key]) specs[key] = value;
  };

  // "Article number", "Advised price", "Manufacturer" over købsknappen
  for (const m of html.matchAll(/<b>([^<]+)<\/b><\/div>\s*<div>([\s\S]*?)<\/div>/g)) put(m[1], text(m[2]));
  // "Compatible with" og "Technical specifications"
  for (const m of html.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)) put(m[1], text(m[2]));

  let ld: Record<string, unknown> = {};
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      if (data?.["@type"] === "Product") ld = data;
    } catch {
      // ugyldig JSON-LD: resten af siden rækker
    }
  }

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = (h1 ? text(h1[1]) : String(ld.name ?? "")).trim();

  const benefitsBlock = html.match(/<h3>\s*Benefits\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/i);
  const benefits = benefitsBlock ? [...benefitsBlock[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])).filter(Boolean).slice(0, 8) : [];

  // Beskrivelsen står som afsnit lige før "Benefits"
  const bIdx = benefitsBlock ? html.indexOf(benefitsBlock[0]) : -1;
  const before = bIdx > 0 ? html.slice(Math.max(0, bIdx - 4000), bIdx) : "";
  const paragraphs = [...before.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter((p) => p.length > 60);
  const description = paragraphs.length ? paragraphs.join("\n\n") : String(ld.description ?? "");

  // Billeder: siden viser også andre produkter, så vi holder os til dette produkts
  // medie-id og tager den største udgave af hvert billede. Filnavne er
  // "<hash>-<medie-id>-<navn>", hvor id'et kan være tal eller fx "a00002633".
  const ldImage = String(ld.image ?? "");
  const mediaId = ldImage.split("/").pop()?.match(/^[0-9a-f]+-([0-9a-z]+)-/i)?.[1];
  const folder = ldImage.slice(0, ldImage.lastIndexOf("/") + 1);
  const best = new Map<string, { url: string; size: number }>();
  for (const m of html.matchAll(/https:\/\/(?:www\.)?euromobilecompany\.com\/image\/cache\/[^"'\s)]+?-(\d+)x(\d+)\.(?:jpe?g|png|webp)/gi)) {
    const url = decodeEntities(m[0]);
    if (mediaId ? !(url.startsWith(folder) && url.includes(`-${mediaId}-`)) : !url.includes("/catalog/akeneo/")) continue;
    const key = url.replace(/-\d+x\d+\.(jpe?g|png|webp)$/i, "");
    const size = Number(m[1]) * Number(m[2]);
    const current = best.get(key);
    if (!current || size > current.size) best.set(key, { url, size });
  }
  const imageUrls = [...best.values()].map((v) => v.url).slice(0, 8);

  const modelLabels = (specs.models ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const { slugs, unknown } = matchModels(modelLabels);
  const price = (value: string | undefined) => {
    const m = value?.replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
    return m ? Number(m[1].replace(",", ".")) : null;
  };

  return {
    title,
    articleNumber: specs.article_number ?? (typeof ld.model === "string" ? ld.model : null),
    brand: specs.brand ?? (ld.brand as { name?: string } | undefined)?.name ?? null,
    modelLabels,
    modelSlugs: slugs,
    unknownModels: unknown,
    modelCodes: (specs.model_codes ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean),
    specs,
    benefits,
    description,
    imageUrls,
    priceEur: null,
    advisedPriceEur: price(specs.advised_price),
    guess: guessAttributes(title, specs),
    sourceUrl,
  };
}

export function parseEmcListing(html: string): { productUrls: string[]; total: number; pages: number } {
  const count = html.match(/Showing\s+\d+\s+to\s+\d+\s+of\s+(\d+)\s+\((\d+)\s+Pages?\)/i);
  const urls: string[] = [];
  for (const m of html.matchAll(/href="(https:\/\/(?:www\.)?euromobilecompany\.com\/[^"?#]+-\d{4,7})(?:[?#][^"]*)?"/g)) {
    if (!urls.includes(m[1])) urls.push(m[1]);
  }
  return { productUrls: urls, total: count ? Number(count[1]) : urls.length, pages: count ? Number(count[2]) : 1 };
}

/** Samme liste, side n. Filtre (mærke/serie/model) bevares. */
export function listingPageUrl(listingUrl: string, page: number): string {
  const u = new URL(listingUrl);
  if (page > 1) u.searchParams.set("page", String(page));
  else u.searchParams.delete("page");
  return u.toString();
}

/** Vejledende europris → dansk udsalgspris: under 100 kr. rundes op til x9, ellers til 49/99. */
export function suggestedPriceOere(advisedEur: number | null): number | null {
  if (advisedEur == null || !Number.isFinite(advisedEur) || advisedEur <= 0) return null;
  const kr = advisedEur * 7.46;
  const rounded = kr < 100 ? Math.ceil((kr + 1) / 10) * 10 - 1 : Math.ceil((kr + 1) / 50) * 50 - 1;
  return rounded * 100;
}

// ---------------------------------------------------------------------------
// Dansk tekst af fakta fra siden — uden sprogmodel, så importen altid virker.
// Personalet kan stadig trykke "Skriv dansk tekst" på produktet bagefter.
// ---------------------------------------------------------------------------

const COLORS: Record<string, string> = {
  black: "sort", white: "hvid", red: "rød", blue: "blå", green: "grøn", purple: "lilla", pink: "pink", grey: "grå", gray: "grå",
  transparent: "gennemsigtig", clear: "gennemsigtig", gold: "guld", silver: "sølv", orange: "orange", brown: "brun", yellow: "gul",
  beige: "beige", titanium: "titanium", navy: "navy",
};

const MATERIALS: Record<string, string> = {
  plastic: "plast", tpu: "TPU", silicone: "silikone", leather: "læder", "pu leather": "PU-læder", "artificial leather": "kunstlæder",
  polycarbonate: "polycarbonat", pc: "polycarbonat", "tempered glass": "hærdet glas", glass: "glas", aluminum: "aluminium",
  aluminium: "aluminium", nylon: "nylon", metal: "metal", fabric: "stof",
};

const NOUNS: Record<string, string> = { cover: "cover", screen_protector: "beskyttelsesglas", cable: "kabel", charger: "oplader", powerbank: "powerbank", audio: "", other: "" };

const labelBySlug = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d.label]));

function translateList(value: string | undefined, map: Record<string, string>): string | null {
  if (!value) return null;
  const parts = value.split(/[,/&]| and /i).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const out = parts.map((p) => map[p] ?? p);
  return out.length ? out.join(" og ") : null;
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "iPhone 17 Pro og 18 Pro": stigende orden, og familienavnet kun på den første. */
export function modelsText(p: Pick<SupplierProduct, "modelSlugs" | "modelLabels">): string {
  const labels = p.modelSlugs.length
    ? p.modelSlugs.flatMap((slug) => (labelBySlug.get(slug) ?? slug).split("/").map((part, i, all) => (i === 0 ? part : `${all[0].split(" ").slice(0, -1).join(" ")} ${part}`)))
    : p.modelLabels;
  const sorted = [...new Set(labels)].sort((a, b) => a.localeCompare(b, "da", { numeric: true }));
  if (sorted.length === 0) return "";
  const family = sorted[0].split(" ")[0];
  const short = sorted.map((l, i) => (i > 0 && l.startsWith(`${family} `) ? l.slice(family.length + 1) : l));
  return short.length === 1 ? short[0] : `${short.slice(0, -1).join(", ")} og ${short[short.length - 1]}`;
}

export interface DanishCopy {
  title: string;
  shortDescription: string;
  highlights: string[];
  description: string;
  /** Frie attributter til specifikationstabellen (materiale, farve, MagSafe). */
  attributes: Record<string, string>;
}

export function danishCopy(p: SupplierProduct): DanishCopy {
  const sub = p.guess.subcategory;
  const noun = NOUNS[sub] ?? "";
  const models = modelsText(p);
  const color = translateList(p.specs.color, COLORS);
  const material = translateList(p.specs.material, MATERIALS);
  const magsafe = /^yes$/i.test(p.specs.magsafe ?? "") || /magsafe/i.test(p.title);
  const antiBurst = /^yes$/i.test(p.specs.anti_burst ?? "");

  // "Rixus SnapGrip 360 Case For Apple iPhone …" → "Rixus SnapGrip 360"
  const line = p.title
    .replace(/\s+(with\s+magsafe(\s+compatible)?\s+)?(for|til)\s+(apple|samsung|google|huawei|oneplus|xiaomi|universal)\b.*$/i, "")
    .replace(/\s+with\s+magsafe(\s+compatible)?$/i, "")
    .replace(/\b(phone\s+)?(case|cover)s?\b/gi, "")
    // "Tempered Glass"/"Screen Protector" siges på dansk af navneordet ("beskyttelsesglas")
    .replace(/\b(tempered\s+glass|screen\s+protector|protective\s+glass|glass)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const title = [
    `${line}${noun ? ` ${noun}` : ""}`,
    magsafe && sub === "cover" ? "med MagSafe" : "",
    models ? `til ${models}` : "",
  ].filter(Boolean).join(" ") + (color ? `, ${color}` : "");

  const highlights: string[] = [];
  if (sub === "cover") {
    if (magsafe) highlights.push("Virker med MagSafe: Magnetiske opladere og holdere sidder fast gennem coveret.");
    if (antiBurst) highlights.push("Forstærkede hjørner: Hjørnerne tager imod stødet, når telefonen bliver tabt.");
    if (p.guess.attributes.case_type === "Wallet") highlights.push("Plads til kort: Kortlommer på indersiden, så pungen kan blive hjemme.");
    if (p.guess.attributes.case_type === "Clear") highlights.push("Gennemsigtigt: Telefonens egen farve kan stadig ses.");
    if (material && /tpu|silikone/i.test(material)) highlights.push(`Blødt materiale: ${capital(material)} er nemt at tage af og på og ligger godt i hånden.`);
    else if (material) highlights.push(`Holdbar skal: ${capital(material)} beskytter mod ridser og slid i hverdagen.`);
    if (models) highlights.push(`Passer præcist: Lavet til ${models}, med udskæringer til knapper, kamera og ladestik.`);
  }

  const shortDescription = [
    sub === "cover" ? "Cover" : capital(noun || "Tilbehør"),
    material ? `i ${material}` : "",
    magsafe && sub === "cover" ? "med MagSafe" : "",
    models ? `til ${models}` : "",
  ].filter(Boolean).join(" ") + ".";

  const seeThrough = color === "gennemsigtig";
  const what = noun === "cover" ? `et ${seeThrough ? "gennemsigtigt " : ""}cover` : noun ? `et ${noun}` : "tilbehør";
  const sentences = [
    `${line} er ${what}${material ? ` i ${material}` : ""}${models ? ` til ${models}` : ""}${color && !seeThrough ? ` i farven ${color}` : ""}.`,
    magsafe && sub === "cover" ? "Det virker med MagSafe, så magnetiske opladere, kortholdere og bilholdere sidder fast uden på coveret." : "",
    antiBurst ? "Hjørnerne er forstærkede og tager imod stødet, hvis telefonen bliver tabt." : "",
  ].filter(Boolean);
  const second = sub === "cover" ? "Udskæringerne til knapper, kamera og ladestik sidder præcist, så du kan bruge og lade telefonen uden at tage coveret af." : "";
  const description = [sentences.join(" "), second, models ? `Passer til ${models}.` : ""].filter(Boolean).join("\n\n");

  const attributes: Record<string, string> = {};
  if (material) attributes.material = capital(material);
  if (color) attributes.color = capital(color);
  if (magsafe) attributes.magsafe = "Ja";

  return { title, shortDescription, highlights: highlights.slice(0, 5), description, attributes };
}
