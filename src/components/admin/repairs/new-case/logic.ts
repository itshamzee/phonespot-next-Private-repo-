/**
 * Ren logik for "Ny sag": lagertekster, linjer, totaler, modelsøgning,
 * standardværdier og opbygning af request. Ingen React, ingen I/O.
 */
import type { ChecklistItem } from "@/lib/supabase/types";
import {
  REPAIR_QUALITY_LABELS,
  type CaseStore,
  type CatalogModel,
  type CatalogParentBrand,
  type CreateRepairCaseRequest,
  type CustomerSearchResult,
  type NewCaseItemInput,
  type RepairServiceCategory,
  type RepairServiceOption,
  type StockInfo,
} from "@/lib/repairs/new-case-types";

export type LocationSlug = CaseStore;
export type CatalogParent = CatalogParentBrand;
export type ServiceCategory = RepairServiceCategory;
export type CatalogService = RepairServiceOption;

export const LOCATION_LABELS: Record<LocationSlug, string> = { vejle: "Vejle", slagelse: "Slagelse" };

export function locationLabel(slug: string): string {
  return slug === "vejle" || slug === "slagelse" ? LOCATION_LABELS[slug] : slug;
}

export function otherLocation(slug: LocationSlug): LocationSlug {
  return slug === "vejle" ? "slagelse" : "vejle";
}

// ---------------------------------------------------------------------------
// Lager
// ---------------------------------------------------------------------------

export type StockState = "in_stock" | "movable" | "backorder" | "untracked" | "none";

export type StockText = { state: StockState; text: string; tone: "ok" | "warn" | "muted" };

/** Lagertekst på en kvalitetskort. `part` er null når reparationen ikke bruger en del. */
export function stockInfo(part: Pick<StockInfo, "tracked" | "available" | "other_locations" | "in_transit"> | null | undefined, location: LocationSlug): StockText {
  if (!part) return { state: "none", text: "Ingen del", tone: "muted" };
  if (!part.tracked) return { state: "untracked", text: "Ikke optalt", tone: "muted" };
  const here = locationLabel(location);
  const available = part.available ?? 0;
  if (available > 0) return { state: "in_stock", text: `${available} på lager i ${here}`, tone: "ok" };
  const others = part.other_locations.filter((o) => o.available > 0);
  if (others.length > 0) {
    const where = others.map((o) => `${o.available} i ${locationLabel(o.slug)}`).join(" · ");
    return { state: "movable", text: `0 i ${here} · ${where} — kan flyttes`, tone: "warn" };
  }
  const transit = part.in_transit && part.in_transit > 0 ? ` (${part.in_transit} på vej)` : "";
  return { state: "backorder", text: `0 på lager · bestil${transit}`, tone: "warn" };
}

/** Skal sagen have depositum/bestilling pga. denne linje? */
export function needsDeposit(state: StockState): boolean {
  return state === "movable" || state === "backorder";
}

/** Den billigste kvalitet der kan leveres med det samme (på lager eller ikke optalt). */
export function defaultService(category: ServiceCategory, location: LocationSlug): CatalogService | null {
  const recommended = category.services.find((s) => s.id === category.recommended_service_id);
  if (recommended) return recommended;
  const sorted = [...category.services].sort((a, b) => a.price_dkk - b.price_dkk);
  const ready = sorted.find((s) => {
    const st = stockInfo(s.part, location).state;
    return st === "in_stock" || st === "untracked" || st === "none";
  });
  return ready ?? sorted[0] ?? null;
}

// ---------------------------------------------------------------------------
// Linjer og totaler
// ---------------------------------------------------------------------------

export type FreeTask = { id: string; description: string; price_dkk: number };

export type AddonLine = {
  key: string;
  kind: "product" | "device";
  sku_product_id?: string;
  device_id?: string;
  title: string;
  price_oere: number;
  qty: number;
  /** Lagertekst (valgfri) */
  note?: string | null;
};

export type PanelLine = {
  key: string;
  label: string;
  note: string | null;
  noteTone: "warn" | "muted";
  amount_oere: number;
  kind: "repair" | "free" | "addon";
  state: StockState | null;
};

export function repairLines(
  categories: ServiceCategory[],
  selected: Record<string, string>,
  location: LocationSlug,
): PanelLine[] {
  const lines: PanelLine[] = [];
  for (const cat of categories) {
    const id = selected[cat.name];
    const svc = id ? cat.services.find((s) => s.id === id) : undefined;
    if (!svc) continue;
    const info = stockInfo(svc.part, location);
    const tier = svc.quality_tier ? REPAIR_QUALITY_LABELS[svc.quality_tier] : null;
    const label = tier ? `${svc.name} (${tier})` : svc.name;
    let note: string | null = null;
    if (info.state === "movable") note = "Del flyttes fra anden butik";
    else if (info.state === "backorder") note = "Del skal bestilles";
    lines.push({
      key: `svc:${svc.id}`,
      label,
      note,
      noteTone: "warn",
      amount_oere: Math.round(svc.price_dkk * 100),
      kind: "repair",
      state: info.state,
    });
  }
  return lines;
}

export function buildPanelLines(args: {
  categories: ServiceCategory[];
  selected: Record<string, string>;
  free: FreeTask[];
  addons: AddonLine[];
  location: LocationSlug;
}): PanelLine[] {
  const lines = repairLines(args.categories, args.selected, args.location);
  for (const f of args.free) {
    lines.push({
      key: `free:${f.id}`,
      label: f.description,
      note: "Anden opgave",
      noteTone: "muted",
      amount_oere: Math.round(f.price_dkk * 100),
      kind: "free",
      state: null,
    });
  }
  for (const a of args.addons) {
    lines.push({
      key: `addon:${a.key}`,
      label: a.title,
      note: `Tilkøb · ${a.qty} stk.`,
      noteTone: "muted",
      amount_oere: a.price_oere * a.qty,
      kind: "addon",
      state: null,
    });
  }
  return lines;
}

export function totalOere(lines: PanelLine[]): number {
  return lines.reduce((sum, l) => sum + l.amount_oere, 0);
}

export function depositHint(lines: PanelLine[]): boolean {
  return lines.some((l) => l.state && needsDeposit(l.state));
}

export function hasBackorder(lines: PanelLine[]): boolean {
  return lines.some((l) => l.state === "backorder");
}

// ---------------------------------------------------------------------------
// Søgning på tværs af katalog ("iph 15 pro")
// ---------------------------------------------------------------------------

export type ModelHit = {
  model: CatalogModel;
  series: string;
  parentKey: string;
  brandSlug: string;
  brandName: string;
  deviceType: string;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/]/g, " ");
}

function allModels(parents: CatalogParent[]): ModelHit[] {
  const out: ModelHit[] = [];
  for (const parent of parents) {
    for (const brand of parent.brands) {
      for (const series of brand.series) {
        for (const model of series.models) {
          out.push({ model, series: series.name, parentKey: parent.key, brandSlug: brand.slug, brandName: brand.name, deviceType: brand.device_type });
        }
      }
    }
  }
  return out;
}

export function searchModels(parents: CatalogParent[], query: string, limit = 24): ModelHit[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const parentName = new Map(parents.map((p) => [p.key, p.name]));
  const hits: ModelHit[] = [];
  for (const h of allModels(parents)) {
    const hay = norm(`${parentName.get(h.parentKey) ?? ""} ${h.brandName} ${h.series} ${h.model.name}`);
    const words = hay.split(/\s+/);
    const ok = tokens.every((t) => words.some((w) => w.startsWith(t)) || (t.length > 2 && hay.includes(t)));
    if (ok) {
      hits.push(h);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

/** Ligner teksten en IMEI/serienummer fra en scanner (kun cifre, 8+)? */
export function looksLikeImei(value: string): boolean {
  return /^\d{8,17}$/.test(value.trim());
}

/** Serier for et forældermærke i den rækkefølge de optræder i kataloget. */
export function seriesFor(parent: CatalogParent): { name: string; brandSlug: string }[] {
  const seen = new Set<string>();
  const out: { name: string; brandSlug: string }[] = [];
  for (const brand of parent.brands) {
    for (const s of brand.series) {
      if (s.models.length > 0 && !seen.has(s.name)) {
        seen.add(s.name);
        out.push({ name: s.name, brandSlug: brand.slug });
      }
    }
  }
  return out;
}

export function modelsInSeries(parent: CatalogParent, series: string): ModelHit[] {
  return allModels([parent]).filter((h) => h.series === series);
}

// ---------------------------------------------------------------------------
// Standardværdier
// ---------------------------------------------------------------------------

function nextBusinessDayAt16(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(16, 0, 0, 0);
  return d;
}

/**
 * Lovet klar: nu + estimeret tid; næste hverdag kl. 16 ved bestilling, eller
 * når tiden ikke kan nås i dag (efter kl. 16, ingen estimat).
 */
export function defaultPromisedAt(now: Date, minutes: number | null, backorder: boolean): Date {
  if (backorder) return nextBusinessDayAt16(now);
  if (minutes && minutes > 0) {
    const d = new Date(now.getTime() + minutes * 60_000);
    d.setSeconds(0, 0);
    const rem = d.getMinutes() % 15;
    if (rem) d.setMinutes(d.getMinutes() + (15 - rem));
    return d;
  }
  const today16 = new Date(now);
  today16.setHours(16, 0, 0, 0);
  return now < today16 ? today16 : nextBusinessDayAt16(now);
}

/** Værdi til <input type="datetime-local">, i lokal tid. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatPromised(value: string, now: Date = new Date()): string {
  if (!value) return "ikke sat";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "ikke sat";
  const clock = `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
  const same = d.toDateString() === now.toDateString();
  if (same) return `i dag ${clock}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `i morgen ${clock}`;
  const wd = ["søn.", "man.", "tir.", "ons.", "tor.", "fre.", "lør."][d.getDay()];
  return `${wd} ${d.getDate()}.${d.getMonth() + 1}. ${clock}`;
}

export function checklistSummary(list: ChecklistItem[]): string {
  const rated = list.filter((c) => c.status !== "ikke_vurderet");
  if (rated.length === 0) return "tilstand ikke vurderet";
  const faults = list.filter((c) => c.status === "fejl").length;
  if (faults > 0) return `${faults} fejl noteret`;
  if (rated.length === list.length) return "tilstand: alt som normalt";
  return `${rated.length} af ${list.length} punkter vurderet`;
}

// ---------------------------------------------------------------------------
// Kunde
// ---------------------------------------------------------------------------

export type CustomerDraft = {
  name: string;
  phone: string;
  email: string;
  company_name: string;
  cvr: string;
  ean: string;
  invoice_email: string;
  contact_person: string;
};

export const EMPTY_CUSTOMER: CustomerDraft = {
  name: "",
  phone: "",
  email: "",
  company_name: "",
  cvr: "",
  ean: "",
  invoice_email: "",
  contact_person: "",
};

/** Søgeresultat; `ticket_count` er valgfrit og vises hvis backend leverer det. */
export type ExistingCustomer = CustomerSearchResult & { ticket_count?: number | null };

export function customerValid(c: CustomerDraft): boolean {
  return c.name.trim().length > 1 && c.phone.replace(/\D/g, "").length >= 8;
}

export function formatPhoneDk(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const local = d.length === 10 && d.startsWith("45") ? d.slice(2) : d;
  if (local.length === 8) return local.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return raw;
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export type BuildArgs = {
  customerType: "privat" | "erhverv";
  existing: ExistingCustomer | null;
  draft: CustomerDraft;
  /** Kun med når ejeren selv har valgt butik. */
  storeId: LocationSlug | null;
  model: { id: string; name: string; brandName: string } | null;
  device: { serial: string; color: string; passcode: string; customerDeviceId?: string | null };
  categories: ServiceCategory[];
  selected: Record<string, string>;
  free: FreeTask[];
  addons: AddonLine[];
  checklist: ChecklistItem[];
  photos: string[];
  notes: string;
  promisedAt: string;
  assignedTo: string;
  sendSms: boolean;
};

export function buildRequest(a: BuildArgs): CreateRepairCaseRequest {
  const items: NewCaseItemInput[] = [];
  for (const cat of a.categories) {
    const id = a.selected[cat.name];
    if (id) items.push({ kind: "repair", repair_service_id: id });
  }
  for (const f of a.free) {
    items.push({ kind: "free_text", description: f.description, qty: 1, unit_price_oere: Math.round(f.price_dkk * 100) });
  }
  for (const ad of a.addons) {
    if (ad.kind === "device" && ad.device_id) items.push({ kind: "device", device_id: ad.device_id });
    else if (ad.sku_product_id) items.push({ kind: "product", sku_product_id: ad.sku_product_id, qty: ad.qty });
  }
  const src = a.existing;
  const d = a.draft;
  const clean = (v: string) => (v.trim() ? v.trim() : null);
  const erhverv = a.customerType === "erhverv";
  const code = a.device.passcode.trim();
  // Koden sendes som device.passcode (eget felt på sagen, aldrig i noter) og tjeklisten
  // markerer, at adgangskoden er modtaget.
  const checklist = a.checklist.map((c) =>
    code && /adgangskode/i.test(c.label) && c.status === "ikke_vurderet" ? { ...c, status: "ok" as const } : c,
  );
  const notes = [a.notes.trim(), code ? `Adgangskode: ${code}` : ""].filter(Boolean).join("\n");
  return {
    customer: {
      id: src?.id ?? null,
      type: a.customerType,
      name: src ? src.name : d.name.trim(),
      phone: src ? src.phone : d.phone.trim(),
      email: src ? src.email : clean(d.email),
      company_name: erhverv ? (src ? src.company_name : clean(d.company_name)) : null,
      cvr: erhverv ? (src ? src.cvr : clean(d.cvr)) : null,
      ean: erhverv ? (src ? (src.ean ?? null) : clean(d.ean)) : null,
      invoice_email: erhverv ? (src ? (src.invoice_email ?? null) : clean(d.invoice_email)) : null,
      contact_person: erhverv ? (src ? (src.contact_person ?? null) : clean(d.contact_person)) : null,
    },
    device: {
      repair_model_id: a.model?.id ?? null,
      brand: a.model?.brandName ?? null,
      model: a.model?.name ?? null,
      serial_number: clean(a.device.serial),
      color: clean(a.device.color),
      customer_device_id: a.device.customerDeviceId ?? null,
      passcode: code || null,
    },
    items,
    details: {
      promised_at: a.promisedAt ? new Date(a.promisedAt).toISOString() : null,
      assigned_to: clean(a.assignedTo),
      internal_notes: notes || null,
      checklist: checklist.map((c) => ({ label: c.label, status: c.status, note: c.note || null })),
      intake_photos: a.photos,
    },
    store_id: a.storeId,
    notify_sms: a.sendSms,
  };
}
