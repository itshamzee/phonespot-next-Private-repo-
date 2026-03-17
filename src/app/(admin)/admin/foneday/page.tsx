"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface CatalogProduct {
  id: string;
  foneday_sku: string;
  title: string;
  category: string | null;
  quality: string | null;
  model_brand: string | null;
  suitable_for: string | null;
  product_brand: string | null;
  price_eur: number;
  price_dkk: number | null;
  in_stock: boolean;
  link: { foneday_catalog_id: string; accessory_id: string | null; sku_product_id: string | null; use_type: string } | null;
}

interface FonedaySettings {
  eur_dkk_rate: number;
  in_stock_qty: number;
}

type Tab = "katalog" | "linkede" | "mappings" | "indstillinger";

const QUICK_FILTERS = [
  { label: "Alle tilbehoer", categories: "", icon: "📦" },
  { label: "Cases", categories: "Softcase", icon: "📱" },
  { label: "Book Cases", categories: "Booktypes Case", icon: "📖" },
  { label: "Hard Cases", categories: "Hardcase", icon: "🛡" },
  { label: "Panserglas", categories: "Edge to Edge", icon: "🔒" },
  { label: "Privacy Glas", categories: "Privacy Glass", icon: "👁" },
  { label: "Kabler", categories: "Cables", icon: "🔌" },
  { label: "Lightning", categories: "Lightning", icon: "⚡" },
  { label: "USB-C", categories: "USB-C", icon: "🔗" },
  { label: "Opladere", categories: "Charger", icon: "🔋" },
  { label: "Traadloes", categories: "Wireless", icon: "📡" },
  { label: "Magsafe", categories: "Magsafe", icon: "🧲" },
  { label: "Powerbank", categories: "Powerbank", icon: "🔋" },
  { label: "Holdere", categories: "Car holder", icon: "🚗" },
  { label: "Cykelholder", categories: "Bike/Motor Holder", icon: "🚲" },
  { label: "Audio", categories: "Earphones", icon: "🎧" },
  { label: "AirPods", categories: "AirPods", icon: "🎵" },
] as const;

function formatDKK(oere: number): string {
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(oere / 100);
}

function formatEUR(eur: number): string {
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(eur);
}

interface Location {
  id: string;
  name: string;
  type: string;
}

// ---- Link Modal ----
function LinkModal({
  product,
  onClose,
  onLinked,
}: {
  product: CatalogProduct;
  onClose: () => void;
  onLinked: () => void;
}) {
  const costDkk = product.price_dkk ?? 0;
  const [markupPct, setMarkupPct] = useState(40);
  const [customPriceKr, setCustomPriceKr] = useState<number | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/locations")
      .then((r) => r.json())
      .then((data: Location[]) => {
        const store = data.filter((l) => l.type === "store" || l.type === "warehouse");
        setLocations(store);
        const initial: Record<string, number> = {};
        store.forEach((l) => { initial[l.id] = 0; });
        setStockMap(initial);
      });
  }, []);

  const calculatedPriceOere = customPriceKr != null ? customPriceKr * 100 : Math.round(costDkk * (1 + markupPct / 100));

  async function handleConfirm() {
    setLinking(true);
    setError(null);
    const linkRes = await fetch("/api/admin/foneday/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        foneday_sku: product.foneday_sku,
        use_type: "retail",
        markup_percentage: customPriceKr != null ? 0 : markupPct,
        store_id: "00000000-0000-0000-0000-000000000000",
      }),
    });

    if (!linkRes.ok) {
      const body = await linkRes.json().catch(() => ({}));
      setError(body.error ?? "Link mislykkedes");
      setLinking(false);
      return;
    }

    const { sku_product_id } = await linkRes.json();

    // Write stock per location
    if (sku_product_id) {
      await Promise.all(
        Object.entries(stockMap)
          .filter(([, qty]) => qty > 0)
          .map(([location_id, quantity]) =>
            fetch("/api/platform/sku-stock", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ product_id: sku_product_id, location_id, quantity }),
            })
          )
      );
    }

    setLinking(false);
    onLinked();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-charcoal">Link produkt</h3>
        <p className="mt-1 text-sm text-charcoal/60 line-clamp-2">{product.title}</p>
        {product.suitable_for && (
          <p className="mt-1 text-xs text-charcoal/40">Passer til: {product.suitable_for}</p>
        )}

        <div className="mt-5 space-y-4">
          {/* Cost price */}
          <div className="flex items-center justify-between rounded-lg bg-cream px-4 py-3">
            <span className="text-sm text-charcoal/60">Indkoebspris (Foneday)</span>
            <span className="font-mono font-semibold">{formatEUR(product.price_eur)} = {formatDKK(costDkk)}</span>
          </div>

          {/* Markup */}
          <div>
            <label className="block text-sm font-semibold text-charcoal">Markup %</label>
            <div className="mt-1 flex items-center gap-3">
              {[30, 40, 50, 60, 80, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => { setMarkupPct(pct); setCustomPriceKr(null); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    markupPct === pct && customPriceKr == null
                      ? "bg-charcoal text-white"
                      : "border border-sand bg-white text-charcoal/70 hover:border-charcoal/30"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Custom price override */}
          <div>
            <label className="block text-sm font-semibold text-charcoal">Eller fast salgspris (DKK)</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                placeholder={String(Math.round(costDkk * (1 + markupPct / 100) / 100))}
                value={customPriceKr ?? ""}
                onChange={(e) => { setCustomPriceKr(e.target.value ? Number(e.target.value) : null); }}
                className="w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
              />
              <span className="text-sm text-charcoal/50 whitespace-nowrap">kr.</span>
            </div>
          </div>

          {/* Selling price preview */}
          <div className="flex items-center justify-between rounded-lg bg-green-eco/10 px-4 py-3">
            <span className="text-sm font-semibold text-green-eco">Salgspris</span>
            <span className="font-mono text-lg font-bold text-green-eco">{formatDKK(calculatedPriceOere)}</span>
          </div>

          {/* Store stock per location */}
          {locations.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">Antal paa lager</label>
              <div className={`grid gap-3 ${locations.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
                {locations.map((loc) => (
                  <div key={loc.id}>
                    <label className="block text-xs text-charcoal/50 mb-1">{loc.name}</label>
                    <input
                      type="number"
                      min={0}
                      value={stockMap[loc.id] ?? 0}
                      onChange={(e) => setStockMap((prev) => ({ ...prev, [loc.id]: Math.max(0, Number(e.target.value)) }))}
                      className="w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-charcoal/40">Online lager styres automatisk via Foneday sync</p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-sand px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-cream"
          >
            Annuller
          </button>
          <button
            onClick={handleConfirm}
            disabled={linking}
            className="flex-1 rounded-lg bg-green-eco px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-eco/90 disabled:opacity-50"
          >
            {linking ? "Linker..." : "Tilfoj til webshop"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CatalogTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [linked, setLinked] = useState("false");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [linkModalProduct, setLinkModalProduct] = useState<CatalogProduct | null>(null);
  const [bulkLinking, setBulkLinking] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeFilter) params.set("category", activeFilter);
    if (linked) params.set("linked", linked);
    params.set("in_stock", "true");
    params.set("page", String(page));
    params.set("limit", "50");

    const res = await fetch(`/api/admin/foneday/catalog?${params}`);
    const data = await res.json();
    setProducts(data.data ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, activeFilter, linked, page]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  function handleSearchChange(value: string) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  }

  async function handleBulkLink() {
    if (!activeFilter) return;
    setBulkLinking(true);
    setBulkResult(null);
    const res = await fetch("/api/admin/foneday/link/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: { category: activeFilter },
        use_type: "retail",
        markup_percentage: 40,
        store_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    const data = await res.json();
    setBulkResult(`${data.linked} linket, ${data.skipped} sprunget over${data.errors?.length ? `, ${data.errors.length} fejl` : ""}`);
    setBulkLinking(false);
    fetchCatalog();
  }

  return (
    <div className="space-y-4">
      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.categories}
            onClick={() => { setActiveFilter(f.categories); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeFilter === f.categories
                ? "bg-charcoal text-white"
                : "border border-sand bg-white text-charcoal/70 hover:border-charcoal/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + link status + bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Soeg titel, SKU eller enhed..."
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="min-w-[250px] rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
        />
        <select
          value={linked}
          onChange={(e) => { setLinked(e.target.value); setPage(1); }}
          className="rounded-lg border border-sand bg-white px-3 py-2 text-sm"
        >
          <option value="false">Ikke linkede</option>
          <option value="true">Allerede linkede</option>
          <option value="">Alle</option>
        </select>

        {activeFilter && linked === "false" && (
          <button
            onClick={handleBulkLink}
            disabled={bulkLinking || total === 0}
            className="rounded-lg bg-green-eco px-4 py-2 text-sm font-semibold text-white hover:bg-green-eco/90 disabled:opacity-50"
          >
            {bulkLinking ? "Linker..." : `Link alle ${activeFilter} (${total})`}
          </button>
        )}

        <span className="ml-auto text-sm text-charcoal/50">{total} produkter</span>
      </div>

      {bulkResult && (
        <div className="rounded-lg bg-green-eco/10 px-4 py-2 text-sm text-green-eco">{bulkResult}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-charcoal/40">Indlaeser katalog...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-charcoal/40">Ingen produkter fundet</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Passer til</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Pris (EUR)</th>
                <th className="px-4 py-3 text-right">Pris (DKK)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-charcoal max-w-sm">{p.title}</div>
                    <div className="text-xs text-charcoal/40 font-mono">{p.foneday_sku}</div>
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">{p.suitable_for ?? "Universal"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sand/50 px-2 py-0.5 text-xs">{p.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatEUR(p.price_eur)}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.price_dkk ? formatDKK(p.price_dkk) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {p.link ? (
                      <span className="rounded-full bg-green-eco/10 px-2 py-0.5 text-xs font-medium text-green-eco">Linket</span>
                    ) : (
                      <button
                        onClick={() => setLinkModalProduct(p)}
                        className="rounded-lg bg-green-eco px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-eco/90"
                      >
                        Link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-sand px-3 py-1.5 text-sm disabled:opacity-30">Forrige</button>
          <span className="text-sm text-charcoal/60">Side {page} af {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 50)} className="rounded-lg border border-sand px-3 py-1.5 text-sm disabled:opacity-30">Naeste</button>
        </div>
      )}

      {/* Link modal */}
      {linkModalProduct && (
        <LinkModal
          product={linkModalProduct}
          onClose={() => setLinkModalProduct(null)}
          onLinked={() => { setLinkModalProduct(null); fetchCatalog(); }}
        />
      )}
    </div>
  );
}

// ---- Inline editable cell (click to edit, enter to save) ----
function EditableCell({
  value,
  suffix,
  onSave,
}: {
  value: number;
  suffix?: string;
  onSave: (v: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  async function commit() {
    const n = parseInt(draft, 10);
    if (isNaN(n) || n < 0) { setDraft(String(value)); setEditing(false); return; }
    if (n === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(n);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
        disabled={saving}
        className="w-16 rounded-lg border border-green-eco/30 bg-green-eco/5 px-2 py-1 text-center text-sm font-semibold focus:outline-none disabled:opacity-50"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="group flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-green-eco/5"
    >
      <span className="text-sm font-semibold tabular-nums">{value}{suffix}</span>
      <svg className="h-3 w-3 text-charcoal/20 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      </svg>
    </button>
  );
}

// ---- Linked Tab with full management ----
function LinkedTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  // stockData: sku_product_id → location_id → quantity
  const [stockData, setStockData] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load locations once
  useEffect(() => {
    fetch("/api/platform/locations")
      .then((r) => r.json())
      .then((data: Location[]) => setLocations(data.filter((l) => l.type === "store" || l.type === "warehouse")));
  }, []);

  const fetchLinked = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ linked: "true", limit: "200" });
    if (search) params.set("search", search);
    const [catalogRes, stockRes] = await Promise.all([
      fetch(`/api/admin/foneday/catalog?${params}`).then((r) => r.json()),
      fetch("/api/platform/sku-stock").then((r) => r.json()),
    ]);
    setProducts(catalogRes.data ?? []);

    // Build stock map: sku_product_id → location_id → quantity
    const map: Record<string, Record<string, number>> = {};
    if (Array.isArray(stockRes)) {
      for (const row of stockRes) {
        if (!map[row.product_id]) map[row.product_id] = {};
        map[row.product_id][row.location_id] = row.quantity;
      }
    }
    setStockData(map);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchLinked(); }, [fetchLinked]);

  function handleSearch(value: string) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(value), 400);
  }

  async function updateSkuStock(skuProductId: string, locationId: string, quantity: number) {
    await fetch("/api/platform/sku-stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: skuProductId, location_id: locationId, quantity }),
    });
    setStockData((prev) => ({
      ...prev,
      [skuProductId]: { ...(prev[skuProductId] ?? {}), [locationId]: quantity },
    }));
  }

  async function handleUnlink(sku: string) {
    await fetch(`/api/admin/foneday/link?foneday_sku=${encodeURIComponent(sku)}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.foneday_sku !== sku));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Soeg SKU, titel eller enhed..."
          defaultValue={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="min-w-[300px] rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
        />
        <span className="ml-auto text-sm text-charcoal/50">{products.length} linkede produkter</span>
      </div>

      <p className="text-xs text-charcoal/40">Klik paa et tal for at redigere. Brug soegning til at finde produkter via SKU naar du taeller op.</p>

      {loading ? (
        <div className="py-12 text-center text-charcoal/40">Indlaeser...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-charcoal/40">
          {search ? "Ingen produkter matcher din soegning" : "Ingen linkede produkter endnu. Gaa til Katalog og link produkter."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Passer til</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Pris</th>
                {locations.map((loc) => (
                  <th key={loc.id} className="px-4 py-3 text-center">{loc.name}</th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {products.map((p) => {
                const skuId = p.link?.sku_product_id ?? null;
                return (
                  <tr key={p.id} className="hover:bg-cream/50">
                    <td className="px-4 py-3">
                      <div className="font-medium max-w-xs">{p.title}</div>
                      <div className="text-xs text-charcoal/40 font-mono">{p.foneday_sku}</div>
                    </td>
                    <td className="px-4 py-3 text-charcoal/70 text-xs">{p.suitable_for ?? "Universal"}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-sand/50 px-2 py-0.5 text-xs">{p.category}</span></td>
                    <td className="px-4 py-3 text-right font-mono">{p.price_dkk ? formatDKK(p.price_dkk) : "—"}</td>
                    {locations.map((loc) => (
                      <td key={loc.id} className="px-4 py-3">
                        <div className="flex justify-center">
                          {skuId ? (
                            <EditableCell
                              value={stockData[skuId]?.[loc.id] ?? 0}
                              onSave={(v) => updateSkuStock(skuId, loc.id, v)}
                            />
                          ) : <span className="text-charcoal/30">—</span>}
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleUnlink(p.foneday_sku)} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50">Fjern</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MappingsTab() {
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/foneday/mappings").then((r) => r.json()).then((data) => { setMappings(data); setLoading(false); });
  }, []);

  if (loading) return <div className="py-8 text-center text-charcoal/40">Indlaeser...</div>;

  const categoryMaps = mappings.filter((m: any) => m.map_type === "category");
  const qualityMaps = mappings.filter((m: any) => m.map_type === "quality");

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-charcoal/60">Kategori-mapping ({categoryMaps.length})</h3>
        <div className="overflow-x-auto rounded-xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
              <tr><th className="px-4 py-3">Foneday</th><th className="px-4 py-3">PhoneSpot</th><th className="px-4 py-3">Label</th></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {categoryMaps.map((m: any) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.foneday_value}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.phonespot_value}</td>
                  <td className="px-4 py-3 text-charcoal/60">{m.display_label ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-charcoal/60">Kvalitets-mapping ({qualityMaps.length})</h3>
        <div className="overflow-x-auto rounded-xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
              <tr><th className="px-4 py-3">Foneday</th><th className="px-4 py-3">PhoneSpot</th><th className="px-4 py-3">Label</th></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {qualityMaps.map((m: any) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.foneday_value}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.phonespot_value}</td>
                  <td className="px-4 py-3 text-charcoal/60">{m.display_label ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<FonedaySettings>({ eur_dkk_rate: 745, in_stock_qty: 99 });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => { fetch("/api/admin/foneday/settings").then((r) => r.json()).then(setSettings); }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/foneday/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setSaving(false);
  }

  async function triggerSync() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/admin/foneday/sync", { method: "POST" });
    const data = await res.json();
    setSyncResult(`Synced: ${data.synced}, Nye: ${data.new}, Manglende: ${data.missing}, Opdaterede links: ${data.linked_updated}${data.errors?.length ? `, Fejl: ${data.errors.length}` : ""}`);
    setSyncing(false);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <label className="block text-sm font-semibold text-charcoal">EUR/DKK kurs (x100)</label>
        <p className="text-xs text-charcoal/50 mb-1">745 = 7,45 DKK per EUR</p>
        <input type="number" value={settings.eur_dkk_rate} onChange={(e) => setSettings({ ...settings, eur_dkk_rate: Number(e.target.value) })} className="w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-green-eco focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-charcoal">Standard lagerantal</label>
        <p className="text-xs text-charcoal/50 mb-1">Antal der saettes naar Foneday siger &quot;paa lager&quot;</p>
        <input type="number" value={settings.in_stock_qty} onChange={(e) => setSettings({ ...settings, in_stock_qty: Number(e.target.value) })} className="w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-green-eco focus:outline-none" />
      </div>
      <button onClick={save} disabled={saving} className="rounded-lg bg-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal/90 disabled:opacity-50">{saving ? "Gemmer..." : "Gem indstillinger"}</button>
      <hr className="border-sand" />
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-2">Manuel sync</h3>
        <button onClick={triggerSync} disabled={syncing} className="rounded-lg bg-green-eco px-4 py-2 text-sm font-semibold text-white hover:bg-green-eco/90 disabled:opacity-50">{syncing ? "Synkroniserer..." : "Sync nu"}</button>
        {syncResult && <p className="mt-3 rounded-lg bg-cream p-3 text-sm text-charcoal/70">{syncResult}</p>}
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: "katalog", label: "Katalog" },
  { key: "linkede", label: "Linkede" },
  { key: "mappings", label: "Mappings" },
  { key: "indstillinger", label: "Indstillinger" },
];

export default function FonedayAdminPage() {
  const [tab, setTab] = useState<Tab>("katalog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Foneday Integration</h1>
        <p className="text-sm text-charcoal/50">Administrer Foneday produktkatalog, links og indstillinger</p>
      </div>
      <div className="flex gap-1 rounded-xl bg-cream p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? "bg-white text-charcoal shadow-sm" : "text-charcoal/50 hover:text-charcoal"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "katalog" && <CatalogTab />}
      {tab === "linkede" && <LinkedTab />}
      {tab === "mappings" && <MappingsTab />}
      {tab === "indstillinger" && <SettingsTab />}
    </div>
  );
}
