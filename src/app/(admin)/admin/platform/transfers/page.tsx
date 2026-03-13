"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/platform/format";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface DeviceSuggestion {
  id: string;
  barcode: string;
  serial_number: string | null;
  imei: string | null;
  template: { display_name: string } | null;
  location: { name: string } | null;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface Transfer {
  id: string;
  transferred_at: string;
  reason: string | null;
  transferred_by: string | null;
  device: {
    id: string;
    barcode: string;
    template: { display_name: string } | null;
  } | null;
  from_location: { name: string } | null;
  to_location: { name: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function TransfersPage() {
  /* ---- Quick-transfer state ---- */
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<DeviceSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceSuggestion | null>(null);
  const [toLocationId, setToLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  /* ---- Reference data ---- */
  const [locations, setLocations] = useState<Location[]>([]);

  /* ---- Transfer log ---- */
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);

  /* ---- Load locations + transfers on mount ---- */
  useEffect(() => {
    fetch("/api/platform/locations")
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  const loadTransfers = useCallback(() => {
    setLogLoading(true);
    fetch("/api/platform/transfers?limit=100")
      .then((r) => r.json())
      .then((data: Transfer[]) => {
        setTransfers(Array.isArray(data) ? data : []);
        setLogLoading(false);
      })
      .catch(() => {
        setTransfers([]);
        setLogLoading(false);
      });
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  /* ---- Device autocomplete ---- */
  useEffect(() => {
    if (selectedDevice) return; // already selected — don't re-search
    if (search.trim().length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/platform/devices?search=${encodeURIComponent(search.trim())}&limit=5`)
        .then((r) => r.json())
        .then((data: { devices: DeviceSuggestion[] }) => {
          setSuggestions(data.devices ?? []);
          setSuggestionsOpen((data.devices?.length ?? 0) > 0);
        })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedDevice]);

  /* ---- Close dropdown on outside click ---- */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ---- Handlers ---- */
  function selectDevice(d: DeviceSuggestion) {
    setSelectedDevice(d);
    setSearch(`${d.barcode}${d.template ? " — " + d.template.display_name : ""}`);
    setSuggestionsOpen(false);
    setSubmitError(null);
  }

  function clearDevice() {
    setSelectedDevice(null);
    setSearch("");
    setSuggestions([]);
    setSubmitError(null);
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDevice || !toLocationId) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch("/api/platform/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: selectedDevice.id,
          to_location_id: toLocationId,
          reason: reason.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? "Ukendt fejl");
      } else {
        const toName = locations.find((l) => l.id === toLocationId)?.name ?? toLocationId;
        setSubmitSuccess(
          `${selectedDevice.barcode} er overført til ${toName}.`,
        );
        clearDevice();
        setToLocationId("");
        setReason("");
        loadTransfers();
      }
    } catch {
      setSubmitError("Netværksfejl — prøv igen");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Overførsler</h1>
        <p className="mt-1 text-sm text-stone-400">
          Overfør enheder mellem lokationer og se overførselshistorik
        </p>
      </div>

      {/* ── Quick-transfer card ──────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-stone-700">
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          Hurtigoverførsel
        </h2>

        <form onSubmit={handleTransfer} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Device search */}
          <div className="relative min-w-0 flex-1" ref={searchRef}>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Enhed (barcode / serienr / IMEI)
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (selectedDevice) setSelectedDevice(null);
                }}
                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                placeholder="Søg efter enhed…"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 pr-9 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-500/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/10"
                autoComplete="off"
              />
              {selectedDevice && (
                <button
                  type="button"
                  onClick={clearDevice}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  aria-label="Ryd valg"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {suggestionsOpen && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
                {suggestions.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onMouseDown={() => selectDevice(d)}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm hover:bg-stone-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-stone-800">{d.barcode}</p>
                        <p className="truncate text-xs text-stone-400">
                          {d.template?.display_name ?? "Ukendt model"}
                          {d.location ? ` · ${d.location.name}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Target location */}
          <div className="w-full sm:w-52">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Til lokation
            </label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 focus:border-green-500/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/10"
            >
              <option value="">Vælg lokation…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="w-full sm:w-48">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Årsag (valgfri)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="f.eks. salg, reparation…"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-500/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/10"
            />
          </div>

          {/* Submit button */}
          <div className="shrink-0">
            <label className="mb-1.5 hidden sm:block text-xs font-semibold uppercase tracking-wider text-transparent select-none">
              &nbsp;
            </label>
            <button
              type="submit"
              disabled={submitting || !selectedDevice || !toLocationId}
              className="w-full rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-green-600/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? "Overfører…" : "Overfør"}
            </button>
          </div>
        </form>

        {/* Feedback */}
        {submitSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {submitSuccess}
          </div>
        )}
        {submitError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {submitError}
          </div>
        )}
      </div>

      {/* ── Transfer log ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-stone-700">Overførselslog</h2>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">
            {transfers.length} poster
          </span>
        </div>

        {logLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="mx-auto mb-3 h-10 w-10 text-stone-200"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            <p className="text-sm text-stone-400">Ingen overførsler registreret endnu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  <th className="px-6 py-3">Dato</th>
                  <th className="px-6 py-3">Enhed</th>
                  <th className="px-6 py-3">Fra</th>
                  <th className="px-6 py-3">Til</th>
                  <th className="px-6 py-3">Overført af</th>
                  <th className="px-6 py-3">Årsag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transfers.map((t) => (
                  <tr key={t.id} className="group transition-colors hover:bg-stone-50/50">
                    {/* Date */}
                    <td className="whitespace-nowrap px-6 py-3 text-stone-500">
                      {formatDate(t.transferred_at)}
                    </td>

                    {/* Device — linked to stock detail */}
                    <td className="px-6 py-3">
                      {t.device ? (
                        <Link
                          href={`/admin/platform/stock/${t.device.id}`}
                          className="group/link flex flex-col"
                        >
                          <span className="font-mono text-xs font-semibold text-green-700 group-hover/link:underline">
                            {t.device.barcode}
                          </span>
                          {t.device.template && (
                            <span className="text-xs text-stone-400">
                              {t.device.template.display_name}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* From location */}
                    <td className="px-6 py-3">
                      {t.from_location ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                          {t.from_location.name}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* To location */}
                    <td className="px-6 py-3">
                      {t.to_location ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          {t.to_location.name}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* Transferred by */}
                    <td className="px-6 py-3 text-xs text-stone-500">
                      {t.transferred_by ?? <span className="text-stone-300">—</span>}
                    </td>

                    {/* Reason */}
                    <td className="px-6 py-3 text-xs text-stone-500">
                      {t.reason ?? <span className="text-stone-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
