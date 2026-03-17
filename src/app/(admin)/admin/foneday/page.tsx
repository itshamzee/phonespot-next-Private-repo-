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
  link: { foneday_catalog_id: string; accessory_id: string | null; use_type: string } | null;
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

function CatalogTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [linked, setLinked] = useState("false");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [linking, setLinking] = useState<string | null>(null);
  const [bulkLinking, setBulkLinking] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

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

  async function handleLink(sku: string) {
    setLinking(sku);
    await fetch("/api/admin/foneday/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        foneday_sku: sku,
        use_type: "retail",
        markup_percentage: 40,
        store_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    setLinking(null);
    fetchCatalog();
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

      {total > 50 && (
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-sand px-3 py-1.5 text-sm disabled:opacity-30">Forrige</button>
          <span className="text-sm text-charcoal/60">Side {page} af {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 50)} className="rounded-lg border border-sand px-3 py-1.5 text-sm disabled:opacity-30">Naeste</button>
        </div>
      )}
    </div>
  );
}

function LinkedTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/foneday/catalog?linked=true&limit=100")
      .then((r) => r.json())
      .then((data) => { setProducts(data.data ?? []); setLoading(false); });
  }, []);

  async function handleUnlink(sku: string) {
    await fetch(`/api/admin/foneday/link?foneday_sku=${encodeURIComponent(sku)}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.foneday_sku !== sku));
  }

  if (loading) return <div className="py-8 text-center text-charcoal/40">Indlaeser...</div>;

  return (
    <div>
      <p className="mb-4 text-sm text-charcoal/50">{products.length} linkede produkter</p>
      {products.length === 0 ? (
        <div className="py-12 text-center text-charcoal/40">Ingen linkede produkter endnu. Gaa til Katalog og link produkter.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs font-semibold uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Passer til</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Pris (DKK)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-charcoal/40 font-mono">{p.foneday_sku}</div>
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">{p.suitable_for ?? "Universal"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-sand/50 px-2 py-0.5 text-xs">{p.category}</span></td>
                  <td className="px-4 py-3 text-right font-mono">{p.price_dkk ? formatDKK(p.price_dkk) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleUnlink(p.foneday_sku)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Fjern</button>
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
