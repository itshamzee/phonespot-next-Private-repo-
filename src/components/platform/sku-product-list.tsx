"use client";

import { useState, useEffect, useCallback } from "react";
import type { SkuProduct } from "@/lib/supabase/platform-types";
import { formatDKK } from "@/lib/platform/format";
import { BulkEditor } from "@/components/platform/bulk-editor";

interface Props {
  onEdit: (product: SkuProduct) => void;
  lockedCategory?: string;
  lockedSubcategory?: string;
  excludeSubcategory?: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface StockRow {
  location_id: string;
  quantity: number;
  location: { id: string; name: string } | null;
}

interface TemplateLink {
  sku_product_id: string;
  template: { id: string; display_name: string; brand?: string } | null;
}

type ProductWithStock = SkuProduct & { stock?: StockRow[] };

const SKU_CATEGORIES = [
  { value: "iphone", label: "iPhone" },
  { value: "ipad", label: "iPad" },
  { value: "smartphone", label: "Smartphone" },
  { value: "laptop", label: "Laptop" },
  { value: "smartwatch", label: "Smartwatch" },
  { value: "accessory", label: "Tilbehør" },
  { value: "skaermbeskyttelse", label: "Skærmbeskyttelse" },
  { value: "other", label: "Andet" },
];

const CATEGORY_LABELS: Record<string, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  smartphone: "Smartphone",
  laptop: "Laptop",
  smartwatch: "Smartwatch",
  accessory: "Tilbehør",
  skaermbeskyttelse: "Skærmbeskyttelse",
  other: "Andet",
};

const SUBCATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  cover: { label: "Case", color: "bg-blue-100 text-blue-700" },
  screen_protector: { label: "Skærm", color: "bg-purple-100 text-purple-700" },
  charger: { label: "Oplader", color: "bg-yellow-100 text-yellow-700" },
  cable: { label: "Kabel", color: "bg-green-100 text-green-700" },
  powerbank: { label: "Powerbank", color: "bg-orange-100 text-orange-700" },
  audio: { label: "Lyd", color: "bg-pink-100 text-pink-700" },
  "spare-part": { label: "Reservedel", color: "bg-red-100 text-red-700" },
  other: { label: "Andet", color: "bg-gray-100 text-gray-700" },
};

// Attributes we want to show as inline tags
const DISPLAY_ATTRIBUTES = ["connector_type", "length", "wattage", "color", "material", "compatibility"];

function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) return <span className="text-stone-300">0</span>;
  if (qty <= 2) return <span className="font-semibold text-amber-600">{qty}</span>;
  return <span className="font-semibold text-green-700">{qty}</span>;
}

function AttributeTags({ attributes }: { attributes?: Record<string, string | number | boolean | null> }) {
  if (!attributes) return null;
  const tags: string[] = [];
  for (const key of DISPLAY_ATTRIBUTES) {
    const val = attributes[key];
    if (val != null && val !== "" && val !== false) {
      tags.push(String(val));
    }
  }
  if (tags.length === 0) return null;
  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <span key={i} className="text-[10px] text-stone-400">
          {i > 0 && <span className="mr-1">·</span>}
          {tag}
        </span>
      ))}
    </div>
  );
}

function CompatBadges({ templates }: { templates: string[] }) {
  if (templates.length === 0) return <span className="text-stone-300">—</span>;
  if (templates.length <= 2) {
    return (
      <div className="flex flex-wrap gap-1">
        {templates.map((name, i) => (
          <span key={i} className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
            {name}
          </span>
        ))}
      </div>
    );
  }
  return (
    <span
      className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 cursor-default"
      title={templates.join(", ")}
    >
      {templates[0]} +{templates.length - 1}
    </span>
  );
}

export function SkuProductList({ onEdit, lockedCategory, lockedSubcategory, excludeSubcategory }: Props) {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [templates, setTemplates] = useState<{ id: string; display_name: string }[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compatMap, setCompatMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/platform/sku/brands").then(r => r.ok ? r.json() : []).then(setBrands);
    fetch("/api/platform/sku/compatible-models").then(r => r.ok ? r.json() : []).then((data: any[]) => {
      if (Array.isArray(data)) setTemplates(data.map(t => ({ id: t.id, display_name: t.display_name })));
    });
    fetch("/api/platform/locations").then(r => r.ok ? r.json() : []).then((data: any[]) => {
      if (Array.isArray(data)) setLocations(data);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("active", "true");
    if (search) params.set("search", search);
    const cat = lockedCategory || categoryFilter;
    if (cat) params.set("category", cat);
    if (lockedSubcategory) params.set("subcategory", lockedSubcategory);
    if (brandFilter) params.set("brand", brandFilter);
    if (templateFilter) params.set("template_id", templateFilter);
    if (locationFilter) params.set("location_id", locationFilter);

    const res = await fetch(`/api/platform/sku?${params}`);
    if (res.ok) {
      const raw = await res.json();
      let data: ProductWithStock[] = Array.isArray(raw) ? raw : [];
      if (excludeSubcategory) {
        data = data.filter((p) => p.subcategory !== excludeSubcategory);
      }
      setProducts(data);
      setSelected(new Set());

      // Fetch compatibility data for all products on this page
      const ids = data.map(p => p.id);
      if (ids.length > 0) {
        try {
          const compatRes = await fetch(`/api/platform/sku-product-templates?sku_product_ids=${ids.join(",")}`);
          if (compatRes.ok) {
            const links: TemplateLink[] = await compatRes.json();
            const map: Record<string, string[]> = {};
            for (const link of links) {
              if (!link.template) continue;
              if (!map[link.sku_product_id]) map[link.sku_product_id] = [];
              map[link.sku_product_id].push(link.template.display_name);
            }
            setCompatMap(map);
          }
        } catch {
          // Compatibility data is non-critical
        }
      } else {
        setCompatMap({});
      }
    }
    setLoading(false);
  }, [search, categoryFilter, brandFilter, templateFilter, statusFilter, locationFilter, lockedCategory, lockedSubcategory, excludeSubcategory]);

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  useEffect(() => {
    load();
  }, [load]);

  // Apply client-side filters
  let filtered = statusFilter
    ? products.filter((p) => p.status === statusFilter)
    : products;

  if (subcategoryFilter) {
    filtered = filtered.filter((p) => p.subcategory === subcategoryFilter);
  }

  const hasFilters = search || categoryFilter || subcategoryFilter || brandFilter || templateFilter || statusFilter || locationFilter;

  // Get stock qty for a product at a specific location
  function getStock(p: ProductWithStock, locationId: string): number {
    return p.stock?.find(s => s.location_id === locationId)?.quantity ?? 0;
  }

  // Determine which locations to show as columns (only store/warehouse locations present in data)
  const stockLocationIds = locations.filter(l => l.type === "store" || l.type === "warehouse");

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søg produkt, EAN, mærke…"
          className="w-56 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
        />
        {!lockedCategory && (
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setTemplateFilter(""); }}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          >
            <option value="">Alle kategorier</option>
            {SKU_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        )}
        <select
          value={subcategoryFilter}
          onChange={(e) => setSubcategoryFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">Alle typer</option>
          {Object.entries(SUBCATEGORY_LABELS).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {brands.length > 0 && (
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          >
            <option value="">Alle mærker</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}
        {templates.length > 0 && (
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          >
            <option value="">Alle enheder</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.display_name}</option>
            ))}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">Alle statuser</option>
          <option value="published">Publiceret</option>
          <option value="draft">Kladde</option>
        </select>
        {stockLocationIds.length > 0 && (
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          >
            <option value="">Alle lokationer</option>
            {stockLocationIds.map((l) => (
              <option key={l.id} value={l.id}>På lager: {l.name}</option>
            ))}
          </select>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(""); setCategoryFilter(""); setSubcategoryFilter(""); setBrandFilter(""); setTemplateFilter(""); setStatusFilter(""); setLocationFilter(""); }}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-500 hover:text-stone-700"
          >
            Nulstil
          </button>
        )}
      </div>

      {/* Bulk editor floating bar */}
      <BulkEditor
        selectedIds={Array.from(selected)}
        onComplete={() => { setSelected(new Set()); load(); }}
        onClear={() => setSelected(new Set())}
      />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-stone-400">
          Ingen SKU-produkter fundet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="hidden sm:table-cell px-4 py-3">Billede</th>
                <th className="px-4 py-3">Titel</th>
                <th className="hidden md:table-cell px-4 py-3">Type</th>
                <th className="hidden lg:table-cell px-4 py-3">Passer til</th>
                <th className="px-4 py-3">Salgspris</th>
                {stockLocationIds.map(l => (
                  <th key={l.id} className="hidden lg:table-cell px-4 py-3 text-center">{l.name}</th>
                ))}
                <th className="hidden sm:table-cell px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((p) => (
                <tr key={p.id} className={`hover:bg-stone-50/50 ${selected.has(p.id) ? "bg-red-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.title}
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
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-800">{p.title}</div>
                    <AttributeTags attributes={p.attributes} />
                  </td>
                  <td className="hidden md:table-cell px-4 py-3">
                    {p.subcategory && SUBCATEGORY_LABELS[p.subcategory] ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SUBCATEGORY_LABELS[p.subcategory].color}`}>
                        {SUBCATEGORY_LABELS[p.subcategory].label}
                      </span>
                    ) : p.category ? (
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3">
                    <CompatBadges templates={compatMap[p.id] ?? []} />
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {formatDKK(p.selling_price)}
                  </td>
                  {stockLocationIds.map(l => (
                    <td key={l.id} className="hidden lg:table-cell px-4 py-3 text-center text-xs">
                      <StockBadge qty={getStock(p, l.id)} />
                    </td>
                  ))}
                  <td className="hidden sm:table-cell px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === "published"
                          ? "bg-green-50 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {p.status === "published" ? "Publiceret" : "Kladde"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEdit(p)}
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
