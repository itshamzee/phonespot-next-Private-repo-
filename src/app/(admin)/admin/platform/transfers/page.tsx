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
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<DeviceSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceSuggestion | null>(null);
  const [toLocationId, setToLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (selectedDevice) return;
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectDevice(d: DeviceSuggestion) {
    setSelectedDevice(d);
    setSearch(`${d.barcode}${d.template ? " \u2014 " + d.template.display_name : ""}`);
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
          `${selectedDevice.barcode} er overf\u00f8rt til ${toName}.`,
        );
        clearDevice();
        setToLocationId("");
        setReason("");
        loadTransfers();
      }
    } catch {
      setSubmitError("Netv\u00e6rksfejl \u2014 pr\u00f8v igen");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page header */}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Overf\u00f8rsler
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          Overf\u00f8r enheder mellem lokationer og se overf\u00f8rselshistorik
        </p>
      </div>

      {/* Quick-transfer card */}
      <div className="rounded-2xl border border-black/[0.04] bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-charcoal">
          <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Hurtigoverf\u00f8rsel
        </h3>

        <form onSubmit={handleTransfer} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Device search */}
          <div className="relative min-w-0 flex-1" ref={searchRef}>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-charcoal/35">
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
                placeholder="S\u00f8g efter enhed\u2026"
                className="w-full rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 pr-9 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                autoComplete="off"
              />
              {selectedDevice && (
                <button
                  type="button"
                  onClick={clearDevice}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60"
                  aria-label="Ryd valg"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {suggestionsOpen && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-lg">
                {suggestions.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onMouseDown={() => selectDevice(d)}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-charcoal/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-charcoal">{d.barcode}</p>
                        <p className="truncate text-xs text-charcoal/35">
                          {d.template?.display_name ?? "Ukendt model"}
                          {d.location ? ` \u00b7 ${d.location.name}` : ""}
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
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-charcoal/35">
              Til lokation
            </label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              className="w-full rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
            >
              <option value="">V\u00e6lg lokation\u2026</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="w-full sm:w-48">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-charcoal/35">
              \u00c5rsag (valgfri)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="f.eks. salg, reparation\u2026"
              className="w-full rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          {/* Submit */}
          <div className="shrink-0">
            <label className="mb-1.5 hidden text-[11px] font-bold uppercase tracking-wider text-transparent sm:block select-none">
              &nbsp;
            </label>
            <button
              type="submit"
              disabled={submitting || !selectedDevice || !toLocationId}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-500/15 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? "Overf\u00f8rer\u2026" : "Overf\u00f8r"}
            </button>
          </div>
        </form>

        {submitSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {submitSuccess}
          </div>
        )}
        {submitError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600">
            {submitError}
          </div>
        )}
      </div>

      {/* Transfer log */}
      <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-black/[0.03] px-6 py-4">
          <h3 className="text-sm font-bold text-charcoal">Overf\u00f8rselslog</h3>
          <span className="rounded-full bg-charcoal/[0.04] px-2.5 py-1 text-[10px] font-bold text-charcoal/35">
            {transfers.length} poster
          </span>
        </div>

        {logLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
              <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-charcoal/30">Ingen overf\u00f8rsler registreret endnu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.03] text-left text-[11px] font-bold uppercase tracking-wider text-charcoal/30">
                  <th className="px-6 py-3">Dato</th>
                  <th className="px-6 py-3">Enhed</th>
                  <th className="px-6 py-3">Fra</th>
                  <th className="px-6 py-3">Til</th>
                  <th className="px-6 py-3">Overf\u00f8rt af</th>
                  <th className="px-6 py-3">\u00c5rsag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.02]">
                {transfers.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-black/[0.015]">
                    <td className="whitespace-nowrap px-6 py-3 text-charcoal/40">
                      {formatDate(t.transferred_at)}
                    </td>
                    <td className="px-6 py-3">
                      {t.device ? (
                        <Link
                          href={`/admin/platform/stock/${t.device.id}`}
                          className="group/link flex flex-col"
                        >
                          <span className="font-mono text-xs font-bold text-emerald-600 group-hover/link:underline">
                            {t.device.barcode}
                          </span>
                          {t.device.template && (
                            <span className="text-xs text-charcoal/35">
                              {t.device.template.display_name}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span className="text-charcoal/20">\u2014</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {t.from_location ? (
                        <span className="rounded-full bg-charcoal/[0.04] px-2.5 py-1 text-[10px] font-bold text-charcoal/40">
                          {t.from_location.name}
                        </span>
                      ) : (
                        <span className="text-charcoal/20">\u2014</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {t.to_location ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                          {t.to_location.name}
                        </span>
                      ) : (
                        <span className="text-charcoal/20">\u2014</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-charcoal/40">
                      {t.transferred_by ?? <span className="text-charcoal/20">\u2014</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-charcoal/40">
                      {t.reason ?? <span className="text-charcoal/20">\u2014</span>}
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
