"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import type { RepairBrand, RepairModel, RepairService } from "@/lib/supabase/types";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminModelListPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = use(params);

  const [brand, setBrand] = useState<RepairBrand | null>(null);
  const [models, setModels] = useState<
    (RepairModel & { service_count?: number; cheapest_price?: number | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all brands to find the one matching slug
      const brandsRes = await fetch("/api/admin/brands");
      const brandsData = await brandsRes.json();
      if (!brandsRes.ok) throw new Error(brandsData.error);

      const foundBrand = brandsData.find((b: RepairBrand) => b.slug === brandSlug);
      if (!foundBrand) throw new Error("Maerke ikke fundet");
      setBrand(foundBrand);

      // Fetch models for this brand
      const modelsRes = await fetch(`/api/admin/models?brand_id=${foundBrand.id}`);
      const modelsData = await modelsRes.json();
      if (!modelsRes.ok) throw new Error(modelsData.error);

      // Fetch all services to compute counts/prices
      const servicesRes = await fetch("/api/admin/services");
      const servicesData: RepairService[] = await servicesRes.json();

      const enriched = modelsData.map((m: RepairModel) => {
        const modelServices = Array.isArray(servicesData)
          ? servicesData.filter((s) => s.model_id === m.id)
          : [];
        const activePrices = modelServices
          .filter((s) => s.active)
          .map((s) => s.price_dkk);
        return {
          ...m,
          service_count: modelServices.length,
          cheapest_price: activePrices.length > 0 ? Math.min(...activePrices) : null,
        };
      });

      setModels(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente data");
    } finally {
      setLoading(false);
    }
  }, [brandSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !brand) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          name: formName.trim(),
          slug: slugify(formName),
          sort_order: formSortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFormName("");
      setFormSortOrder(0);
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette model");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(model: RepairModel) {
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !model.active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke opdatere");
    }
  }

  if (loading) {
    return <p className="text-gray">Indlaeser modeller...</p>;
  }

  if (!brand) {
    return <p className="text-red-600">Maerke ikke fundet.</p>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray">
        <Link href="/admin/prisliste" className="hover:text-green-eco transition-colors">
          Prisliste
        </Link>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-charcoal font-medium">{brand.name}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-charcoal">
          {brand.name} — Modeller
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {showForm ? "Annuller" : "Tilfoej model"}
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
            Ny model
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-charcoal">Navn</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="fx iPhone 15 Pro"
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
              {submitting ? "Opretter..." : "Opret model"}
            </button>
          </div>
        </form>
      )}

      {/* Model grid */}
      {models.length === 0 ? (
        <p className="text-gray">Ingen modeller fundet. Tilfoej den foerste ovenfor.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <div
              key={model.id}
              className="rounded-2xl border border-soft-grey bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/prisliste/${brandSlug}/${model.slug}`}
                  className="flex-1"
                >
                  <h3 className="font-display text-lg font-semibold text-charcoal hover:text-green-eco transition-colors">
                    {model.name}
                  </h3>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleActive(model)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    model.active ? "bg-green-eco" : "bg-gray"
                  }`}
                  aria-label={model.active ? "Deaktiver" : "Aktiver"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      model.active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm text-gray">
                <span>
                  {model.service_count ?? 0} reparation{(model.service_count ?? 0) !== 1 ? "er" : ""}
                </span>
                {model.cheapest_price != null && (
                  <>
                    <span className="text-soft-grey">|</span>
                    <span>fra {model.cheapest_price} kr</span>
                  </>
                )}
              </div>

              <Link
                href={`/admin/prisliste/${brandSlug}/${model.slug}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-eco hover:underline"
              >
                Rediger priser
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
