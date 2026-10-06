/**
 * Enhederne i "Ny sag". En indlevering kan have flere enheder (maks. NEW_CASE_LIMITS.devices);
 * hver enhed har sin egen model, sine reparationer, tilkøb og detaljer og bliver til sin egen sag.
 * Ren logik uden React: tilstand pr. enhed, afledte linjer/totaler og opbygning af request.
 */
import { INITIAL_CHECKLIST } from "@/lib/repairs/intake-checklist";
import type {
  CreateRepairCaseGroupRequest,
  CreateRepairCaseRequest,
  RepairServicesResponse,
} from "@/lib/repairs/new-case-types";
import { NEW_CASE_LIMITS } from "@/lib/repairs/new-case-types";
import type { ChecklistItem } from "@/lib/supabase/types";
import type { DeviceFields, SelectedModel } from "./device-section";
import {
  buildPanelLines,
  buildRequest,
  defaultPromisedAt,
  depositHint,
  hasBackorder,
  toLocalInput,
  totalOere,
  type AddonLine,
  type BuildArgs,
  type FreeTask,
  type LocationSlug,
  type PanelLine,
  type ServiceCategory,
} from "./logic";

export const MAX_DEVICES = NEW_CASE_LIMITS.devices;

export type DeviceSectionId = "device" | "repair" | "addons" | "details";
export const DEVICE_SECTIONS: DeviceSectionId[] = ["device", "repair", "addons", "details"];

export type ServicesState = { key: string; data: RepairServicesResponse | null; error: string };

/** Alt brugeren har tastet for én enhed. */
export type DeviceDraft = {
  key: string;
  model: SelectedModel | null;
  fields: DeviceFields;
  svc: ServicesState | null;
  svcTry: number;
  selected: Record<string, string>;
  viewingState: string | null;
  free: FreeTask[];
  addons: AddonLine[];
  issue: string;
  checklist: ChecklistItem[];
  promisedOverride: string | null;
  assignedOverride: string | null;
  notes: string;
  photos: string[];
};

export function newDraft(key: string): DeviceDraft {
  return {
    key,
    model: null,
    fields: { serial: "", color: "", passcode: "" },
    svc: null,
    svcTry: 0,
    selected: {},
    viewingState: null,
    free: [],
    addons: [],
    issue: "",
    checklist: INITIAL_CHECKLIST,
    promisedOverride: null,
    assignedOverride: null,
    notes: "",
    photos: [],
  };
}

/** Det der afledes af en enheds tilstand: linjer, totaler og standardværdier. */
export type DeviceView = {
  categories: ServiceCategory[];
  svcUsable: ServicesState | null;
  svcLoading: boolean;
  viewing: string | null;
  lines: PanelLine[];
  total_oere: number;
  needsDeposit: boolean;
  backorder: boolean;
  hasRepair: boolean;
  promisedAt: string;
  assignedTo: string;
};

export function deriveDevice(d: DeviceDraft, location: LocationSlug | null, displayLocation: LocationSlug, now: Date, meName: string): DeviceView {
  const svcKey = d.model ? `${d.model.id}|${location ?? ""}` : null;
  const svcUsable = d.svc && d.model && d.svc.key.startsWith(`${d.model.id}|`) ? d.svc : null;
  const svcLoading = svcKey !== null && d.svc?.key !== svcKey;
  const categories = svcUsable?.data?.categories ?? [];
  const lines = buildPanelLines({ categories, selected: d.selected, free: d.free, addons: d.addons, location: displayLocation });
  const backorder = hasBackorder(lines);

  let maxMinutes: number | null = null;
  for (const c of categories) {
    const s = c.services.find((x) => x.id === d.selected[c.name]);
    if (s?.estimated_minutes) maxMinutes = Math.max(maxMinutes ?? 0, s.estimated_minutes);
  }

  return {
    categories,
    svcUsable,
    svcLoading,
    viewing: d.viewingState ?? categories[0]?.name ?? null,
    lines,
    total_oere: totalOere(lines),
    needsDeposit: depositHint(lines),
    backorder,
    hasRepair: lines.some((l) => l.kind !== "addon"),
    promisedAt: d.promisedOverride ?? toLocalInput(defaultPromisedAt(now, maxMinutes, backorder)),
    assignedTo: d.assignedOverride ?? meName,
  };
}

/** Samlet beløb for alle enheder. */
export function grandTotalOere(views: Pick<DeviceView, "total_oere">[]): number {
  return views.reduce((sum, v) => sum + v.total_oere, 0);
}

type Shared = Pick<BuildArgs, "customerType" | "existing" | "draft" | "storeId" | "sendSms">;

function perDevice(d: DeviceDraft, v: DeviceView): Omit<BuildArgs, keyof Shared> {
  return {
    model: d.model ? { id: d.model.id, name: d.model.name, brandName: d.model.brandName } : null,
    device: { serial: d.fields.serial, color: d.fields.color, passcode: d.fields.passcode },
    categories: v.categories,
    selected: d.selected,
    free: d.free,
    addons: d.addons,
    checklist: d.checklist,
    photos: d.photos,
    notes: d.notes,
    promisedAt: v.promisedAt,
    assignedTo: v.assignedTo,
  };
}

/** Én enhed: præcis den hidtidige request (uændret form). */
export function buildSingleRequest(shared: Shared, d: DeviceDraft, v: DeviceView): CreateRepairCaseRequest {
  return buildRequest({ ...shared, ...perDevice(d, v) });
}

/** Flere enheder: samme kunde, én post pr. enhed. */
export function buildGroupRequest(shared: Shared, devices: { draft: DeviceDraft; view: DeviceView }[]): CreateRepairCaseGroupRequest {
  const built = devices.map(({ draft, view }) => buildRequest({ ...shared, ...perDevice(draft, view) }));
  return {
    customer: built[0].customer,
    devices: built.map((b) => ({ device: b.device, items: b.items, details: b.details })),
    store_id: shared.storeId,
    notify_sms: shared.sendSms,
  };
}

/** Kort tekst til en foldet enhed. */
export function deviceSummaryText(d: DeviceDraft): string | null {
  return d.model ? `${d.model.name} · ${d.fields.serial.trim() ? d.fields.serial.trim() : "IMEI mangler"}` : null;
}

export function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Fjern en linje fra en enheds tilstand (reparation, anden opgave eller tilkøb). */
export function removeLineFrom(d: DeviceDraft, categories: ServiceCategory[], line: PanelLine): Partial<DeviceDraft> {
  if (line.kind === "repair") {
    const cat = categories.find((c) => c.services.some((s) => `svc:${s.id}` === line.key));
    if (!cat) return {};
    const next = { ...d.selected };
    delete next[cat.name];
    return { selected: next };
  }
  if (line.kind === "free") return { free: d.free.filter((x) => `free:${x.id}` !== line.key) };
  return { addons: d.addons.filter((x) => `addon:${x.key}` !== line.key) };
}

/** Sektionen foran den givne (til Esc). Første sektion på første enhed er kunden. */
export function previousSection(
  keys: string[],
  at: { key: string; section: DeviceSectionId },
): { key: string; section: DeviceSectionId } | "customer" {
  const i = DEVICE_SECTIONS.indexOf(at.section);
  if (i > 0) return { key: at.key, section: DEVICE_SECTIONS[i - 1] };
  const k = keys.indexOf(at.key);
  if (k > 0) return { key: keys[k - 1], section: "details" };
  return "customer";
}
