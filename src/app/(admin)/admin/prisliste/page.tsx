"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { RepairBrand, DeviceType } from "@/lib/supabase/types";

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  smartphone: "Smartphone",
  tablet: "Tablet",
  laptop: "Laptop",
  watch: "Watch",
  console: "Konsol",
};

const DEVICE_TYPE_BADGE: Record<DeviceType, string> = {
  smartphone: "bg-blue-500/10 text-blue-600",
  tablet: "bg-violet-500/10 text-violet-600",
  laptop: "bg-orange-500/10 text-orange-600",
  watch: "bg-teal-500/10 text-teal-600",
  console: "bg-pink-500/10 text-pink-600",
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPrislistePage() {
  const [brands, setBrands] = useState<(RepairBrand & { model_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDeviceType, setFormDeviceType] = useState<DeviceType>("smartphone");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/brands");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const modelsRes = await fetch("/api/admin/models");
      const models = await modelsRes.json();

      const countsMap: Record<string, number> = {};
      if (Array.isArray(models)) {
        for (const m of models) {
          countsMap[m.brand_id] = (countsMap[m.brand_id] || 0) + 1;
        }
      }

      setBrands(
        data.map((b: RepairBrand) => ({
          ...b,
          model_count: countsMap[b.id] || 0,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente m\u00e6rker");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          slug: slugify(formName),
          device_type: formDeviceType,
          sort_order: formSortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFormName("");
      setFormSortOrder(0);
      setShowForm(false);
      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette m\u00e6rke");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(brand: RepairBrand) {
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !brand.active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke opdatere");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Prisliste
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            {brands.length} m\u00e6rker registreret
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all active:scale-[0.98] ${
            showForm
              ? "border border-black/[0.06] bg-white text-charcoal/60 shadow-sm hover:text-charcoal"
              : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/15 hover:shadow-lg hover:brightness-110"
          }`}
        >
          {showForm ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Annuller
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tilf\u00f8j m\u00e6rke
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-2xl border border-black/[0.04] bg-white p-6 shadow-sm"
        >
          <h3 className="mb-4 font-display text-lg font-bold text-charcoal">
            Nyt m\u00e6rke
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-charcoal/50">Navn</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="fx Apple"
                className="rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-charcoal/50">Slug</label>
              <input
                type="text"
                readOnly
                value={slugify(formName)}
                className="rounded-xl border border-black/[0.04] bg-charcoal/[0.02] px-4 py-2.5 text-sm text-charcoal/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-charcoal/50">Enhedstype</label>
              <select
                value={formDeviceType}
                onChange={(e) => setFormDeviceType(e.target.value as DeviceType)}
                className="rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              >
                {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map((dt) => (
                  <option key={dt} value={dt}>
                    {DEVICE_TYPE_LABELS[dt]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-charcoal/50">Sortering</label>
              <input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(Number(e.target.value))}
                className="rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-500/15 transition-all hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "Opretter..." : "Opret m\u00e6rke"}
            </button>
          </div>
        </form>
      )}

      {/* Brand grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indl\u00e6ser m\u00e6rker...</p>
          </div>
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen m\u00e6rker fundet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="group rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/prisliste/${brand.slug}`}
                  className="flex-1"
                >
                  <h3 className="font-display text-lg font-bold text-charcoal transition-colors group-hover:text-emerald-600">
                    {brand.name}
                  </h3>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleActive(brand)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                    brand.active ? "bg-emerald-500" : "bg-charcoal/20"
                  }`}
                  aria-label={brand.active ? "Deaktiver" : "Aktiver"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      brand.active ? "translate-x-[1.3rem]" : "translate-x-0.5"
                    } mt-0.5`}
                  />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${DEVICE_TYPE_BADGE[brand.device_type]}`}>
                  {DEVICE_TYPE_LABELS[brand.device_type]}
                </span>
                <span className="rounded-full bg-charcoal/[0.04] px-2.5 py-1 text-[10px] font-bold text-charcoal/35">
                  {brand.model_count ?? 0} model{(brand.model_count ?? 0) !== 1 ? "ler" : ""}
                </span>
              </div>

              <Link
                href={`/admin/prisliste/${brand.slug}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
              >
                Se modeller
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
