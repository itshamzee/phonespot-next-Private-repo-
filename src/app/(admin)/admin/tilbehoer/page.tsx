"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type AccessoryStatus = "draft" | "published" | "archived";

interface Accessory {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string | null;
  compatible_models: string[];
  price: number; // oere
  sale_price?: number | null; // oere
  cost_price: number;
  sku: string | null;
  ean: string | null;
  image_url: string | null;
  description: string | null;
  online_stock: number;
  store_stock: number;
  always_in_stock: boolean;
  store_id: string;
  status: AccessoryStatus;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const CATEGORY_QUICK_FILTERS = [
  { value: "alle", label: "Alle" },
  { value: "cover", label: "Covers" },
  { value: "screen_protector", label: "Beskyttelsesglas" },
  { value: "cable", label: "Kabler" },
  { value: "charger", label: "Opladere" },
  { value: "audio", label: "Lyd" },
  { value: "other", label: "Andet" },
];

const CATEGORY_DISPLAY: Record<string, string> = {
  cover: "Cover",
  screen_protector: "Beskyttelsesglas",
  cable: "Kabel",
  charger: "Oplader",
  audio: "Lyd",
  other: "Andet",
};

const STATUS_LABEL: Record<AccessoryStatus, string> = {
  draft: "Kladde",
  published: "Publiceret",
  archived: "Arkiveret",
};

const STATUS_BADGE: Record<AccessoryStatus, string> = {
  draft: "bg-amber-500/10 text-amber-600",
  published: "bg-emerald-500/10 text-emerald-600",
  archived: "bg-stone-500/10 text-stone-500",
};

const STOCK_LOCATIONS = [
  { value: "alle", label: "Alle lokationer" },
  { value: "slagelse", label: "Paa lager i Slagelse" },
  { value: "vejle", label: "Paa lager i Vejle" },
  { value: "udsolgt", label: "Ikke paa lager" },
];

/* ------------------------------------------------------------------ */
/*  Toast                                                               */
/* ------------------------------------------------------------------ */

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastCounter = 0;

/* ------------------------------------------------------------------ */
/*  Inline editable cells                                               */
/* ------------------------------------------------------------------ */

function StockCell({
  value,
  onSave,
}: {
  value: number;
  onSave: (v: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  async function commit() {
    const n = parseInt(draft, 10);
    if (isNaN(n) || n < 0) {
      setDraft(String(value));
      setEditing(false);
      return;
    }
    if (n === value) {
      setEditing(false);
      return;
    }
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
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        disabled={saving}
        className="w-16 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-center text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/stock flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-emerald-500/5"
    >
      <span className="text-sm font-semibold tabular-nums text-charcoal">{value}</span>
      <svg
        className="h-3 w-3 text-charcoal/25 opacity-0 transition-opacity group-hover/stock:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
      </svg>
    </button>
  );
}

function PriceCell({
  value,
  onSave,
}: {
  value: number; // oere
  onSave: (v: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value / 100));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    setDraft(String(value / 100));
  }, [value]);

  async function commit() {
    const n = parseFloat(draft);
    if (isNaN(n) || n < 0) {
      setDraft(String(value / 100));
      setEditing(false);
      return;
    }
    const oere = Math.round(n * 100);
    if (oere === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(oere);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        step={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(value / 100));
            setEditing(false);
          }
        }}
        disabled={saving}
        className="w-20 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-right text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/price flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-emerald-500/5"
    >
      <span className="text-sm font-semibold tabular-nums text-charcoal">
        {(value / 100).toLocaleString("da-DK", {
          style: "currency",
          currency: "DKK",
          maximumFractionDigits: 0,
        })}
      </span>
      <svg
        className="h-3 w-3 text-charcoal/25 opacity-0 transition-opacity group-hover/price:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
      </svg>
    </button>
  );
}

function SalePriceInline({
  currentSalePrice,
  onSave,
  onClear,
}: {
  currentSalePrice: number | null | undefined; // oere or null
  onSave: (v: number) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(currentSalePrice ? String(currentSalePrice / 100) : "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(currentSalePrice ? String(currentSalePrice / 100) : "");
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [open, currentSalePrice]);

  async function commit() {
    const n = parseFloat(draft);
    if (isNaN(n) || n <= 0) {
      // Clear sale price
      if (currentSalePrice) {
        setSaving(true);
        await onClear();
        setSaving(false);
      }
      setOpen(false);
      return;
    }
    const oere = Math.round(n * 100);
    setSaving(true);
    await onSave(oere);
    setSaving(false);
    setOpen(false);
  }

  if (open) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min={0}
          step={1}
          placeholder="Tilbud kr"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setOpen(false);
          }}
          disabled={saving}
          className="w-20 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-right text-xs font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
        />
      </div>
    );
  }

  if (currentSalePrice && currentSalePrice > 0) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600 hover:bg-red-500/20 transition-colors"
        title="Rediger tilbudspris"
      >
        {(currentSalePrice / 100).toLocaleString("da-DK", {
          style: "currency",
          currency: "DKK",
          maximumFractionDigits: 0,
        })}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[11px] font-bold text-charcoal/30 hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
      title="Tilføj tilbudspris"
    >
      %
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function TilbehoerListPage() {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("alle");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [brandFilter, setBrandFilter] = useState("alle");
  const [modelFilter, setModelFilter] = useState("");
  const [modelFilterDebounced, setModelFilterDebounced] = useState("");
  const [locationFilter, setLocationFilter] = useState("alle");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Toast helpers ---- */

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ---- Debounce search ---- */

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchDebounced(search), 350);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  useEffect(() => {
    if (modelTimeout.current) clearTimeout(modelTimeout.current);
    modelTimeout.current = setTimeout(() => setModelFilterDebounced(modelFilter), 350);
    return () => {
      if (modelTimeout.current) clearTimeout(modelTimeout.current);
    };
  }, [modelFilter]);

  /* ---- Fetch ---- */

  const fetchAccessories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter !== "alle") params.set("category", categoryFilter);
    if (searchDebounced) params.set("search", searchDebounced);

    try {
      const res = await fetch(`/api/admin/accessories?${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente tilbehoer");
      const data = await res.json();
      setAccessories(Array.isArray(data) ? data : (data.accessories ?? []));
    } catch {
      addToast("error", "Fejl ved indlaesning af tilbehoer");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchDebounced, addToast]);

  useEffect(() => {
    fetchAccessories();
  }, [fetchAccessories]);

  /* ---- Derived: unique brands ---- */

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    for (const a of accessories) {
      if (a.brand) set.add(a.brand);
    }
    return Array.from(set).sort();
  }, [accessories]);

  /* ---- Client-side filters (brand, model, location) ---- */

  const filteredAccessories = useMemo(() => {
    let list = accessories;

    if (brandFilter !== "alle") {
      list = list.filter((a) => a.brand === brandFilter);
    }

    if (modelFilterDebounced) {
      const q = modelFilterDebounced.toLowerCase();
      list = list.filter((a) =>
        a.compatible_models?.some((m) => m.toLowerCase().includes(q)),
      );
    }

    if (locationFilter === "slagelse") {
      list = list.filter((a) => a.store_stock > 0);
    } else if (locationFilter === "vejle") {
      list = list.filter((a) => a.online_stock > 0);
    } else if (locationFilter === "udsolgt") {
      list = list.filter((a) => a.store_stock === 0 && a.online_stock === 0);
    }

    return list;
  }, [accessories, brandFilter, modelFilterDebounced, locationFilter]);

  /* ---- Update helper ---- */

  const updateAccessory = useCallback(
    async (id: string, payload: Partial<Accessory>) => {
      const res = await fetch(`/api/admin/accessories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Opdatering fejlede");
      const updated = await res.json();
      setAccessories((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updated } : a)),
      );
    },
    [],
  );

  /* ---- Stock save ---- */

  const saveStoreStock = useCallback(
    async (id: string, store_stock: number) => {
      try {
        await updateAccessory(id, { store_stock } as Partial<Accessory>);
        addToast("success", "Butiklager opdateret");
      } catch {
        addToast("error", "Fejl ved opdatering af lager");
      }
    },
    [updateAccessory, addToast],
  );

  const saveOnlineStock = useCallback(
    async (id: string, online_stock: number) => {
      try {
        await updateAccessory(id, { online_stock } as Partial<Accessory>);
        addToast("success", "Online-lager opdateret");
      } catch {
        addToast("error", "Fejl ved opdatering af lager");
      }
    },
    [updateAccessory, addToast],
  );

  /* ---- Price save ---- */

  const savePrice = useCallback(
    async (id: string, price: number) => {
      try {
        await updateAccessory(id, { price } as Partial<Accessory>);
        addToast("success", "Pris opdateret");
      } catch {
        addToast("error", "Fejl ved opdatering af pris");
      }
    },
    [updateAccessory, addToast],
  );

  const saveSalePrice = useCallback(
    async (id: string, sale_price: number) => {
      try {
        await updateAccessory(id, { sale_price } as Partial<Accessory>);
        addToast("success", "Tilbudspris sat");
      } catch {
        addToast("error", "Fejl ved opdatering af tilbudspris");
      }
    },
    [updateAccessory, addToast],
  );

  const clearSalePrice = useCallback(
    async (id: string) => {
      try {
        await updateAccessory(id, { sale_price: null } as Partial<Accessory>);
        addToast("success", "Tilbudspris fjernet");
      } catch {
        addToast("error", "Fejl ved fjernelse af tilbudspris");
      }
    },
    [updateAccessory, addToast],
  );

  /* ---- Status toggle ---- */

  const toggleStatus = useCallback(
    async (item: Accessory) => {
      const next: AccessoryStatus =
        item.status === "published" ? "draft" : "published";
      try {
        await updateAccessory(item.id, { status: next } as Partial<Accessory>);
        addToast("success", next === "published" ? "Publiceret" : "Sat som kladde");
      } catch {
        addToast("error", "Fejl ved statusskift");
      }
    },
    [updateAccessory, addToast],
  );

  /* ---- Delete ---- */

  const deleteAccessory = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const res = await fetch(`/api/admin/accessories/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Sletning fejlede");
        setAccessories((prev) => prev.filter((a) => a.id !== id));
        addToast("success", "Produkt arkiveret");
      } catch {
        addToast("error", "Fejl ved sletning");
      } finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
      }
    },
    [addToast],
  );

  /* ---- Reset all filters ---- */

  const resetFilters = useCallback(() => {
    setCategoryFilter("alle");
    setSearch("");
    setBrandFilter("alle");
    setModelFilter("");
    setLocationFilter("alle");
  }, []);

  const hasActiveFilters =
    categoryFilter !== "alle" ||
    search !== "" ||
    brandFilter !== "alle" ||
    modelFilter !== "" ||
    locationFilter !== "alle";

  /* ---- Stats ---- */

  const total = filteredAccessories.length;
  const published = filteredAccessories.filter((a) => a.status === "published").length;
  const draft = filteredAccessories.filter((a) => a.status === "draft").length;

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-all ${
              t.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : "border-red-500/20 bg-red-500/10 text-red-700"
            }`}
          >
            {t.type === "success" ? (
              <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-charcoal">Tilbehoer</h2>
          <p className="mt-1 text-sm text-charcoal/50">
            Administrer accessories, lager og priser
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/spot"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-500/50 hover:bg-emerald-50"
            title="Beskyttelsesglas med 3-for-2 og Lens-combo bundle-priser"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Beskyttelsesglas (Spot)
          </Link>
          <Link
            href="/admin/tilbehoer/opret"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Opret ny
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Produkter i alt", value: total, color: "text-charcoal" },
          { label: "Publicerede", value: published, color: "text-emerald-600" },
          { label: "Kladder", value: draft, color: "text-amber-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-black/[0.04] bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/40">
              {s.label}
            </p>
            <p className={`mt-0.5 font-display text-2xl font-bold tabular-nums ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Category quick-filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_QUICK_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setCategoryFilter(f.value)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-all ${
              categoryFilter === f.value
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "bg-white text-charcoal/50 hover:bg-emerald-500/5 hover:text-emerald-600 border border-black/[0.04]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Søg på navn, EAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/[0.06] bg-white py-2 pl-9 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 sm:w-56"
          />
        </div>

        {/* Brand dropdown */}
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        >
          <option value="alle">Alle brands</option>
          {availableBrands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {/* Enhed/Model input */}
        <input
          type="text"
          placeholder="Enhed/model fx iPhone 16"
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="w-full rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 sm:w-52"
        />

        {/* Location dropdown */}
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        >
          {STOCK_LOCATIONS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Reset filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm font-medium text-charcoal/50 hover:bg-stone-50 hover:text-charcoal transition-colors"
          >
            Nulstil
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-black/[0.04] bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400" />
            </div>
          </div>
        ) : filteredAccessories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-charcoal/40">
            <svg className="h-12 w-12 text-charcoal/15" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
            <p className="text-sm font-medium">Ingen tilbehoersartikler fundet</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-emerald-600 hover:underline"
              >
                Nulstil filtre
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-black/[0.04] bg-stone-50/60">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35 w-14">
                    Billede
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    Navn
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35 w-28">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35 w-40">
                    Passer til
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35 w-32">
                    Pris
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35 w-24">
                    Slagelse
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35 w-24">
                    Vejle
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35 w-24">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35 w-24">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {filteredAccessories.map((item) => (
                  <tr
                    key={item.id}
                    className="group transition-colors hover:bg-stone-50/50"
                  >
                    {/* Image — 48x48 */}
                    <td className="px-4 py-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-black/[0.05] bg-stone-100">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Name + brand + EAN */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal line-clamp-1">{item.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        {item.brand && (
                          <span className="text-[11px] font-semibold text-charcoal/40">
                            {item.brand}
                          </span>
                        )}
                        {item.ean && (
                          <span className="font-mono text-[11px] text-charcoal/30">
                            EAN: {item.ean}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-charcoal/60">
                        {CATEGORY_DISPLAY[item.category] || item.category}
                      </span>
                    </td>

                    {/* Compatible models */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.compatible_models && item.compatible_models.length > 0 ? (
                          <>
                            {item.compatible_models.slice(0, 3).map((model) => (
                              <span
                                key={model}
                                className="inline-block rounded-md bg-blue-500/8 px-1.5 py-0.5 text-[10px] font-medium text-blue-700/70"
                              >
                                {model}
                              </span>
                            ))}
                            {item.compatible_models.length > 3 && (
                              <span
                                className="inline-block rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-charcoal/40"
                                title={item.compatible_models.slice(3).join(", ")}
                              >
                                +{item.compatible_models.length - 3}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-charcoal/25">--</span>
                        )}
                      </div>
                    </td>

                    {/* Price + sale */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <PriceCell
                            value={item.price}
                            onSave={(v) => savePrice(item.id, v)}
                          />
                          <SalePriceInline
                            currentSalePrice={item.sale_price}
                            onSave={(v) => saveSalePrice(item.id, v)}
                            onClear={() => clearSalePrice(item.id)}
                          />
                        </div>
                        {item.sale_price && item.sale_price > 0 && (
                          <span className="text-[10px] text-charcoal/30 line-through tabular-nums">
                            {(item.price / 100).toLocaleString("da-DK", {
                              style: "currency",
                              currency: "DKK",
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Store stock (Slagelse) */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <StockCell
                          value={item.store_stock}
                          onSave={(v) => saveStoreStock(item.id, v)}
                        />
                      </div>
                    </td>

                    {/* Online stock (Vejle) */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <StockCell
                          value={item.online_stock}
                          onSave={(v) => saveOnlineStock(item.id, v)}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => toggleStatus(item)}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all hover:opacity-80 ${STATUS_BADGE[item.status]}`}
                        >
                          {STATUS_LABEL[item.status]}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Confirm delete inline */}
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-charcoal/50">Sikker?</span>
                            <button
                              type="button"
                              onClick={() => deleteAccessory(item.id)}
                              disabled={deletingId === item.id}
                              className="rounded-lg bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {deletingId === item.id ? "..." : "Ja"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-bold text-charcoal/50 hover:bg-stone-200"
                            >
                              Nej
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="rounded-lg p-1.5 text-charcoal/25 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
                            title="Arkiver"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
