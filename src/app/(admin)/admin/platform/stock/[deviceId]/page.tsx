"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDKK, formatDate, parseDKKToOere } from "@/lib/platform/format";
import { DeviceTransferDialog } from "@/components/platform/device-transfer-dialog";
import { ProductImageUploader } from "@/components/platform/product-image-uploader";
import { DEVICE_SPEC_FIELDS } from "@/lib/platform/device-spec-fields";
import { GRADE_SHORT_LABEL } from "@/lib/grades";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface DeviceDetail {
  id: string;
  barcode: string;
  serial_number: string | null;
  imei: string | null;
  grade: "N" | "P" | "A" | "B" | "C" | null;
  battery_health: number | null;
  condition_notes: string | null;
  storage: string | null;
  color: string | null;
  purchase_price: number;
  selling_price: number | null;
  vat_scheme: string;
  status: string;
  photos: string[];
  purchase_documents: string | null;
  created_at: string;
  template: {
    id: string;
    display_name: string;
    category: string;
    images: string[] | null;
    specifications: Record<string, unknown> | null;
  } | null;
  location: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
}

interface Transfer {
  id: string;
  created_at: string;
  from_location: { name: string } | null;
  to_location: { name: string } | null;
  reason: string | null;
  created_by: string | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const GRADE_BADGE: Record<string, string> = {
  N: "bg-blue-100 text-blue-800 border-blue-200",
  P: "bg-sky-100 text-sky-800 border-sky-200",
  A: "bg-green-100 text-green-800 border-green-200",
  B: "bg-yellow-100 text-yellow-800 border-yellow-200",
  C: "bg-orange-100 text-orange-800 border-orange-200",
};

const GRADE_ORDER = ["N", "P", "A", "B", "C"] as const;

// Danske labels for spec-nøgler (Foxway-sync gemmer engelske nøgler)
const SPEC_LABELS: Record<string, string> = {
  ram: "RAM",
  processor: "Processor",
  chip: "Chip",
  storage: "Lagerplads",
  lagertype: "Lagertype",
  screen_size: "Skærmstørrelse",
  skærm: "Skærmstørrelse",
  resolution: "Opløsning",
  graphics: "Grafik",
  display_type: "Skærmtype",
  os: "Styresystem",
  connectivity: "Forbindelse",
  størrelse: "Størrelse",
};

function specLabel(key: string): string {
  return SPEC_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

const STATUS_BADGE: Record<string, string> = {
  intake: "bg-stone-100 text-stone-700 border-stone-200",
  graded: "bg-blue-100 text-blue-700 border-blue-200",
  listed: "bg-green-100 text-green-700 border-green-200",
  reserved: "bg-purple-100 text-purple-700 border-purple-200",
  sold: "bg-stone-200 text-stone-500 border-stone-300",
  shipped: "bg-sky-100 text-sky-700 border-sky-200",
  picked_up: "bg-teal-100 text-teal-700 border-teal-200",
  returned: "bg-red-100 text-red-700 border-red-200",
  delisted: "bg-stone-200 text-stone-500 border-stone-300",
};

const STATUS_LABELS: Record<string, string> = {
  intake: "Modtaget",
  graded: "Graderet",
  listed: "Til salg",
  reserved: "Reserveret",
  sold: "Solgt",
  shipped: "Sendt",
  picked_up: "Afhentet",
  returned: "Returneret",
  delisted: "Arkiveret",
};

const EDITABLE_STATUSES = [
  "intake",
  "graded",
  "listed",
  "reserved",
  "sold",
  "shipped",
  "picked_up",
  "returned",
  "delisted",
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
      {children}
    </h2>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-400">{label}</p>
      <p className="mt-0.5 text-sm text-stone-800">{value ?? <span className="text-stone-300">—</span>}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page component                                                       */
/* ------------------------------------------------------------------ */

export default function DeviceDetailPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const router = useRouter();

  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable form state
  const [grade, setGrade] = useState<string>("");
  const [batteryHealth, setBatteryHealth] = useState<string>("");
  const [conditionNotes, setConditionNotes] = useState<string>("");
  const [sellingPriceInput, setSellingPriceInput] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [storage, setStorage] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [imeiInput, setImeiInput] = useState<string>("");

  // Template (produktdata) form state
  const [templateImages, setTemplateImages] = useState<string[]>([]);
  const [templateSpecs, setTemplateSpecs] = useState<Record<string, string>>({});
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);

  // Device photo upload
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [locationId, setLocationId] = useState<string>("");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const [transferOpen, setTransferOpen] = useState(false);

  /* ---- Fetch device ---- */
  const fetchDevice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devRes, transferRes] = await Promise.all([
        fetch(`/api/platform/devices/${deviceId}`),
        fetch(`/api/platform/transfers?device_id=${deviceId}`),
      ]);
      if (!devRes.ok) {
        if (devRes.status === 404) throw new Error("Enhed ikke fundet");
        throw new Error(`Serverfejl (${devRes.status})`);
      }
      const dev: DeviceDetail = await devRes.json();
      setDevice(dev);
      // Populate form
      setGrade(dev.grade ?? "");
      setBatteryHealth(dev.battery_health != null ? String(dev.battery_health) : "");
      setConditionNotes(dev.condition_notes ?? "");
      setSellingPriceInput(
        dev.selling_price != null
          ? String(dev.selling_price / 100).replace(".", ",")
          : ""
      );
      setStatus(dev.status);
      setLocationId(dev.location?.id ?? "");
      setStorage(dev.storage ?? "");
      setColor(dev.color ?? "");
      setSerialNumber(dev.serial_number ?? "");
      setImeiInput(dev.imei ?? "");

      // Populate template form (produktdata for modellen)
      setTemplateImages(dev.template?.images ?? []);
      const specs: Record<string, string> = {};
      for (const [key, value] of Object.entries(dev.template?.specifications ?? {})) {
        if (value != null) specs[key] = String(value);
      }
      setTemplateSpecs(specs);

      // Fetch locations for dropdown
      fetch("/api/platform/locations").then(r => r.json()).then(data => {
        if (Array.isArray(data)) setLocations(data);
      }).catch(() => {});

      if (transferRes.ok) {
        const tList: Transfer[] = await transferRes.json();
        setTransfers(tList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  /* ---- Save ---- */
  async function handleSave() {
    if (!device) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const body: Record<string, unknown> = {};
      if (grade) body.grade = grade;
      if (batteryHealth !== "") body.battery_health = parseInt(batteryHealth, 10);
      if (conditionNotes !== "") body.condition_notes = conditionNotes;
      if (status) body.status = status;
      if (locationId) body.location_id = locationId;
      if (storage.trim() !== (device.storage ?? "")) body.storage = storage.trim();
      if (color.trim() !== (device.color ?? "")) body.color = color.trim();
      if (serialNumber.trim() !== (device.serial_number ?? "")) {
        body.serial_number = serialNumber.trim() || null;
      }
      if (imeiInput.trim() !== (device.imei ?? "")) {
        body.imei = imeiInput.trim() || null;
      }
      const parsedPrice = parseDKKToOere(sellingPriceInput);
      if (parsedPrice !== null) body.selling_price = parsedPrice;

      const res = await fetch(`/api/platform/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Serverfejl (${res.status})`);
      }
      setSaveSuccess(true);
      await fetchDevice();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gem mislykkedes");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Device photos ---- */
  async function handlePhotoUpload(files: FileList | null) {
    if (!device || !files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      formData.append("device_id", device.id);
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      const res = await fetch("/api/platform/devices/upload-photos", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload mislykkedes");
      await fetchDevice();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload mislykkedes");
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(url: string) {
    if (!device) return;
    const nextPhotos = device.photos.filter((p) => p !== url);
    try {
      const res = await fetch(`/api/platform/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: nextPhotos }),
      });
      if (!res.ok) throw new Error("Kunne ikke fjerne billedet");
      setDevice((prev) => (prev ? { ...prev, photos: nextPhotos } : prev));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Kunne ikke fjerne billedet");
    }
  }

  /* ---- Template (produktdata) save ---- */
  async function handleTemplateSave() {
    if (!device?.template) return;
    setTemplateSaving(true);
    setTemplateSaveError(null);
    setTemplateSaveSuccess(false);
    try {
      // Merge edited specs on top of existing ones so keys the form doesn't
      // manage (screen_size, resolution, os, ...) survive the update.
      const mergedSpecs: Record<string, unknown> = {
        ...(device.template.specifications ?? {}),
      };
      for (const [key, value] of Object.entries(templateSpecs)) {
        if (value.trim() === "") delete mergedSpecs[key];
        else mergedSpecs[key] = value.trim();
      }

      const res = await fetch(`/api/platform/templates/${device.template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: templateImages, specifications: mergedSpecs }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Serverfejl (${res.status})`);
      }
      setTemplateSaveSuccess(true);
      await fetchDevice();
      setTimeout(() => setTemplateSaveSuccess(false), 3000);
    } catch (err) {
      setTemplateSaveError(err instanceof Error ? err.message : "Gem mislykkedes");
    } finally {
      setTemplateSaving(false);
    }
  }

  /* ---- Delete ---- */
  async function handleDelete() {
    if (!device) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/platform/devices/${device.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Slettning mislykkedes (${res.status})`);
      }
      router.push("/admin/platform/stock");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Sletning mislykkedes");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  /* ---- Render: loading / error ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-stone-400">
        <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Henter enhed…
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="mb-4 text-sm text-red-500">{error ?? "Enheden kunne ikke indlæses"}</p>
        <Link
          href="/admin/platform/stock"
          className="text-sm font-medium text-green-eco hover:underline"
        >
          ← Tilbage til lager
        </Link>
      </div>
    );
  }

  const canDelete = device.status === "intake" || device.status === "graded";

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ---- Breadcrumb + header ---- */}
      <div>
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-stone-400">
          <Link href="/admin/platform/stock" className="hover:text-stone-600 transition">
            Lagerstyring
          </Link>
          <span>/</span>
          <span className="text-stone-600">{device.barcode}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">
                {device.template?.display_name ?? "Ukendt model"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-stone-500">{device.barcode}</span>
                <span
                  className={[
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                    STATUS_BADGE[device.status] ?? "bg-stone-100 text-stone-600 border-stone-200",
                  ].join(" ")}
                >
                  {STATUS_LABELS[device.status] ?? device.status}
                </span>
                {device.grade && (
                  <span
                    className={[
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold",
                      GRADE_BADGE[device.grade] ?? "bg-stone-100 text-stone-600 border-stone-200",
                    ].join(" ")}
                  >
                    Stand {device.grade}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Transfer button */}
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
          >
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
            </svg>
            Overfør enhed
          </button>
        </div>
      </div>

      {/* ---- Two-column layout ---- */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left column (2/3) */}
        <div className="space-y-6 lg:col-span-2">

          {/* Device photo gallery + upload */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                Billeder af denne enhed
              </h2>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhotos}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {uploadingPhotos ? "Uploader…" : "Upload billeder"}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => handlePhotoUpload(e.target.files)}
                className="hidden"
              />
            </div>
            {device.photos && device.photos.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {device.photos.map((photo, i) => (
                  <div
                    key={photo}
                    className="group relative h-24 w-24 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 transition hover:border-stone-300"
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxPhoto(photo)}
                      className="h-full w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={`Billede ${i + 1}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo)}
                      title="Fjern billede"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">
                Ingen billeder endnu — upload fotos af netop denne enhed.
              </p>
            )}
          </div>

          {/* Editable fields */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <SectionHeading>Redigérbare felter</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Grade */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Stand
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                >
                  <option value="">Vælg stand…</option>
                  {GRADE_ORDER.map((g) => (
                    <option key={g} value={g}>
                      {g} — {GRADE_SHORT_LABEL[g]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Battery health */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Batterisundhed (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={batteryHealth}
                  onChange={(e) => setBatteryHealth(e.target.value)}
                  placeholder="85"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                />
              </div>

              {/* Selling price */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Salgspris (kr.)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sellingPriceInput}
                    onChange={(e) => setSellingPriceInput(e.target.value)}
                    placeholder="1.999,00"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 pr-10 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                    kr.
                  </span>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                >
                  {EDITABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Lokation
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                >
                  <option value="">Vælg lokation…</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Storage */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Lagerplads (GB)
                </label>
                <input
                  type="text"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder="fx 256GB SSD M.2"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Farve
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="fx Sort"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                />
              </div>

              {/* Serial number */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Serienummer
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Ikke registreret"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 font-mono text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                />
              </div>

              {/* IMEI */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  IMEI
                </label>
                <input
                  type="text"
                  value={imeiInput}
                  onChange={(e) => setImeiInput(e.target.value)}
                  placeholder="Ikke registreret"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 font-mono text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                />
              </div>

              {/* Condition notes (full width) */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Standbeskrivelse
                </label>
                <textarea
                  rows={3}
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="Beskriv enhedens stand…"
                  className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Save feedback */}
            {saveError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
                Ændringer gemt.
              </div>
            )}

            {/* Save button */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-green-eco px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-eco/20 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Gemmer…
                  </>
                ) : (
                  "Gem ændringer"
                )}
              </button>

              {/* Delete (only for intake/graded) */}
              {canDelete && (
                <div className="flex items-center gap-2">
                  {deleteConfirm ? (
                    <>
                      <span className="text-xs text-stone-500">Er du sikker?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        {deleting ? "Sletter…" : "Ja, slet"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(false)}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-50"
                      >
                        Annuller
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(true)}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-500 transition hover:border-red-200 hover:bg-red-50"
                    >
                      Slet enhed
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Produktdata for modellen (template) */}
          {device.template && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                  Produktdata for modellen
                </h2>
                <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500">
                  {device.template.display_name}
                </span>
              </div>
              <p className="mb-4 text-xs text-stone-400">
                Produktbillede og specifikationer gælder alle enheder af denne model
                og vises på webshoppens produktside.
              </p>

              {/* Template images */}
              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Produktbilleder
                </label>
                <ProductImageUploader
                  images={templateImages}
                  onChange={setTemplateImages}
                  folder={`templates/${device.template.id}`}
                />
              </div>

              {/* Specifications */}
              {(() => {
                const categoryKeys = DEVICE_SPEC_FIELDS.filter((f) =>
                  f.categories.includes(device.template?.category ?? ""),
                ).map((f) => f.key);
                const allKeys = [
                  ...new Set([...Object.keys(templateSpecs), ...categoryKeys]),
                ];
                if (allKeys.length === 0) return null;
                return (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-stone-700">
                      Specifikationer
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {allKeys.map((key) => (
                        <div key={key}>
                          <label className="mb-1 block text-xs font-semibold text-stone-400">
                            {specLabel(key)}
                          </label>
                          <input
                            type="text"
                            value={templateSpecs[key] ?? ""}
                            onChange={(e) =>
                              setTemplateSpecs((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={`fx ${key === "ram" ? "16GB" : "…"}`}
                            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Save feedback */}
              {templateSaveError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {templateSaveError}
                </div>
              )}
              {templateSaveSuccess && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
                  Produktdata gemt.
                </div>
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleTemplateSave}
                  disabled={templateSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-125 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {templateSaving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Gemmer…
                    </>
                  ) : (
                    "Gem produktdata"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Transfer history */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <SectionHeading>Overførselshistorik</SectionHeading>
            {transfers.length === 0 ? (
              <p className="text-sm text-stone-400">Ingen overførsler registreret.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Dato
                      </th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Fra
                      </th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Til
                      </th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Årsag
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t, i) => (
                      <tr
                        key={t.id}
                        className={i < transfers.length - 1 ? "border-b border-stone-50" : ""}
                      >
                        <td className="py-2.5 pr-4 text-xs text-stone-400">
                          {formatDate(t.created_at)}
                        </td>
                        <td className="py-2.5 pr-4 text-sm text-stone-700">
                          {t.from_location?.name ?? <span className="text-stone-300">—</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-sm font-medium text-stone-800">
                          {t.to_location?.name ?? <span className="text-stone-300">—</span>}
                        </td>
                        <td className="py-2.5 text-sm text-stone-500">
                          {t.reason ?? <span className="text-stone-300 italic">Ingen årsag</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">

          {/* Read-only info */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <SectionHeading>Enhedsinfo</SectionHeading>
            <div className="space-y-3">
              <ReadOnlyField label="Serienummer" value={device.serial_number} />
              <ReadOnlyField label="IMEI" value={device.imei} />
              <ReadOnlyField
                label="Indkøbspris"
                value={<span className="font-semibold">{formatDKK(device.purchase_price)}</span>}
              />
              <ReadOnlyField
                label="Momsordning"
                value={
                  device.vat_scheme === "brugtmoms"
                    ? "Brugtmoms (margin)"
                    : "Almindelig moms"
                }
              />
              <ReadOnlyField label="Leverandør" value={device.supplier?.name} />
              <ReadOnlyField label="Lokation" value={device.location?.name} />
              <ReadOnlyField
                label="Registreret"
                value={formatDate(device.created_at)}
              />
            </div>
          </div>

          {/* Afregningsbilag */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <SectionHeading>Afregningsbilag</SectionHeading>
            {device.purchase_documents ? (
              <a
                href={device.purchase_documents}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Se bilag (PDF)
              </a>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-400">Intet bilag tilknyttet endnu.</p>
                <a
                  href={`/api/platform/afregningsbilag?device_id=${device.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                >
                  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generer bilag
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Lightbox ---- */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxPhoto}
            alt="Billedvisning"
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ---- Transfer dialog ---- */}
      <DeviceTransferDialog
        device={
          device
            ? {
                id: device.id,
                barcode: device.barcode,
                templateName: device.template?.display_name ?? "Ukendt model",
                locationId: device.location?.id ?? "",
                locationName: device.location?.name ?? "Ukendt",
              }
            : null
        }
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onTransferred={() => {
          setTransferOpen(false);
          fetchDevice();
        }}
      />
    </div>
  );
}
