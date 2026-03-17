"use client";

import { useEffect, useState, useCallback } from "react";

// Types
interface CatalogProduct {
  id: string;
  foneday_sku: string;
  title: string;
  category: string | null;
  quality: string | null;
  model_brand: string | null;
  price_eur: number;
  price_dkk: number | null;
  in_stock: boolean;
  link: { foneday_catalog_id: string; accessory_id: string | null; use_type: string } | null;
}

interface Mapping {
  id: string;
  map_type: "category" | "quality";
  foneday_value: string;
  phonespot_value: string;
  display_label: string | null;
}

interface FonedaySettings {
  eur_dkk_rate: number;
  in_stock_qty: number;
}

type Tab = "katalog" | "linkede" | "mappings" | "indstillinger";

function formatDKK(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

function formatEUR(eur: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(eur);
}

// ---- Catalog Tab ----
function CatalogTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [inStock, setInStock] = useState("true");
  const [linked, setLinked] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [linking, setLinking] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (inStock) params.set("in_stock", inStock);
    if (linked) params.set("linked", linked);
    params.set("page", String(page));
    params.set("limit", "50");

    const res = await fetch(`/api/admin/foneday/catalog?${params}`);
    const data = await res.json();
    setProducts(data.data ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, category, inStock, linked, page]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  async function handleLink(sku: string) {
    setLinking(sku);
    // For now, use a default store_id — in production this comes from the admin's session
    const res = await fetch("/api/admin/foneday/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        foneday_sku: sku,
        use_type: "retail",
        markup_percentage: 40,
        store_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    if (res.ok) {
      fetchCatalog();
    }
    setLinking(null);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Soeg titel eller SKU..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-lg border border-sand bg-white px-3 py-2 text-sm"
        >
          <option value="">Alle kategorier</option>
          <option value="Case">Case</option>
          <option value="Glass">Glass</option>
          <option value="Cables">Cables</option>
          <option value="Charger">Charger</option>
          <option value="Mount">Mount</option>
          <option value="Audio">Audio</option>
          <option value="Display">Display</option>
          <option value="Battery">Battery</option>
        </select>
        <select
          value={inStock}
          onChange={(e) => { setInStock(e.target.value); setPage(1); }}
          className="rounded-lg border border-sand bg-white px-3 py-2 text-sm"
        >
          <option value="">Alle</option>
          <option value="true">Paa lager</option>
          <option value="false">Ikke paa lager</option>
        </select>
        <select
          value={linked}
          onChange={(e) => { setLinked(e.target.value); setPage(1); }}
          className="rounded-lg border border-sand bg-white px-3 py-2 text-sm"
        >
          <option value="">Alle</option>
          <option value="true">Linkede</option>
          <option value="false">Ikke linkede</option>
        </select>
      </div>

      <p className="text-sm text-charcoal/50">{total} produkter fundet</p>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-charcoal/40">Indlaeser...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Titel</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Kvalitet</th>
                <th className="px-4 py-3">Pris (EUR)</th>
                <th className="px-4 py-3">Pris (DKK)</th>
                <th className="px-4 py-3">Lager</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-cream/50">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.foneday_sku}</td>
                  <td className="px-4 py-3">{p.category ?? "—"}</td>
                  <td className="px-4 py-3">{p.quality ?? "—"}</td>
                  <td className="px-4 py-3">{formatEUR(p.price_eur)}</td>
                  <td className="px-4 py-3">{p.price_dkk ? formatDKK(p.price_dkk) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block h-2 w-2 rounded-full ${p.in_stock ? "bg-green-500" : "bg-red-400"}`} />
                  </td>
                  <td className="px-4 py-3">
                    {p.link ? (
                      <span className="rounded-full bg-green-eco/10 px-2 py-0.5 text-xs font-medium text-green-eco">
                        Linket
                      </span>
                    ) : (
                      <span className="text-xs text-charcoal/40">Ikke linket</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!p.link && (
                      <button
                        onClick={() => handleLink(p.foneday_sku)}
                        disabled={linking === p.foneday_sku}
                        className="rounded-lg bg-green-eco px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-eco/90 disabled:opacity-50"
                      >
                        {linking === p.foneday_sku ? "..." : "Link"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-sand px-3 py-1.5 text-sm disabled:opacity-30"
          >
            Forrige
          </button>
          <span className="text-sm text-charcoal/60">
            Side {page} af {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 50)}
            className="rounded-lg border border-sand px-3 py-1.5 text-sm disabled:opacity-30"
          >
            Naeste
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Settings Tab ----
function SettingsTab() {
  const [settings, setSettings] = useState<FonedaySettings>({ eur_dkk_rate: 745, in_stock_qty: 99 });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/foneday/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/foneday/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
  }

  async function triggerSync() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/admin/foneday/sync", { method: "POST" });
    const data = await res.json();
    setSyncResult(JSON.stringify(data, null, 2));
    setSyncing(false);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <label className="block text-sm font-semibold text-charcoal">EUR/DKK kurs (x100)</label>
        <p className="text-xs text-charcoal/50 mb-1">745 = 7,45 DKK per EUR</p>
        <input
          type="number"
          value={settings.eur_dkk_rate}
          onChange={(e) => setSettings({ ...settings, eur_dkk_rate: Number(e.target.value) })}
          className="w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-charcoal">Standard lagerantal (naar Foneday siger &quot;paa lager&quot;)</label>
        <input
          type="number"
          value={settings.in_stock_qty}
          onChange={(e) => setSettings({ ...settings, in_stock_qty: Number(e.target.value) })}
          className="w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal/90 disabled:opacity-50"
      >
        {saving ? "Gemmer..." : "Gem indstillinger"}
      </button>

      <hr className="border-sand" />

      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-2">Manuel sync</h3>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="rounded-lg bg-green-eco px-4 py-2 text-sm font-semibold text-white hover:bg-green-eco/90 disabled:opacity-50"
        >
          {syncing ? "Synkroniserer..." : "Sync nu"}
        </button>
        {syncResult && (
          <pre className="mt-3 rounded-lg bg-cream p-3 text-xs text-charcoal/70 overflow-auto max-h-48">
            {syncResult}
          </pre>
        )}
      </div>
    </div>
  );
}

// ---- Mappings Tab ----
function MappingsTab() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/foneday/mappings")
      .then((r) => r.json())
      .then((data) => { setMappings(data); setLoading(false); });
  }, []);

  if (loading) return <div className="py-8 text-center text-charcoal/40">Indlaeser...</div>;

  const categoryMaps = mappings.filter((m) => m.map_type === "category");
  const qualityMaps = mappings.filter((m) => m.map_type === "quality");

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-charcoal/60">Kategori-mapping</h3>
        <div className="overflow-x-auto rounded-xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Foneday</th>
                <th className="px-4 py-3">PhoneSpot</th>
                <th className="px-4 py-3">Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {categoryMaps.map((m) => (
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
        <h3 className="mb-3 text-sm font-semibold uppercase text-charcoal/60">Kvalitets-mapping</h3>
        <div className="overflow-x-auto rounded-xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Foneday</th>
                <th className="px-4 py-3">PhoneSpot</th>
                <th className="px-4 py-3">Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {qualityMaps.map((m) => (
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

// ---- Linked Products Tab ----
function LinkedTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/foneday/catalog?linked=true&limit=100")
      .then((r) => r.json())
      .then((data) => { setProducts(data.data ?? []); setLoading(false); });
  }, []);

  async function handleUnlink(sku: string) {
    await fetch(`/api/admin/foneday/link?foneday_sku=${encodeURIComponent(sku)}`, {
      method: "DELETE",
    });
    setProducts((prev) => prev.filter((p) => p.foneday_sku !== sku));
  }

  if (loading) return <div className="py-8 text-center text-charcoal/40">Indlaeser...</div>;

  return (
    <div>
      <p className="mb-4 text-sm text-charcoal/50">{products.length} linkede produkter</p>
      <div className="overflow-x-auto rounded-xl border border-sand">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
            <tr>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Pris (DKK)</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-cream/50">
                <td className="px-4 py-3 font-medium max-w-xs truncate">{p.title}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.foneday_sku}</td>
                <td className="px-4 py-3">{p.category ?? "—"}</td>
                <td className="px-4 py-3">{p.price_dkk ? formatDKK(p.price_dkk) : "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-eco/10 px-2 py-0.5 text-xs font-medium text-green-eco">
                    {p.link?.use_type ?? "retail"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleUnlink(p.foneday_sku)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    Fjern link
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Main Page ----
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-cream p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-white text-charcoal shadow-sm"
                : "text-charcoal/50 hover:text-charcoal"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "katalog" && <CatalogTab />}
      {tab === "linkede" && <LinkedTab />}
      {tab === "mappings" && <MappingsTab />}
      {tab === "indstillinger" && <SettingsTab />}
    </div>
  );
}
