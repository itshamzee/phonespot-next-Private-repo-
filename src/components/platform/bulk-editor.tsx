"use client";

import { useState } from "react";

interface BulkEditorProps {
  selectedIds: string[];
  onComplete: () => void;
  onClear: () => void;
}

export function BulkEditor({ selectedIds, onComplete, onClear }: BulkEditorProps) {
  const [mode, setMode] = useState<"idle" | "price" | "status">("idle");
  const [priceValue, setPriceValue] = useState("");
  const [updating, setUpdating] = useState(false);

  if (selectedIds.length === 0) return null;

  async function applyBulk(items: Array<Record<string, unknown>>) {
    setUpdating(true);
    try {
      const res = await fetch("/api/platform/sku", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Bulk update failed");
      const result = await res.json();
      if (result.errors?.length > 0) {
        console.warn("Bulk update errors:", result.errors);
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
    applyBulk(selectedIds.map((id) => ({ id, selling_price: oere })));
  }

  function handleStatusChange(status: "draft" | "published") {
    applyBulk(selectedIds.map((id) => ({ id, status })));
  }

  function handleSoftDelete() {
    if (!window.confirm(`Er du sikker? ${selectedIds.length} produkter sættes til kladde.`)) return;
    applyBulk(selectedIds.map((id) => ({ id, status: "draft", is_active: false })));
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        {/* Count */}
        <span className="text-sm font-semibold text-stone-700">
          {selectedIds.length} produkt{selectedIds.length !== 1 ? "er" : ""} valgt
        </span>

        <div className="mx-2 h-5 w-px bg-stone-200" />

        {/* Actions */}
        {mode === "idle" && (
          <>
            <button
              type="button"
              disabled={updating}
              onClick={() => setMode("price")}
              className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-200 disabled:opacity-40"
            >
              Skift pris
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => setMode("status")}
              className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-200 disabled:opacity-40"
            >
              Skift status
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={handleSoftDelete}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-40"
            >
              Slet
            </button>
          </>
        )}

        {/* Price input */}
        {mode === "price" && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePriceApply();
                if (e.key === "Escape") { setMode("idle"); setPriceValue(""); }
              }}
              placeholder="Ny pris i kr."
              className="w-28 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
            />
            <button
              type="button"
              disabled={updating || !priceValue}
              onClick={handlePriceApply}
              className="rounded-lg bg-green-eco px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {updating ? "Opdaterer..." : "Anvend"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("idle"); setPriceValue(""); }}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Annuller
            </button>
          </div>
        )}

        {/* Status dropdown */}
        {mode === "status" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange("published")}
              className="rounded-lg bg-green-eco/10 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-eco/20 disabled:opacity-40"
            >
              {updating ? "..." : "Publiceret"}
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange("draft")}
              className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-200 disabled:opacity-40"
            >
              {updating ? "..." : "Kladde"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Annuller
            </button>
          </div>
        )}

        {/* Deselect */}
        <button
          type="button"
          onClick={() => { setMode("idle"); setPriceValue(""); onClear(); }}
          className="ml-auto text-xs text-stone-400 hover:text-stone-600"
        >
          Fravælg alle
        </button>
      </div>
    </div>
  );
}
