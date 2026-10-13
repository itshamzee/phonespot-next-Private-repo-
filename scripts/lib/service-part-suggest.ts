import Papa from "papaparse";

export type ServiceIn = {
  id: string; name: string; quality_tier: "standard" | "premium" | "original" | null;
  service_category: string | null; model: string; brand: string;
};
export type PartIn = { shared_sku: string; name: string; category: string | null; quality: string | null; device_models: string[] };
export type Suggestion = {
  service_id: string; brand: string; model: string; service_name: string; quality_tier: string;
  shared_sku: string; part_name: string; part_quality: string; qty: number;
  confidence: "høj" | "middel" | "lav" | "ingen"; approve: "ja" | "";
};

const KINDS: Array<{ kind: string; service: RegExp; part: RegExp }> = [
  { kind: "skaerm", service: /sk(æ|ae)rm|display|screen/i, part: /sk(æ|ae)rm|screen|display|lcd|oled/i },
  { kind: "batteri", service: /batteri|battery/i, part: /batter/i },
  { kind: "ladestik", service: /ladestik|opladning|charging|ladeport/i, part: /ladestik|charging|dock|ladeport/i },
  { kind: "bagglas", service: /bagglas|bagside|back ?glass|bagcover/i, part: /bagglas|bagside|back ?(glass|cover|housing)|bagcover|housing/i },
  { kind: "kamera", service: /kamera|camera/i, part: /kamera|camera/i },
  { kind: "hoejtaler", service: /h(ø|oe)jtaler|speaker/i, part: /h(ø|oe)jtaler|speaker/i },
];
const QUALITY: Record<NonNullable<ServiceIn["quality_tier"]>, RegExp> = {
  original: /original|service ?pack|oem|genuine/i,
  premium: /premium|soft ?oled/i,
  standard: /standard|in-?cell|aftermarket|budget/i,
};

export function normalizeModel(s: string): string {
  return s.toLowerCase().replace(/^(apple|samsung|google)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function kindOf(serviceName: string, category: string | null): string | null {
  const text = `${serviceName} ${category ?? ""}`;
  return KINDS.find((k) => k.service.test(text))?.kind ?? null;
}

/** Forslag til ejerens godkendelse (spec §4.4). Kun "høj" er forhåndsgodkendt. */
export function suggestForService(s: ServiceIn, catalog: PartIn[]): Suggestion {
  const base = { service_id: s.id, brand: s.brand, model: s.model, service_name: s.name, quality_tier: s.quality_tier ?? "", qty: 1 };
  const none: Suggestion = { ...base, shared_sku: "", part_name: "", part_quality: "", confidence: "ingen", approve: "" };
  const kind = KINDS.find((k) => k.kind === kindOf(s.name, s.service_category));
  if (!kind) return none;
  const model = normalizeModel(s.model);
  const fits = catalog.filter(
    (p) => p.device_models.some((m) => normalizeModel(m) === model) && kind.part.test(`${p.name} ${p.category ?? ""}`),
  );
  if (fits.length === 0) return none;
  const byQuality = s.quality_tier ? fits.filter((p) => QUALITY[s.quality_tier!].test(`${p.quality ?? ""} ${p.name}`)) : fits;
  const pick = (p: PartIn, confidence: Suggestion["confidence"]): Suggestion => ({
    ...base, shared_sku: p.shared_sku, part_name: p.name, part_quality: p.quality ?? "", confidence, approve: confidence === "høj" ? "ja" : "",
  });
  // Uden kvalitet på ydelsen er et enkelt match kun middel: kvaliteten er ikke afgjort.
  if (byQuality.length === 1) return pick(byQuality[0], s.quality_tier ? "høj" : "middel");
  if (byQuality.length > 1) return pick(byQuality[0], "middel");
  if (fits.length === 1) return pick(fits[0], "middel");
  return pick(fits[0], "lav");
}

export function parseApprovedLinks(csv: string): {
  links: { service_id: string; shared_sku: string; part_name: string; qty: number }[];
  errors: string[];
} {
  // Dansk Excel gemmer med semikolon og BOM; vores eget forslag skrives på samme måde.
  const text = csv.replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [";", ","],
    transformHeader: (h) => h.replace(/^﻿/, "").trim(),
  });
  const links: { service_id: string; shared_sku: string; part_name: string; qty: number }[] = [];
  const errors: string[] = [];
  parsed.data.forEach((row, i) => {
    if ((row.approve ?? "").trim().toLowerCase() !== "ja") return;
    const line = i + 2;
    const service_id = (row.service_id ?? "").trim();
    const shared_sku = (row.shared_sku ?? "").trim();
    const qty = (row.qty ?? "").trim() === "" ? 1 : Number(row.qty);
    if (!service_id || !shared_sku) { errors.push(`Linje ${line}: service_id og shared_sku skal udfyldes`); return; }
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) { errors.push(`Linje ${line}: qty skal være 1-20`); return; }
    links.push({ service_id, shared_sku, part_name: (row.part_name ?? "").trim() || shared_sku, qty });
  });
  return { links, errors };
}

export type ValidateDeps = {
  existingServiceIds: (ids: string[]) => Promise<Set<string>>;
  partExists: (sku: string) => Promise<boolean>;
};

/** Forhåndstjek før skrivning: ydelsen findes, delen findes i lagersystemet, navnet er udfyldt. */
export async function validateLinks(
  links: { service_id: string; shared_sku: string; part_name: string; qty: number }[],
  deps: ValidateDeps,
): Promise<string[]> {
  const errors: string[] = [];
  const known = await deps.existingServiceIds([...new Set(links.map((l) => l.service_id))]);
  const skuOk = new Map<string, boolean>();
  for (const l of links) {
    if (!known.has(l.service_id)) errors.push(`Ydelse ${l.service_id} findes ikke`);
    if (!l.part_name.trim()) errors.push(`Ydelse ${l.service_id}: part_name er tomt`);
    if (!skuOk.has(l.shared_sku)) skuOk.set(l.shared_sku, await deps.partExists(l.shared_sku));
    if (!skuOk.get(l.shared_sku)) errors.push(`Ydelse ${l.service_id}: delen ${l.shared_sku} findes ikke i lagersystemet`);
  }
  return errors;
}
