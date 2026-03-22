"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { parseDKKToOere, formatDKK } from "@/lib/platform/format";

interface Template {
  id: string;
  brand: string;
  model: string;
  category: string;
  display_name: string;
  storage_options: string[];
  colors: string[];
  base_price_a?: number | null;
  base_price_b?: number | null;
  base_price_c?: number | null;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

type Grade = "A" | "B" | "C";

const GRADE_CONFIG: { value: Grade; label: string; desc: string; color: string; activeColor: string }[] = [
  { value: "A", label: "A", desc: "Som ny", color: "border-stone-200 bg-white text-stone-600", activeColor: "border-green-500 bg-green-50 text-green-800 ring-2 ring-green-500/20" },
  { value: "B", label: "B", desc: "God stand", color: "border-stone-200 bg-white text-stone-600", activeColor: "border-yellow-500 bg-yellow-50 text-yellow-800 ring-2 ring-yellow-500/20" },
  { value: "C", label: "C", desc: "Brugt", color: "border-stone-200 bg-white text-stone-600", activeColor: "border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-500/20" },
];

export default function QuickAddPage() {
  // Template search state
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Device details
  const [storage, setStorage] = useState("");
  const [color, setColor] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [imei, setImei] = useState("");
  const [batteryHealth, setBatteryHealth] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);

  // UI state
  const [locations, setLocations] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ barcode: string; name: string } | null>(null);
  const [showImei, setShowImei] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [directToSale, setDirectToSale] = useState(false);

  // Inline create template state
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [createTemplateSaving, setCreateTemplateSaving] = useState(false);
  const [createTemplateForm, setCreateTemplateForm] = useState({ brand: "", model: "", category: "smartphone" });

  // Load locations on mount
  useEffect(() => {
    fetch("/api/platform/locations")
      .then((r) => r.json())
      .then((data) => {
        const locs = Array.isArray(data) ? data : [];
        setLocations(locs);
        // Default to first physical store
        const store = locs.find((l: Location) => l.type === "store");
        if (store) setLocationId(store.id);
      })
      .catch(() => {});
  }, []);

  // Search templates (debounced)
  const searchTemplates = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/platform/templates?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch {
      /* empty */
    } finally {
      setSearching(false);
    }
  }, []);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => searchTemplates(value), 200);
    } else {
      setTemplates([]);
    }
  }

  // Fetch full template details including prices
  async function selectTemplate(t: Template) {
    setSelectedTemplate(t);
    setSearch("");
    setTemplates([]);
    setStorage(t.storage_options?.[0] ?? "");
    setColor(t.colors?.[0] ?? "");
    setGrade(null);
    setSellingPrice("");

    // Fetch full template with prices
    try {
      const res = await fetch(`/api/platform/templates/${t.id}`);
      if (res.ok) {
        const full = await res.json();
        setSelectedTemplate(full);
      }
    } catch {
      /* use partial data */
    }
  }

  // Auto-fill selling price when grade changes
  function handleGradeChange(g: Grade) {
    setGrade(g);
    if (selectedTemplate) {
      const priceKey = `base_price_${g.toLowerCase()}` as keyof Template;
      const basePrice = selectedTemplate[priceKey] as number | null | undefined;
      if (basePrice && basePrice > 0) {
        setSellingPrice(String(basePrice / 100));
      }
    }
  }

  function resetForm() {
    setSelectedTemplate(null);
    setSearch("");
    setStorage("");
    setColor("");
    setGrade(null);
    setPurchasePrice("");
    setSellingPrice("");
    setImei("");
    setBatteryHealth("");
    setError(null);
    setSuccess(null);
    setShowImei(false);
    setShowCreateTemplate(false);
    setDirectToSale(false);
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  const KNOWN_BRANDS = ["Apple", "Samsung", "Google", "OnePlus", "Huawei", "Lenovo", "HP", "Sony", "Xiaomi", "Motorola", "Nokia", "Asus", "LG"];

  function detectBrandFromSearch(q: string): { brand: string; model: string } {
    const firstWord = q.split(" ")[0];
    const matched = KNOWN_BRANDS.find((b) => b.toLowerCase() === firstWord.toLowerCase());
    if (matched) {
      return { brand: matched, model: q.slice(firstWord.length).trim() };
    }
    return { brand: "", model: q };
  }

  function openCreateTemplate() {
    const { brand, model } = detectBrandFromSearch(search);
    setCreateTemplateForm({ brand, model: model || search, category: "smartphone" });
    setShowCreateTemplate(true);
  }

  async function handleCreateTemplate() {
    const { brand, model, category } = createTemplateForm;
    if (!brand.trim() || !model.trim()) return;
    const display_name = `${brand.trim()} ${model.trim()}`;
    const slug = display_name
      .toLowerCase()
      .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setCreateTemplateSaving(true);
    try {
      const res = await fetch("/api/platform/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand.trim(), model: model.trim(), display_name, category, slug, status: "published", storage_options: [], colors: [] }),
      });
      if (res.ok) {
        const created = await res.json();
        setShowCreateTemplate(false);
        setCreateTemplateForm({ brand: "", model: "", category: "smartphone" });
        await selectTemplate(created);
      }
    } finally {
      setCreateTemplateSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate || !grade || !locationId) return;

    const purchaseOere = parseDKKToOere(purchasePrice);
    const sellingOere = parseDKKToOere(sellingPrice);

    if (!purchaseOere || purchaseOere <= 0) {
      setError("Indkøbspris er påkrævet");
      return;
    }
    if (!sellingOere || sellingOere <= 0) {
      setError("Salgspris er påkrævet");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const baseBody: Record<string, unknown> = {
        template_id: selectedTemplate.id,
        grade,
        purchase_price: purchaseOere,
        selling_price: sellingOere,
        location_id: locationId,
        vat_scheme: "brugtmoms",
        status: directToSale ? "listed" : "intake",
      };
      if (storage) baseBody.storage = storage;
      if (color) baseBody.color = color;
      if (batteryHealth) baseBody.battery_health = parseInt(batteryHealth, 10);

      // For quantity=1, include IMEI. For batch, IMEI is skipped (each device is unique)
      const barcodes: string[] = [];
      const count = Math.max(1, Math.min(quantity, 50));

      for (let i = 0; i < count; i++) {
        const body = { ...baseBody };
        if (count === 1 && imei.trim()) body.imei = imei.trim();

        const res = await fetch("/api/platform/devices/quick-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? `Fejl ved enhed ${i + 1}`);
          if (barcodes.length > 0) {
            // Some succeeded — show partial success
            setAddedCount((c) => c + barcodes.length);
            setSuccess({
              barcode: barcodes.join(", "),
              name: `${barcodes.length}x ${selectedTemplate.display_name}${storage ? ` ${storage}` : ""} — Grade ${grade}`,
            });
          }
          return;
        }

        const device = await res.json();
        barcodes.push(device.barcode);
      }

      setAddedCount((c) => c + count);
      setSuccess({
        barcode: count === 1 ? barcodes[0] : `${count} enheder oprettet`,
        name: `${count > 1 ? `${count}x ` : ""}${selectedTemplate.display_name}${storage ? ` ${storage}` : ""}${color ? ` ${color}` : ""} — Grade ${grade}`,
      });
    } catch {
      setError("Netværksfejl — prøv igen");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = selectedTemplate && grade && purchasePrice && sellingPrice && locationId;

  // ─── Success state ───
  if (success) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-b from-green-50 to-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-eco text-white">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h2 className="font-display text-xl font-bold text-stone-800">{directToSale ? "Tilføjet til salg!" : "Tilføjet til intake!"}</h2>
          <p className="mt-2 text-sm text-stone-600">{success.name}</p>
          <p className="mt-1 font-mono text-xs text-stone-400">{success.barcode}</p>

          {addedCount > 1 && (
            <p className="mt-3 text-xs font-semibold text-green-600">
              {addedCount} enheder tilføjet i denne session
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                // Keep model, grade, prices — just clear IMEI and reset success
                setImei("");
                setQuantity(1);
                setError(null);
                setSuccess(null);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-green-eco px-6 py-3 text-sm font-bold text-white shadow-md shadow-green-eco/20 transition hover:brightness-110 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tilføj endnu én (samme model)
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              Ny model
            </button>
            <Link
              href="/admin/platform/stock"
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              Se lager
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ───
  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Tilføj til salg
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            Vælg model → sæt pris → færdig
          </p>
        </div>
        {addedCount > 0 && (
          <span className="rounded-full bg-green-eco/10 px-3 py-1 text-sm font-bold text-green-700">
            {addedCount} tilføjet
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ─── Model search ─── */}
        <div className="relative">
          {selectedTemplate ? (
            <div className="flex items-center justify-between rounded-2xl border-2 border-green-eco/30 bg-green-eco/5 px-5 py-4">
              <div>
                <p className="font-display text-lg font-bold text-stone-800">
                  {selectedTemplate.display_name}
                </p>
                <p className="text-xs text-stone-400">
                  {selectedTemplate.brand} · {selectedTemplate.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(null);
                  setGrade(null);
                  setSellingPrice("");
                  setTimeout(() => searchRef.current?.focus(), 50);
                }}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-50"
              >
                Skift
              </button>
            </div>
          ) : (
            <div>
              {showCreateTemplate ? (
                <div className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Opret ny enhedsmodel</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-stone-500">Mærke</label>
                      <input
                        value={createTemplateForm.brand}
                        onChange={(e) => setCreateTemplateForm((prev) => ({ ...prev, brand: e.target.value }))}
                        placeholder="f.eks. Samsung"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:border-green-eco/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-stone-500">Model</label>
                      <input
                        value={createTemplateForm.model}
                        onChange={(e) => setCreateTemplateForm((prev) => ({ ...prev, model: e.target.value }))}
                        placeholder="f.eks. Galaxy Watch 4"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:border-green-eco/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-stone-500">Kategori</label>
                      <select
                        value={createTemplateForm.category}
                        onChange={(e) => setCreateTemplateForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
                      >
                        {[
                          { value: "iphone", label: "iPhone" },
                          { value: "smartphone", label: "Smartphone" },
                          { value: "ipad", label: "iPad" },
                          { value: "tablet", label: "Tablet" },
                          { value: "smartwatch", label: "Smartwatch" },
                          { value: "laptop", label: "Laptop" },
                          { value: "console", label: "Konsol" },
                          { value: "other", label: "Andet" },
                        ].map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreateTemplate(false)}
                      className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                    >
                      Annuller
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateTemplate}
                      disabled={createTemplateSaving || !createTemplateForm.brand.trim() || !createTemplateForm.model.trim()}
                      className="rounded-xl bg-green-eco px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                    >
                      {createTemplateSaving ? "Opretter..." : "Opret og v\u00E6lg"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <svg
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="S\u00F8g model... f.eks. iPhone 13 Pro"
                      autoFocus
                      className="w-full rounded-2xl border-2 border-stone-200 bg-white py-4 pl-12 pr-4 text-base text-stone-800 placeholder:text-stone-400 transition focus:border-green-eco/50 focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                    />
                  </div>

                  {/* Search results */}
                  {templates.length > 0 && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                      <ul className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                        {templates.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => selectTemplate(t)}
                              className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-stone-50 active:bg-stone-100"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100">
                                <svg className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-stone-800">{t.display_name}</p>
                                <p className="text-xs text-stone-400">{t.brand} \u00B7 {t.category}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {search.length >= 2 && !searching && (
                        <div className="border-t border-stone-100">
                          <button
                            type="button"
                            onClick={openCreateTemplate}
                            className="flex w-full items-center gap-2 px-5 py-3.5 text-sm font-medium text-green-700 transition hover:bg-green-50"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Opret &ldquo;{search}&rdquo; som ny model
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {templates.length === 0 && search.length >= 2 && !searching && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                      <p className="px-5 py-3.5 text-sm text-stone-400">Ingen resultater for &ldquo;{search}&rdquo;</p>
                      <div className="border-t border-stone-100">
                        <button
                          type="button"
                          onClick={openCreateTemplate}
                          className="flex w-full items-center gap-2 px-5 py-3.5 text-sm font-medium text-green-700 transition hover:bg-green-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Opret &ldquo;{search}&rdquo; som ny model
                        </button>
                      </div>
                    </div>
                  )}
                  {searching && (
                    <div className="absolute z-50 mt-2 w-full rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-xl">
                      <p className="text-sm text-stone-400">S\u00F8ger...</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ─── Options (only when template selected) ─── */}
        {selectedTemplate && (
          <>
            {/* Storage + Color row */}
            {(selectedTemplate.storage_options?.length > 0 || selectedTemplate.colors?.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedTemplate.storage_options?.length > 0 && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Lagerkapacitet
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.storage_options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setStorage(opt)}
                          className={[
                            "rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97]",
                            storage === opt
                              ? "border-charcoal bg-charcoal text-white"
                              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                          ].join(" ")}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTemplate.colors?.length > 0 && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Farve
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={[
                            "rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97]",
                            color === c
                              ? "border-charcoal bg-charcoal text-white"
                              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                          ].join(" ")}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Grade */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
                Stand
              </label>
              <div className="grid grid-cols-3 gap-3">
                {GRADE_CONFIG.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => handleGradeChange(g.value)}
                    className={[
                      "flex flex-col items-center rounded-2xl border-2 py-4 transition active:scale-[0.97]",
                      grade === g.value ? g.activeColor : g.color,
                    ].join(" ")}
                  >
                    <span className="font-display text-2xl font-black">{g.label}</span>
                    <span className="mt-0.5 text-xs font-medium opacity-60">{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prices */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Indkøbspris (DKK)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 text-center font-mono text-lg font-bold text-stone-800 placeholder:text-stone-300 transition focus:border-green-eco/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Salgspris (DKK)
                  {grade && selectedTemplate[`base_price_${grade.toLowerCase()}` as keyof Template] ? (
                    <span className="ml-2 font-normal normal-case text-green-600">
                      anbefalet: {formatDKK((selectedTemplate[`base_price_${grade.toLowerCase()}` as keyof Template] as number) ?? 0)}
                    </span>
                  ) : null}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 text-center font-mono text-lg font-bold text-stone-800 placeholder:text-stone-300 transition focus:border-green-eco/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
                Lokation
              </label>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocationId(loc.id)}
                    className={[
                      "rounded-xl border-2 px-5 py-3 text-sm font-semibold transition active:scale-[0.97]",
                      locationId === loc.id
                        ? "border-charcoal bg-charcoal text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                    ].join(" ")}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional: IMEI + Battery */}
            <div>
              {!showImei ? (
                <button
                  type="button"
                  onClick={() => setShowImei(true)}
                  className="text-xs font-medium text-stone-400 underline decoration-stone-300 underline-offset-2 hover:text-stone-600"
                >
                  + IMEI / Batteri (valgfrit)
                </button>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-stone-100 bg-stone-50/50 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-400">IMEI</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      placeholder="15-cifret IMEI"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-mono text-stone-800 placeholder:text-stone-400 focus:border-green-eco/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-400">Batteri %</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={batteryHealth}
                      onChange={(e) => setBatteryHealth(e.target.value)}
                      placeholder="85"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-eco/50 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Antal
              </label>
              <div className="flex items-center rounded-xl border-2 border-stone-200 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-lg font-bold text-stone-400 hover:text-stone-700 transition"
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center font-mono text-lg font-bold text-stone-800">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  className="px-3 py-2 text-lg font-bold text-stone-400 hover:text-stone-700 transition"
                >
                  +
                </button>
              </div>
              {quantity > 1 && (
                <span className="text-xs text-stone-400">
                  {quantity} identiske enheder oprettes
                </span>
              )}
            </div>

            {/* Direct to sale toggle */}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <input
                type="checkbox"
                checked={directToSale}
                onChange={(e) => setDirectToSale(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-green-600"
              />
              <div>
                <p className="text-sm font-medium text-stone-700">Sæt direkte til salg</p>
                <p className="text-xs text-stone-400">Enheden oprettes med status &ldquo;Til salg&rdquo; i stedet for &ldquo;Intake&rdquo;</p>
              </div>
            </label>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-green-eco py-4 text-base font-bold text-white shadow-lg shadow-green-eco/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Tilføjer {quantity > 1 ? `${quantity} enheder` : ""}...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {directToSale
                    ? (quantity > 1 ? `Tilføj ${quantity} direkte til salg` : "Tilføj direkte til salg")
                    : (quantity > 1 ? `Tilføj ${quantity} til intake` : "Tilføj til salg")}
                </>
              )}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
