"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDKK } from "@/lib/platform/format";

interface Location {
  id: string;
  name: string;
  type: string;
}

interface SkuProduct {
  id: string;
  title: string;
  ean: string | null;
  brand: string | null;
  category: string | null;
  selling_price: number;
  active: boolean;
}

interface StockEntry {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  min_level: number | null;
  max_level: number | null;
  product: SkuProduct;
}

interface StockMap {
  // product_id → location_id → StockEntry
  [productId: string]: {
    [locationId: string]: StockEntry;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  covers: "Covers",
  screen_protectors: "Skærmbeskyttere",
  cables: "Kabler",
  chargers: "Opladere",
  earphones: "Øretelefoner",
  other: "Andet",
};

interface SkuStockTableProps {
  searchFilter?: string;
  categoryFilter?: string;
  onEditProduct?: (product: SkuProduct) => void;
}

function StockCell({
  productId,
  locationId,
  stockMap,
  onSaved,
}: {
  productId: string;
  locationId: string;
  stockMap: StockMap;
  onSaved: (entry: StockEntry) => void;
}) {
  const entry = stockMap[productId]?.[locationId];
  const quantity = entry?.quantity ?? 0;
  const minLevel = entry?.min_level ?? null;
  const maxLevel = entry?.max_level ?? null;

  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(quantity));
  const [saving, setSaving] = useState(false);

  // Colour coding
  let qtyColor = "text-stone-600";
  let qtyBg = "bg-stone-50";
  if (minLevel !== null) {
    if (quantity < minLevel) {
      qtyColor = "text-red-700 font-semibold";
      qtyBg = "bg-red-50";
    } else if (quantity === minLevel) {
      qtyColor = "text-amber-700 font-semibold";
      qtyBg = "bg-amber-50";
    } else {
      qtyColor = "text-green-700 font-semibold";
      qtyBg = "bg-green-50";
    }
  }

  async function handleSave() {
    const newQty = parseInt(inputValue, 10);
    if (isNaN(newQty) || newQty < 0) {
      setInputValue(String(quantity));
      setEditing(false);
      return;
    }
    if (newQty === quantity) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/platform/sku-stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          location_id: locationId,
          quantity: newQty,
          min_level: minLevel,
          max_level: maxLevel,
        }),
      });
      if (res.ok) {
        const updated: StockEntry = await res.json();
        onSaved(updated);
      }
    } catch {
      // revert
      setInputValue(String(quantity));
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setInputValue(String(quantity));
              setEditing(false);
            }
          }}
          autoFocus
          className="w-16 rounded-lg border border-green-eco/50 bg-white px-2 py-1 text-center text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-green-eco/30"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setInputValue(String(quantity));
        setEditing(true);
      }}
      disabled={saving}
      title="Klik for at redigere antal"
      className={`group flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition hover:ring-2 hover:ring-green-eco/30 ${qtyBg}`}
    >
      <span className={`text-sm ${qtyColor}`}>{saving ? "…" : quantity}</span>
      {(minLevel !== null || maxLevel !== null) && (
        <span className="text-[10px] text-stone-400">
          {minLevel !== null ? `min ${minLevel}` : ""}
          {minLevel !== null && maxLevel !== null ? " / " : ""}
          {maxLevel !== null ? `max ${maxLevel}` : ""}
        </span>
      )}
    </button>
  );
}

export function SkuStockTable({
  searchFilter = "",
  categoryFilter = "",
  onEditProduct,
}: SkuStockTableProps) {
  const [products, setProducts] = useState<SkuProduct[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockMap, setStockMap] = useState<StockMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ active: "true" });
      if (searchFilter) params.set("search", searchFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const [productsRes, locationsRes] = await Promise.all([
        fetch(`/api/platform/sku?${params}`),
        fetch("/api/platform/locations"),
      ]);

      if (!productsRes.ok || !locationsRes.ok) {
        setError("Kunne ikke hente data — prøv igen");
        return;
      }

      const productsData: SkuProduct[] = await productsRes.json();
      const locationsData: Location[] = await locationsRes.json();

      setProducts(productsData);
      setLocations(locationsData);

      // Fetch stock for each location
      const stockEntries: StockEntry[] = [];
      await Promise.all(
        locationsData.map(async (loc) => {
          const res = await fetch(`/api/platform/sku-stock?location_id=${loc.id}`);
          if (res.ok) {
            const entries: StockEntry[] = await res.json();
            stockEntries.push(...entries);
          }
        }),
      );

      // Build map
      const map: StockMap = {};
      for (const entry of stockEntries) {
        if (!map[entry.product_id]) map[entry.product_id] = {};
        map[entry.product_id][entry.location_id] = entry;
      }
      setStockMap(map);
    } catch {
      setError("Netværksfejl — prøv igen");
    } finally {
      setLoading(false);
    }
  }, [searchFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleStockSaved(entry: StockEntry) {
    setStockMap((prev) => ({
      ...prev,
      [entry.product_id]: {
        ...prev[entry.product_id],
        [entry.location_id]: entry,
      },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-stone-400">
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
        Indlæser...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white py-16 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
          <svg
            className="h-6 w-6 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-600">Ingen produkter fundet</p>
        <p className="mt-1 text-xs text-stone-400">
          {searchFilter || categoryFilter ? "Prøv at ændre filtrene" : "Tilføj dit første SKU produkt"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              Produkt
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              EAN
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              Mærke
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              Kategori
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">
              Salgspris
            </th>
            {locations.map((loc) => (
              <th
                key={loc.id}
                className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                <span className="block">{loc.name}</span>
                <span className="block text-[10px] font-normal normal-case text-stone-400 capitalize">
                  {loc.type}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product, idx) => (
            <tr
              key={product.id}
              className={[
                "border-b border-stone-100 transition last:border-0",
                idx % 2 === 0 ? "bg-white" : "bg-stone-50/40",
                onEditProduct ? "cursor-pointer hover:bg-green-eco/5" : "",
              ].join(" ")}
              onClick={() => onEditProduct?.(product)}
            >
              <td className="px-4 py-3">
                <span className="font-medium text-stone-800">{product.title}</span>
              </td>
              <td className="px-4 py-3">
                {product.ean ? (
                  <span className="font-mono text-xs text-stone-500">{product.ean}</span>
                ) : (
                  <span className="text-stone-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {product.brand ? (
                  <span className="text-stone-600">{product.brand}</span>
                ) : (
                  <span className="text-stone-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {product.category ? (
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                    {CATEGORY_LABELS[product.category] ?? product.category}
                  </span>
                ) : (
                  <span className="text-stone-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium text-stone-800">
                {formatDKK(product.selling_price)}
              </td>
              {locations.map((loc) => (
                <td
                  key={loc.id}
                  className="px-4 py-3 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <StockCell
                    productId={product.id}
                    locationId={loc.id}
                    stockMap={stockMap}
                    onSaved={handleStockSaved}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
