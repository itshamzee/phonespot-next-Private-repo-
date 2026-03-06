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

const DEVICE_TYPE_COLORS: Record<DeviceType, string> = {
  smartphone: "bg-blue-100 text-blue-800",
  tablet: "bg-purple-100 text-purple-800",
  laptop: "bg-orange-100 text-orange-800",
  watch: "bg-teal-100 text-teal-800",
  console: "bg-pink-100 text-pink-800",
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

      // Fetch model counts for each brand
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
      setError(err instanceof Error ? err.message : "Kunne ikke hente maerker");
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
      setError(err instanceof Error ? err.message : "Kunne ikke oprette maerke");
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
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-charcoal">Prisliste</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {showForm ? "Annuller" : "Tilfoej maerke"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Inline create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-2xl border border-soft-grey bg-white p-5"
        >
          <h3 className="mb-4 font-display text-lg font-semibold text-charcoal">
            Nyt maerke
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-charcoal">Navn</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="fx Apple"
                className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-charcoal">Slug</label>
              <input
                type="text"
                readOnly
                value={slugify(formName)}
                className="rounded-lg border border-soft-grey bg-soft-grey/30 px-4 py-2.5 text-gray"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-charcoal">Enhedstype</label>
              <select
                value={formDeviceType}
                onChange={(e) => setFormDeviceType(e.target.value as DeviceType)}
                className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
              >
                {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map((dt) => (
                  <option key={dt} value={dt}>
                    {DEVICE_TYPE_LABELS[dt]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-charcoal">Sortering</label>
              <input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(Number(e.target.value))}
                className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-green-eco px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Opretter..." : "Opret maerke"}
            </button>
          </div>
        </form>
      )}

      {/* Brand grid */}
      {loading ? (
        <p className="text-gray">Indlaeser maerker...</p>
      ) : brands.length === 0 ? (
        <p className="text-gray">Ingen maerker fundet. Opret det foerste ovenfor.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="rounded-2xl border border-soft-grey bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/prisliste/${brand.slug}`}
                  className="flex-1"
                >
                  <h3 className="font-display text-lg font-semibold text-charcoal hover:text-green-eco transition-colors">
                    {brand.name}
                  </h3>
                </Link>
                {/* Active toggle */}
                <button
                  type="button"
                  onClick={() => toggleActive(brand)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    brand.active ? "bg-green-eco" : "bg-gray"
                  }`}
                  aria-label={brand.active ? "Deaktiver" : "Aktiver"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      brand.active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${DEVICE_TYPE_COLORS[brand.device_type]}`}
                >
                  {DEVICE_TYPE_LABELS[brand.device_type]}
                </span>
                <span className="text-sm text-gray">
                  {brand.model_count ?? 0} model{(brand.model_count ?? 0) !== 1 ? "ler" : ""}
                </span>
              </div>

              <Link
                href={`/admin/prisliste/${brand.slug}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-eco hover:underline"
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
