"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProductTemplate } from "@/lib/supabase/platform-types";
import { formatDKK } from "@/lib/platform/format";

interface Props {
  onEdit: (template: ProductTemplate) => void;
}

export function ProductTemplateList({ onEdit }: Props) {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (brandFilter) params.set("brand", brandFilter);
    if (categoryFilter) params.set("category", categoryFilter);

    const res = await fetch(`/api/platform/templates?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [search, brandFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = statusFilter
    ? templates.filter((t) => t.status === statusFilter)
    : templates;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søg efter model…"
          className="w-64 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">Alle kategorier</option>
          <option value="iphone">iPhone</option>
          <option value="smartphone">Smartphone</option>
          <option value="ipad">iPad</option>
          <option value="tablet">Tablet</option>
          <option value="laptop">Laptop</option>
          <option value="smartwatch">Smartwatch</option>
          <option value="console">Konsol</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">Alle statuser</option>
          <option value="published">Publiceret</option>
          <option value="draft">Kladde</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-stone-400">
          Ingen produktskabeloner fundet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                <th className="px-4 py-3">Billede</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Lagre</th>
                <th className="px-4 py-3">Pris (A)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3">
                    {t.images?.[0] ? (
                      <img
                        src={t.images[0]}
                        alt={t.display_name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {t.display_name}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{t.brand}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {t.storage_options?.join(", ") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {t.base_price_a ? formatDKK(t.base_price_a) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.status === "published"
                          ? "bg-green-50 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {t.status === "published" ? "Publiceret" : "Kladde"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEdit(t)}
                      className="text-xs font-medium text-green-600 hover:underline"
                    >
                      Rediger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
