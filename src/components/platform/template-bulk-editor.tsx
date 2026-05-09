"use client";

import { useState } from "react";

interface TemplateBulkEditorProps {
  selectedIds: string[];
  onComplete: () => void;
  onClear: () => void;
}

/**
 * Floating bulk-action bar for the product-template list.
 * Mirrors components/platform/bulk-editor.tsx (which targets sku_products)
 * but talks to /api/platform/templates instead.
 */
export function TemplateBulkEditor({
  selectedIds,
  onComplete,
  onClear,
}: TemplateBulkEditorProps) {
  const [mode, setMode] = useState<"idle" | "price">("idle");
  const [priceField, setPriceField] = useState<"base_price_a" | "base_price_b" | "base_price_c">(
    "base_price_a",
  );
  const [priceValue, setPriceValue] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (selectedIds.length === 0) return null;

  async function applyBulk(items: Array<Record<string, unknown>>) {
    setUpdating(true);
    try {
      const res = await fetch("/api/platform/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Bulk update failed");
      const result = await res.json();
      if (result.errors?.length > 0) {
        console.warn("Template bulk update errors:", result.errors);
      }
      setMode("idle");
      setPriceValue("");
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  function handlePriceApply() {
    const parsed = parseFloat(priceValue.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return;
    const oere = Math.round(parsed * 100);
    applyBulk(selectedIds.map((id) => ({ id, [priceField]: oere })));
  }

  function handleStatusChange(status: "draft" | "published") {
    applyBulk(selectedIds.map((id) => ({ id, status })));
  }

  async function handleBulkDelete() {
    if (
      !window.confirm(
        `Slet ${selectedIds.length} ${selectedIds.length === 1 ? "skabelon" : "skabeloner"}? Dette kan ikke fortrydes — og fejler hvis nogen af dem stadig har enheder eller tilbehør tilknyttet.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/platform/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(`Sletning fejlede: ${data.error ?? res.statusText}`);
        return;
      }
      onComplete();
    } catch (err) {
      console.error(err);
      window.alert("Sletning fejlede — netværksfejl.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
          {selectedIds.length} valgt
        </span>

        {mode === "idle" && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange("published")}
                disabled={updating}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
              >
                Publicer
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("draft")}
                disabled={updating}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Sæt som kladder
              </button>
              <button
                type="button"
                onClick={() => setMode("price")}
                disabled={updating}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Sæt pris
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                {deleting ? "Sletter…" : "Slet"}
              </button>
            </div>

            <button
              type="button"
              onClick={onClear}
              className="ml-auto text-xs font-medium text-stone-500 hover:text-stone-700"
            >
              Ryd valg
            </button>
          </>
        )}

        {mode === "price" && (
          <>
            <select
              value={priceField}
              onChange={(e) =>
                setPriceField(
                  e.target.value as "base_price_a" | "base_price_b" | "base_price_c",
                )
              }
              className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
            >
              <option value="base_price_a">Pris A</option>
              <option value="base_price_b">Pris B</option>
              <option value="base_price_c">Pris C</option>
            </select>
            <input
              type="number"
              autoFocus
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              placeholder="DKK"
              className="w-28 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
            />
            <button
              type="button"
              onClick={handlePriceApply}
              disabled={updating || !priceValue.trim()}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {updating ? "Opdaterer…" : "Anvend"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setPriceValue("");
              }}
              className="text-xs font-medium text-stone-500 hover:text-stone-700"
            >
              Annullér
            </button>
          </>
        )}
      </div>
    </div>
  );
}
