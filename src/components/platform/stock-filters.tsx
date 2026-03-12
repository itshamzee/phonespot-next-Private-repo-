"use client";

import { useState, useEffect } from "react";

export interface StockFilters {
  location_id?: string;
  status?: string;
  grade?: string;
  search?: string;
}

interface Location {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Alle statusser" },
  { value: "intake", label: "Modtaget (intake)" },
  { value: "graded", label: "Graderet" },
  { value: "listed", label: "Til salg" },
  { value: "reserved", label: "Reserveret" },
  { value: "sold", label: "Solgt" },
];

const GRADE_OPTIONS = [
  { value: "", label: "Alle grader" },
  { value: "A", label: "A — Perfekt stand" },
  { value: "B", label: "B — God stand" },
  { value: "C", label: "C — Brugt stand" },
];

interface StockFiltersProps {
  filters: StockFilters;
  onChange: (filters: StockFilters) => void;
}

export function StockFilters({ filters, onChange }: StockFiltersProps) {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch("/api/platform/locations");
        if (res.ok) {
          const data: Location[] = await res.json();
          setLocations(data);
        }
      } catch {
        // silently fail — filter still works without locations
      }
    }
    fetchLocations();
  }, []);

  function update(patch: Partial<StockFilters>) {
    onChange({ ...filters, ...patch });
  }

  const hasActiveFilters =
    !!filters.location_id || !!filters.status || !!filters.grade || !!filters.search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-[200px] flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="search"
          value={filters.search ?? ""}
          onChange={(e) => update({ search: e.target.value || undefined })}
          placeholder="Serienr., IMEI, stregkode…"
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-sm text-stone-800 placeholder:text-stone-400 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
        />
      </div>

      {/* Location */}
      {locations.length > 0 && (
        <select
          value={filters.location_id ?? ""}
          onChange={(e) => update({ location_id: e.target.value || undefined })}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
        >
          <option value="">Alle lokationer</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      )}

      {/* Status */}
      <select
        value={filters.status ?? ""}
        onChange={(e) => update({ status: e.target.value || undefined })}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Grade */}
      <select
        value={filters.grade ?? ""}
        onChange={(e) => update({ grade: e.target.value || undefined })}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition hover:border-stone-300 focus:border-green-eco/50 focus:outline-none"
      >
        {GRADE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-500 transition hover:border-stone-300 hover:text-stone-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Ryd filtre
        </button>
      )}
    </div>
  );
}
