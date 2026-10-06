/** Klientkald for "Ny sag". Alle returnerer data eller kaster Error med en dansk besked. */
import { apiError } from "@/components/admin/repairs/ui";
import type {
  CaseStore,
  CatalogTreeResponse,
  CreateRepairCaseGroupRequest,
  CreateRepairCaseGroupResponse,
  CreateRepairCaseRequest,
  CreateRepairCaseResponse,
  CvrLookupResponse,
  RepairServicesResponse,
  UpsellDevicesResponse,
  UpsellResponse,
} from "@/lib/repairs/new-case-types";
import { IDEMPOTENCY_HEADER } from "@/lib/repairs/new-case-types";
import type { ExistingCustomer } from "./logic";

async function getJson<T>(url: string, fallback: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err;
    throw new Error(`${fallback} Forbindelsen fejlede.`);
  }
  if (!res.ok) throw new Error(await apiError(res, fallback));
  return (await res.json()) as T;
}

export const fetchTree = (signal?: AbortSignal) =>
  getJson<CatalogTreeResponse>("/api/admin/repair-catalog/tree", "Kataloget kunne ikke hentes.", signal);

export const fetchModelServices = (modelId: string, location: CaseStore | null, signal?: AbortSignal) =>
  getJson<RepairServicesResponse>(
    `/api/admin/repair-catalog/models/${encodeURIComponent(modelId)}/services${location ? `?location=${location}` : ""}`,
    "Reparationer kunne ikke hentes.",
    signal,
  );

export const fetchUpsell = (modelId: string, location: CaseStore | null, q = "", signal?: AbortSignal) =>
  getJson<UpsellResponse>(
    `/api/admin/repair-catalog/models/${encodeURIComponent(modelId)}/upsell?${new URLSearchParams({
      ...(location ? { location } : {}),
      ...(q ? { q } : {}),
    }).toString()}`,
    "Forslag kunne ikke hentes.",
    signal,
  );

export const searchDevices = (q: string, location: CaseStore | null, signal?: AbortSignal) =>
  getJson<UpsellDevicesResponse>(
    `/api/admin/repair-catalog/devices?${new URLSearchParams({ ...(location ? { location } : {}), q }).toString()}`,
    "Søgningen fejlede.",
    signal,
  );

export async function searchCustomers(q: string, type: "privat" | "erhverv", signal?: AbortSignal): Promise<ExistingCustomer[]> {
  const data = await getJson<ExistingCustomer[] | { customers: ExistingCustomer[] }>(
    `/api/customers/search?q=${encodeURIComponent(q)}&type=${type}`,
    "Kundesøgning fejlede.",
    signal,
  );
  return Array.isArray(data) ? data : (data.customers ?? []);
}

export const lookupCvr = (cvr: string) =>
  getJson<CvrLookupResponse>(`/api/customers/cvr?cvr=${encodeURIComponent(cvr)}`, "CVR-opslaget fejlede.");

async function postCase<T>(body: unknown, idempotencyKey: string, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/admin/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json", [IDEMPOTENCY_HEADER]: idempotencyKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Forbindelsen fejlede. Tryk Opret sag igen: det er sikkert, du får ikke to sager.");
  }
  if (!res.ok) throw new Error(await apiError(res, fallback));
  return (await res.json()) as T;
}

export const createCase = (body: CreateRepairCaseRequest, idempotencyKey: string) =>
  postCase<CreateRepairCaseResponse>(body, idempotencyKey, "Sagen kunne ikke oprettes. Prøv igen.");

/** Flere enheder: én sag pr. enhed, oprettet samlet med én nøgle. */
export const createCaseGroup = (body: CreateRepairCaseGroupRequest, idempotencyKey: string) =>
  postCase<CreateRepairCaseGroupResponse>(body, idempotencyKey, "Sagerne kunne ikke oprettes. Prøv igen.");

export async function uploadIntakePhoto(file: File, folder: "intake" | "checklist" = "intake"): Promise<{ url: string; path: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await apiError(res, "Fotoet kunne ikke uploades."));
  const data = (await res.json()) as { url: string; path?: string };
  return { url: data.url, path: data.path ?? data.url };
}
