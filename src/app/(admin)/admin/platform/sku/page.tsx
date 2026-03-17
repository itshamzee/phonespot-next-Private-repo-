"use client";

import { useState, useCallback, useEffect } from "react";
import { SkuProductForm } from "@/components/platform/sku-product-form";
import { SkuStockTable } from "@/components/platform/sku-stock-table";

type PanelMode = "none" | "create" | "edit";

export default function SkuPage() {
  const [panelMode, setPanelMode] = useState<PanelMode>("none");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [templates, setTemplates] = useState<{ id: string; display_name: string; brand: string | null; category: string }[]>([]);
  const [tableKey, setTableKey] = useState(0);

  useEffect(() => {
    fetch("/api/platform/sku/brands")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBrands);
    fetch("/api/platform/sku/compatible-models")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setTemplates(
            data.map((t) => ({
              id: t.id,
              display_name: t.display_name,
              brand: t.brand,
              category: t.category,
            }))
          );
        }
      });
  }, []);

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

  function handleSaved() {
    closePanel();
    setTableKey((k) => k + 1);
  }

  const handleEditProduct = useCallback((product: any) => {
    openEdit(product);
  }, []);

  const CATEGORIES = [
    { value: "", label: "Alle kategorier" },
    { value: "iphone", label: "iPhone" },
    { value: "ipad", label: "iPad" },
    { value: "smartphone", label: "Smartphone" },
    { value: "laptop", label: "Laptop" },
    { value: "smartwatch", label: "Smartwatch" },
    { value: "accessory", label: "Tilbehør" },
    { value: "skaermbeskyttelse", label: "Skærmbeskyttelse" },
    { value: "other", label: "Andet" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Tilbehør & Reservedele
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            Administrer SKU-produkter og lagerbeholdning på tværs af lokationer
          </p>
        </div>

        {panelMode === "none" && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tilføj produkt
          </button>
        )}
      </div>

      {/* Inline form panel */}
      {panelMode !== "none" && (
        <div className="rounded-2xl border border-black/[0.04] bg-charcoal/[0.015] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {panelMode === "create" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  )}
                </svg>
              </div>
              <h3 className="font-display text-base font-bold text-charcoal">
                {panelMode === "create" ? "Nyt produkt" : `Redig\ér: ${editingProduct?.title}`}
              </h3>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-lg p-1.5 text-charcoal/30 transition-colors hover:bg-charcoal/[0.06] hover:text-charcoal"
              aria-label="Luk"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <SkuProductForm
            product={panelMode === "edit" ? editingProduct : undefined}
            onSave={handleSaved}
            onCancel={closePanel}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-4 w-4 text-charcoal/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
            </svg>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg produkt, EAN, mærke..."
            className="w-full rounded-xl border border-black/[0.06] bg-white py-3 pl-11 pr-4 text-sm text-charcoal placeholder:text-charcoal/25 shadow-sm transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>

        {/* Category */}
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setTemplateId(""); }}
          className="rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-charcoal shadow-sm sm:w-48"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        {/* Brand */}
        {brands.length > 0 && (
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-charcoal shadow-sm sm:w-40"
          >
            <option value="">Alle mærker</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}

        {/* Compatible device */}
        {templates.length > 0 && (
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-charcoal shadow-sm sm:w-56"
          >
            <option value="">Alle enheder</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.display_name}</option>
            ))}
          </select>
        )}

        {/* Reset */}
        {(search || category || brand || templateId) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setCategory(""); setBrand(""); setTemplateId(""); }}
            className="flex items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm font-semibold text-charcoal/40 shadow-sm transition-all hover:text-charcoal/60"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
        brandFilter={brand}
        templateFilter={templateId}
        onEditProduct={handleEditProduct}
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-black/[0.04] bg-white px-4 py-3 text-xs text-charcoal/40 shadow-sm">
        <span className="font-bold text-charcoal/50">Lagerfarver:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-rose-200" />
          Under minimum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-200" />
          På minimum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-200" />
          Over minimum
        </span>
        <span className="ml-auto text-charcoal/25">Klik på et antal for at redigere</span>
      </div>
    </div>
  );
}
