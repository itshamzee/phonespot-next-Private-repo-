"use client";

import { useState, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { FoxwayImportPreview } from "@/components/foxway/import-preview";
import type { PreviewItem, PreviewResult } from "@/lib/foxway/sync";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParseStats {
  totalRows: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

interface PreviewResponse extends PreviewResult {
  parseStats: ParseStats;
}

interface SyncResultData {
  created: number;
  updated: number;
  delisted: number;
  templatesCreated: number;
  errors: { sku: string; error: string }[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FoxwayImportPage() {
  const supabase = createBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Last sync info
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastSyncLoaded, setLastSyncLoaded] = useState(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResultData | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Drag state
  const [dragging, setDragging] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch last sync date on mount
  // ---------------------------------------------------------------------------

  const fetchLastSync = useCallback(async () => {
    if (lastSyncLoaded) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/foxway/import", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.imported_at) {
          setLastSync(data.imported_at);
        }
      }
    } catch {
      // Silently ignore — last sync info is non-critical
    }
    setLastSyncLoaded(true);
  }, [lastSyncLoaded, supabase.auth]);

  // Trigger on first render
  if (!lastSyncLoaded) {
    fetchLastSync();
  }

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  async function handleFile(selectedFile: File) {
    setFile(selectedFile);
    setUploadError(null);
    setSyncResult(null);
    setSyncError(null);
    setPriceOverrides({});
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/admin/foxway/import?preview=true", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setUploadError(err.error ?? "Upload fejlede");
        return;
      }

      const data: PreviewResponse = await res.json();
      setPreviewData(data);
    } catch {
      setUploadError("Netvaerksfejl - proev igen");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.name.endsWith(".csv")) {
      handleFile(dropped);
    }
  }

  function handlePriceChange(sourceSku: string, newPriceOere: number) {
    setPriceOverrides((prev) => ({ ...prev, [sourceSku]: newPriceOere }));
    if (previewData) {
      setPreviewData({
        ...previewData,
        items: previewData.items.map((item) =>
          item.sourceSku === sourceSku
            ? { ...item, sellPrice: newPriceOere }
            : item,
        ),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  async function handleSync() {
    if (!file) return;
    setSyncing(true);
    setSyncError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);

      // Only send overrides that differ from defaults
      if (Object.keys(priceOverrides).length > 0) {
        formData.append("priceOverrides", JSON.stringify(priceOverrides));
      }

      const res = await fetch("/api/admin/foxway/import?sync=true", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setSyncError(err.error ?? "Synkronisering fejlede");
        return;
      }

      const result: SyncResultData = await res.json();
      setSyncResult(result);
      setLastSync(new Date().toISOString());
    } catch {
      setSyncError("Netvaerksfejl - proev igen");
    } finally {
      setSyncing(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreviewData(null);
    setPriceOverrides({});
    setSyncResult(null);
    setSyncError(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const syncableCount = previewData
    ? previewData.items.filter((i) => i.status !== "unchanged").length
    : 0;

  const formatLastSync = lastSync
    ? new Intl.DateTimeFormat("da-DK", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(lastSync))
    : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Foxway Import
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            {formatLastSync
              ? `Sidst synkroniseret: ${formatLastSync}`
              : "Ingen synkronisering endnu"}
          </p>
        </div>
        {previewData && !syncResult && (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Nulstil
          </button>
        )}
      </div>

      {/* Success banner */}
      {syncResult && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="text-base font-bold text-emerald-800">
            Synkronisering faerdig
          </h3>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-emerald-700">
            <span>{syncResult.created} oprettet</span>
            <span>{syncResult.updated} opdateret</span>
            <span>{syncResult.delisted} aflistet</span>
            {syncResult.templatesCreated > 0 && (
              <span>{syncResult.templatesCreated} nye skabeloner</span>
            )}
          </div>
          {syncResult.errors.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">
                {syncResult.errors.length} fejl
              </p>
              <ul className="space-y-1">
                {syncResult.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-700">
                    <span className="font-mono font-bold">{err.sku}:</span> {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Importer ny fil
          </button>
        </div>
      )}

      {/* Upload zone */}
      {!previewData && !syncResult && (
        <div className="mb-6">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 transition ${
              dragging
                ? "border-emerald-400 bg-emerald-50"
                : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
                <p className="text-sm text-stone-500">Behandler CSV...</p>
              </div>
            ) : (
              <>
                <svg
                  className="h-10 w-10 text-stone-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-stone-600">
                    Traek en Foxway CSV hertil, eller klik for at vaelge
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    Kun .csv filer (semikolon-separeret)
                  </p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileInput}
            />
          </label>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {/* Preview */}
      {previewData && !syncResult && (
        <>
          {/* Stats bar */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <span className="text-sm text-stone-600">
              Fandt{" "}
              <span className="font-bold text-stone-800">
                {previewData.parseStats.totalRows}
              </span>{" "}
              raekker
            </span>
            <span className="text-stone-300">&rarr;</span>
            <span className="text-sm text-stone-600">
              <span className="font-bold text-stone-800">
                {previewData.items.length}
              </span>{" "}
              nordiske notebooks efter filtrering
            </span>
            <span className="text-xs text-stone-400">
              (spring {previewData.parseStats.skipped} over)
            </span>
            {previewData.parseStats.errors.length > 0 && (
              <span className="text-xs text-red-500">
                {previewData.parseStats.errors.length} parsefejl
              </span>
            )}
          </div>

          {/* File info */}
          {file && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-stone-50 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <svg
                  className="h-5 w-5 text-stone-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <span className="text-sm font-medium text-stone-700">{file.name}</span>
                <span className="text-xs text-stone-400">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}

          {/* Preview summary cards */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniCard
              label="Nye"
              value={previewData.newDevices}
              accent="emerald"
            />
            <MiniCard
              label="Opdaterede"
              value={previewData.updatedDevices}
              accent="amber"
            />
            <MiniCard
              label="Fjernede"
              value={previewData.delistedDevices}
              accent="red"
            />
            <MiniCard
              label="Nye skabeloner"
              value={previewData.newTemplates}
              accent="blue"
            />
          </div>

          {/* Preview table */}
          <FoxwayImportPreview
            items={previewData.items}
            onPriceChange={handlePriceChange}
          />

          {/* Sync button */}
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Annuller
            </button>

            <div className="flex items-center gap-3">
              {syncError && (
                <span className="text-sm text-red-600">{syncError}</span>
              )}
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || syncableCount === 0}
                className="flex items-center gap-2 rounded-xl bg-green-eco px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Synkroniserer...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                    Synkroniser {previewData.items.length} produkter
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini card
// ---------------------------------------------------------------------------

function MiniCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  const colors: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700" },
    red: { bg: "bg-red-50", text: "text-red-700" },
    blue: { bg: "bg-blue-50", text: "text-blue-700" },
  };
  const c = colors[accent] ?? colors.emerald;

  return (
    <div className={`rounded-xl border border-black/[0.04] ${c.bg} px-4 py-3`}>
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${c.text}`}>{value}</p>
    </div>
  );
}
