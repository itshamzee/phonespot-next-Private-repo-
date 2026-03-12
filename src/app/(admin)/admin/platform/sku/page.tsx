"use client";

import { useState, useCallback } from "react";
import { SkuProductForm } from "@/components/platform/sku-product-form";
import { SkuStockTable } from "@/components/platform/sku-stock-table";

type PanelMode = "none" | "create" | "edit";

export default function SkuPage() {
  const [panelMode, setPanelMode] = useState<PanelMode>("none");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tableKey, setTableKey] = useState(0);

  function openCreate() {
    setEditingProduct(null);
    setPanelMode("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(product: any) {
    setEditingProduct(product);
    setPanelMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closePanel() {
    setPanelMode("none");
    setEditingProduct(null);
  }

  function handleSaved(product: any) {
    closePanel();
    // Refresh table
    setTableKey((k) => k + 1);
  }

  const handleEditProduct = useCallback((product: any) => {
    openEdit(product);
  }, []);

  const CATEGORIES = [
    { value: "", label: "Alle kategorier" },
    { value: "covers", label: "Covers" },
    { value: "screen_protectors", label: "Skærmbeskyttere" },
    { value: "cables", label: "Kabler" },
    { value: "chargers", label: "Opladere" },
    { value: "earphones", label: "Øretelefoner" },
    { value: "other", label: "Andet" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Tilbehør &amp; Reservedele</h1>
          <p className="mt-1 text-sm text-stone-400">
            Administrer SKU-produkter og lagerbeholdning på tværs af lokationer
          </p>
        </div>

        {panelMode === "none" && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-green-eco px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-eco/20 transition hover:brightness-110"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tilføj produkt
          </button>
        )}
      </div>

      {/* Inline form panel */}
      {panelMode !== "none" && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          {/* Panel header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-eco/10">
                <svg
                  className="h-4 w-4 text-green-eco"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {panelMode === "create" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                    />
                  )}
                </svg>
              </div>
              <h2 className="text-base font-bold text-stone-800">
                {panelMode === "create" ? "Nyt produkt" : `Redigér: ${editingProduct?.title}`}
              </h2>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
              aria-label="Luk"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <SkuProductForm
            product={panelMode === "edit" ? editingProduct : undefined}
            onSaved={handleSaved}
            onCancel={closePanel}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg efter produkt, EAN, mærke..."
            className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
          />
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition sm:w-56"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        {/* Active filters badge */}
        {(search || category) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("");
            }}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 transition hover:bg-stone-50 hover:text-stone-700"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Nulstil
          </button>
        )}
      </div>

      {/* Stock table */}
      <SkuStockTable
        key={tableKey}
        searchFilter={search}
        categoryFilter={category}
        onEditProduct={handleEditProduct}
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-xs text-stone-500">
        <span className="font-medium text-stone-600">Lagerfarver:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-200" />
          Under minimum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-200" />
          På minimum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-200" />
          Over minimum
        </span>
        <span className="ml-auto text-stone-400">Klik på et antal for at redigere</span>
      </div>
    </div>
  );
}
