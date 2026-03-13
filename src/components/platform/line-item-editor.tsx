"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { DraftLineItem } from "@/lib/supabase/platform-types";
import { formatDKK } from "@/lib/platform/format";

interface Props {
  items: DraftLineItem[];
  onChange: (items: DraftLineItem[]) => void;
}

type AddMode = null | "device" | "sku" | "custom";

interface SearchResult {
  id: string;
  title: string;
  price: number;
  tax_rate?: number;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function LineItemEditor({ items, onChange }: Props) {
  const [addMode, setAddMode] = useState<AddMode>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Custom item state
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input when mode changes
  useEffect(() => {
    if ((addMode === "device" || addMode === "sku") && searchRef.current) {
      searchRef.current.focus();
    }
  }, [addMode]);

  // Perform search
  useEffect(() => {
    if (!debouncedQuery || (!addMode || addMode === "custom")) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const endpoint =
      addMode === "device"
        ? `/api/platform/devices?search=${encodeURIComponent(debouncedQuery)}`
        : `/api/platform/sku?search=${encodeURIComponent(debouncedQuery)}`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((data: unknown[]) => {
        if (cancelled) return;
        const results: SearchResult[] = (Array.isArray(data) ? data : []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) => ({
            id: item.id,
            title:
              item.title ??
              [item.template?.name, item.storage, item.color, item.grade]
                .filter(Boolean)
                .join(" "),
            price: item.selling_price ?? item.sale_price ?? 0,
            tax_rate: item.tax_rate ?? 25,
          }),
        );
        setSearchResults(results);
        setSearchLoading(false);
      })
      .catch(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, addMode]);

  function updateQuantity(idx: number, qty: number) {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, quantity: Math.max(1, qty) } : item,
    );
    onChange(updated);
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function pickSearchResult(result: SearchResult, type: "device" | "sku") {
    const newItem: DraftLineItem = {
      type,
      id: result.id,
      title: result.title,
      quantity: 1,
      unit_price: result.price,
      tax_rate: result.tax_rate ?? 25,
    };
    onChange([...items, newItem]);
    setAddMode(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  function addCustomItem() {
    const priceOere = Math.round(parseFloat(customPrice.replace(",", ".")) * 100);
    if (!customTitle.trim() || isNaN(priceOere)) return;
    const newItem: DraftLineItem = {
      type: "custom",
      title: customTitle.trim(),
      quantity: Math.max(1, parseInt(customQty, 10) || 1),
      unit_price: priceOere,
      tax_rate: 25,
    };
    onChange([...items, newItem]);
    setAddMode(null);
    setCustomTitle("");
    setCustomPrice("");
    setCustomQty("1");
  }

  // Totals (all in øre)
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const taxAmount = items.reduce(
    (sum, i) => sum + Math.round((i.unit_price * i.quantity * i.tax_rate) / (100 + i.tax_rate)),
    0,
  );
  const total = subtotal;

  return (
    <div className="space-y-3">
      {/* Table */}
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                <th className="px-4 py-2.5">Titel</th>
                <th className="px-4 py-2.5 text-center">Antal</th>
                <th className="px-4 py-2.5 text-right">Stykpris</th>
                <th className="px-4 py-2.5 text-right">Moms</th>
                <th className="px-4 py-2.5 text-right">Linjetotal</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item, idx) => {
                const lineTotal = item.unit_price * item.quantity;
                return (
                  <tr key={idx} className="hover:bg-stone-50/40">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-stone-800">{item.title}</div>
                      <div className="text-[11px] text-stone-400 capitalize">{item.type}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                          className="w-16 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-center text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-stone-600">
                      {formatDKK(item.unit_price)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-stone-500">
                      {item.tax_rate}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-stone-800">
                      {formatDKK(lineTotal)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-stone-300 hover:text-red-400 transition-colors"
                        title="Fjern linje"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add mode panels */}
      {(addMode === "device" || addMode === "sku") && (
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={addMode === "device" ? "Søg efter enhed…" : "Søg efter produkt / SKU…"}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
            />
            <button
              type="button"
              onClick={() => { setAddMode(null); setSearchQuery(""); setSearchResults([]); }}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Annuller
            </button>
          </div>
          {searchLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
            </div>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <div className="rounded-lg border border-stone-100 bg-white divide-y divide-stone-50 overflow-hidden">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pickSearchResult(r, addMode)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-stone-50 transition-colors"
                >
                  <span className="text-sm font-medium text-stone-800">{r.title}</span>
                  <span className="text-sm text-stone-500">{formatDKK(r.price)}</span>
                </button>
              ))}
            </div>
          )}
          {!searchLoading && debouncedQuery.length > 0 && searchResults.length === 0 && (
            <p className="py-2 text-center text-xs text-stone-400">Ingen resultater</p>
          )}
        </div>
      )}

      {addMode === "custom" && (
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-stone-500">Titel</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Beskrivelse…"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs font-medium text-stone-500">Pris (kr.)</label>
              <input
                type="text"
                inputMode="decimal"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
              />
            </div>
            <div className="w-20">
              <label className="mb-1 block text-xs font-medium text-stone-500">Antal</label>
              <input
                type="number"
                min={1}
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
              />
            </div>
            <button
              type="button"
              onClick={addCustomItem}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Tilføj
            </button>
            <button
              type="button"
              onClick={() => { setAddMode(null); setCustomTitle(""); setCustomPrice(""); setCustomQty("1"); }}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Add buttons */}
      {addMode === null && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAddMode("device")}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tilføj enhed
          </button>
          <button
            type="button"
            onClick={() => setAddMode("sku")}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tilføj produkt
          </button>
          <button
            type="button"
            onClick={() => setAddMode("custom")}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tilføj brugerdefineret
          </button>
        </div>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-sm">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal</span>
              <span>{formatDKK(subtotal)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Moms</span>
              <span>{formatDKK(taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-1.5 font-semibold text-stone-800">
              <span>Total</span>
              <span>{formatDKK(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
