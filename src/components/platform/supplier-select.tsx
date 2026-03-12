"use client";

import { useState, useEffect, useRef } from "react";

interface Supplier {
  id: string;
  name: string;
  type: string;
  is_vat_registered: boolean;
}

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  customer_trade_in: "Kunde (indbytte)",
  wholesale: "Grossist",
  auction: "Auktion",
};

interface SupplierSelectProps {
  value: string | null;
  onChange: (id: string, isVatRegistered: boolean) => void;
}

export function SupplierSelect({ value, onChange }: SupplierSelectProps) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // New supplier form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"customer_trade_in" | "wholesale" | "auction">(
    "wholesale"
  );
  const [newVat, setNewVat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSupplier = suppliers.find((s) => s.id === value) ?? null;

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/suppliers");
      if (res.ok) {
        const data: Supplier[] = await res.json();
        setSuppliers(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleSelect(supplier: Supplier) {
    setOpen(false);
    onChange(supplier.id, supplier.is_vat_registered);
  }

  async function handleSaveNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/platform/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          is_vat_registered: newVat,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error ?? "Fejl ved oprettelse");
        return;
      }

      const created: Supplier = await res.json();
      setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowNewForm(false);
      setNewName("");
      setNewType("wholesale");
      setNewVat(false);
      setOpen(false);
      onChange(created.id, created.is_vat_registered);
    } catch {
      setSaveError("Netværksfejl — prøv igen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-700 transition hover:border-stone-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-eco/40"
      >
        <span className={selectedSupplier ? "text-stone-800" : "text-stone-400"}>
          {selectedSupplier ? (
            <span className="flex flex-col">
              <span>{selectedSupplier.name}</span>
              <span className="text-xs text-stone-400">
                {SUPPLIER_TYPE_LABELS[selectedSupplier.type] ?? selectedSupplier.type}
                {selectedSupplier.is_vat_registered ? " · Moms reg." : ""}
              </span>
            </span>
          ) : (
            "Vælg leverandør…"
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          {/* Supplier list */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {loading ? (
              <li className="px-4 py-3 text-sm text-stone-400">Indlæser…</li>
            ) : suppliers.length === 0 ? (
              <li className="px-4 py-3 text-sm text-stone-400">Ingen leverandører endnu</li>
            ) : (
              suppliers.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className={[
                      "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition hover:bg-stone-50",
                      value === s.id ? "bg-green-eco/5" : "",
                    ].join(" ")}
                  >
                    <span className="text-sm font-medium text-stone-800">{s.name}</span>
                    <span className="text-xs text-stone-400">
                      {SUPPLIER_TYPE_LABELS[s.type] ?? s.type}
                      {s.is_vat_registered ? " · Moms reg." : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Add new supplier section */}
          <div className="border-t border-stone-100">
            {!showNewForm ? (
              <button
                type="button"
                onClick={() => setShowNewForm(true)}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-green-eco transition hover:bg-green-eco/5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Tilføj ny leverandør
              </button>
            ) : (
              <form onSubmit={handleSaveNew} className="space-y-3 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Ny leverandør
                </p>

                {/* Name */}
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Leverandørnavn"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-eco/50 focus:outline-none"
                />

                {/* Type radio */}
                <div className="space-y-1.5">
                  {(
                    [
                      ["customer_trade_in", "Kunde (indbytte)"],
                      ["wholesale", "Grossist"],
                      ["auction", "Auktion"],
                    ] as const
                  ).map(([val, label]) => (
                    <label key={val} className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                      <input
                        type="radio"
                        name="supplier-type"
                        value={val}
                        checked={newType === val}
                        onChange={() => setNewType(val)}
                        className="accent-green-eco"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {/* VAT checkbox */}
                <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={newVat}
                    onChange={(e) => setNewVat(e.target.checked)}
                    className="accent-green-eco"
                  />
                  Momsregistreret
                </label>

                {saveError && (
                  <p className="text-xs text-red-500">{saveError}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || !newName.trim()}
                    className="flex-1 rounded-lg bg-green-eco px-3 py-2 text-sm font-medium text-white transition hover:bg-green-eco/90 disabled:opacity-50"
                  >
                    {saving ? "Gemmer…" : "Gem"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewForm(false);
                      setSaveError(null);
                    }}
                    className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
                  >
                    Annuller
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
