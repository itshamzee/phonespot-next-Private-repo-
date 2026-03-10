"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import type { RepairBrand, RepairModel, RepairService } from "@/lib/supabase/types";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  Inline-editable price cell                                         */
/* ------------------------------------------------------------------ */

function InlinePrice({
  value,
  onSave,
}: {
  value: number;
  onSave: (newValue: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  async function commit() {
    const parsed = Number(draft);
    if (isNaN(parsed) || parsed < 0) {
      setDraft(String(value));
      setEditing(false);
      return;
    }
    if (parsed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(parsed);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        type="number"
        min={0}
        autoFocus
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
        className="w-24 rounded border border-green-eco bg-white px-2 py-1 text-right text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-green-eco"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="rounded px-2 py-1 text-right text-sm text-charcoal transition-colors hover:bg-sand"
      title="Klik for at redigere"
    >
      {value} kr
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminServiceEditorPage({
  params,
}: {
  params: Promise<{ brandSlug: string; modelSlug: string }>;
}) {
  const { brandSlug, modelSlug } = use(params);

  const [brand, setBrand] = useState<RepairBrand | null>(null);
  const [model, setModel] = useState<RepairModel | null>(null);
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New service form
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formMinutes, setFormMinutes] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formQualityTier, setFormQualityTier] = useState("");
  const [formServiceCategory, setFormServiceCategory] = useState("");
  const [formInfoNote, setFormInfoNote] = useState("");
  const [formTimeEstimate, setFormTimeEstimate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Info note expansion state
  const [expandedInfoId, setExpandedInfoId] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit info modal
  const [editingInfo, setEditingInfo] = useState<string | null>(null);
  const [infoForm, setInfoForm] = useState({
    description: "",
    warranty_info: "",
    includes: "",
    estimated_time_label: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch brands
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

      const foundModel = modelsData.find((m: RepairModel) => m.slug === modelSlug);
      if (!foundModel) throw new Error("Model ikke fundet");
      setModel(foundModel);

      // Fetch services
      const servicesRes = await fetch(`/api/admin/services?model_id=${foundModel.id}`);
      const servicesData = await servicesRes.json();
      if (!servicesRes.ok) throw new Error(servicesData.error);
      setServices(servicesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente data");
    } finally {
      setLoading(false);
    }
  }, [brandSlug, modelSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPrice || !model) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: model.id,
          name: formName.trim(),
          slug: slugify(formName),
          price_dkk: Number(formPrice),
          estimated_minutes: formMinutes ? Number(formMinutes) : null,
          sort_order: formSortOrder,
          quality_tier: formQualityTier || null,
          service_category: formServiceCategory || null,
          info_note: formInfoNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFormName("");
      setFormPrice("");
      setFormMinutes("");
      setFormSortOrder(0);
      setFormQualityTier("");
      setFormServiceCategory("");
      setFormInfoNote("");
      setFormTimeEstimate("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette reparation");
    } finally {
      setSubmitting(false);
    }
  }

  async function updatePrice(serviceId: string, newPrice: number) {
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_dkk: newPrice }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke opdatere pris");
    }
  }

  async function toggleActive(service: RepairService) {
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !service.active }),
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

  async function handleDelete(serviceId: string) {
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setDeletingId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke slette");
    }
  }

  async function saveServiceInfo(serviceId: string) {
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: infoForm.description || null,
          warranty_info: infoForm.warranty_info || null,
          includes: infoForm.includes || null,
          estimated_time_label: infoForm.estimated_time_label || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditingInfo(null);
      await loadData();
    } catch {
      alert("Kunne ikke gemme info");
    }
  }

  if (loading) {
    return <p className="text-gray">Indlaeser reparationer...</p>;
  }

  if (!brand || !model) {
    return <p className="text-red-600">Model ikke fundet.</p>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray">
        <Link href="/admin/prisliste" className="hover:text-green-eco transition-colors">
          Prisliste
        </Link>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <Link
          href={`/admin/prisliste/${brandSlug}`}
          className="hover:text-green-eco transition-colors"
        >
          {brand.name}
        </Link>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-charcoal font-medium">{model.name}</span>
      </nav>

      <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">
        {brand.name} {model.name} — Reparationer
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Services table */}
      {services.length === 0 ? (
        <p className="mb-6 text-gray">Ingen reparationer endnu. Tilfoej den foerste nedenfor.</p>
      ) : (
        <div className="mb-6 overflow-x-auto rounded-2xl border border-soft-grey bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-soft-grey bg-soft-grey/20">
                <th className="px-5 py-3 font-semibold text-charcoal">Navn</th>
                <th className="px-5 py-3 font-semibold text-charcoal text-center">
                  Kvalitet
                </th>
                <th className="px-5 py-3 font-semibold text-charcoal text-right">
                  Pris (DKK)
                </th>
                <th className="px-5 py-3 font-semibold text-charcoal text-right">
                  Estimeret tid
                </th>
                <th className="px-5 py-3 font-semibold text-charcoal text-center">
                  Info
                </th>
                <th className="px-5 py-3 font-semibold text-charcoal text-center">
                  Aktiv
                </th>
                <th className="px-5 py-3 font-semibold text-charcoal text-center">
                  Handling
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <React.Fragment key={service.id}>
                <tr
                  className="border-b border-soft-grey/50 last:border-0 hover:bg-sand/30 transition-colors"
                >
                  <td className="px-5 py-3 text-charcoal font-medium">
                    <span>{service.name}</span>
                    {service.service_category && (
                      <span className="ml-2 text-xs text-gray">({service.service_category})</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {service.quality_tier && (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          service.quality_tier === "standard"
                            ? "bg-stone-200 text-stone-600"
                            : service.quality_tier === "premium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-eco/10 text-green-eco"
                        }`}
                      >
                        {service.quality_tier.charAt(0).toUpperCase() + service.quality_tier.slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <InlinePrice
                      value={service.price_dkk}
                      onSave={(newPrice) => updatePrice(service.id, newPrice)}
                    />
                  </td>
                  <td className="px-5 py-3 text-right text-gray">
                    {service.estimated_time_label
                      ? service.estimated_time_label
                      : service.estimated_minutes
                        ? `${service.estimated_minutes} min`
                        : "\u2014"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {service.info_note ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedInfoId(expandedInfoId === service.id ? null : service.id)
                        }
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                        title={service.info_note}
                      >
                        ?
                      </button>
                    ) : (
                      <span className="text-stone-300">\u2014</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(service)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        service.active ? "bg-green-eco" : "bg-gray"
                      }`}
                      aria-label={service.active ? "Deaktiver" : "Aktiver"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          service.active ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingInfo(service.id);
                          setInfoForm({
                            description: service.description ?? "",
                            warranty_info: service.warranty_info ?? "",
                            includes: service.includes ?? "",
                            estimated_time_label: service.estimated_time_label ?? "",
                          });
                        }}
                        className="rounded px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Rediger ydelsesinfo"
                      >
                        i
                      </button>
                      {deletingId === service.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDelete(service.id)}
                            className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Bekraeft
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="rounded border border-soft-grey px-3 py-1 text-xs font-medium text-charcoal hover:bg-sand"
                          >
                            Annuller
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(service.id)}
                          className="rounded px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Slet
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedInfoId === service.id && service.info_note && (
                  <tr className="bg-blue-50/30">
                    <td colSpan={7} className="px-5 py-3">
                      <p className="text-sm text-charcoal">
                        <span className="font-semibold">Bemærkning:</span> {service.info_note}
                      </p>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add service form */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-soft-grey bg-white p-5"
      >
        <h3 className="mb-4 font-display text-lg font-semibold text-charcoal">
          Tilfoej reparation
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-charcoal">Navn</label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="fx Skaermskift"
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
            <label className="text-sm font-medium text-charcoal">Pris (DKK)</label>
            <input
              type="number"
              required
              min={0}
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              placeholder="499"
              className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-charcoal">Tid (min)</label>
            <input
              type="number"
              min={0}
              value={formMinutes}
              onChange={(e) => setFormMinutes(e.target.value)}
              placeholder="30"
              className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
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
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-charcoal">Kvalitetsniveau</label>
            <select
              value={formQualityTier}
              onChange={(e) => setFormQualityTier(e.target.value)}
              className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            >
              <option value="">Ingen</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="original">Original</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-charcoal">Kategori</label>
            <select
              value={formServiceCategory}
              onChange={(e) => setFormServiceCategory(e.target.value)}
              className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            >
              <option value="">Vaelg...</option>
              <option value="Skaerm">Skaerm</option>
              <option value="Batteri">Batteri</option>
              <option value="Opladning">Opladning</option>
              <option value="Kamera">Kamera</option>
              <option value="Hoejtaler">Hoejtaler</option>
              <option value="Andet">Andet</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-charcoal">Tidsestimat</label>
            <select
              value={formTimeEstimate}
              onChange={(e) => {
                setFormTimeEstimate(e.target.value);
                // Auto-set estimated_minutes based on selection
                const minutesMap: Record<string, string> = {
                  "15 min": "15",
                  "30 min": "30",
                  "45 min": "45",
                  "1 time": "60",
                  "1-2 timer": "90",
                  "2-3 timer": "150",
                  "Indlevering": "",
                };
                setFormMinutes(minutesMap[e.target.value] ?? "");
              }}
              className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            >
              <option value="">Vaelg...</option>
              <option value="15 min">15 min</option>
              <option value="30 min">30 min</option>
              <option value="45 min">45 min</option>
              <option value="1 time">1 time</option>
              <option value="1-2 timer">1-2 timer</option>
              <option value="2-3 timer">2-3 timer</option>
              <option value="Indlevering">Indlevering</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-charcoal">Bemærkning til kunden</label>
            <textarea
              rows={1}
              value={formInfoNote}
              onChange={(e) => setFormInfoNote(e.target.value)}
              placeholder="Vises som tooltip..."
              className="rounded-lg border border-soft-grey bg-white px-4 py-2.5 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-green-eco px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Opretter..." : "Tilfoej reparation"}
          </button>
        </div>
      </form>

      {/* Edit info modal */}
      {editingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              Rediger ydelsesinfo
            </h3>
            <p className="mb-5 text-sm text-gray">
              Denne info vises som tooltip på reparationssiden og i admin.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">Beskrivelse</label>
                <textarea
                  rows={2}
                  value={infoForm.description}
                  onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                  placeholder="Hvad indebærer denne reparation..."
                  className="rounded-lg border border-soft-grey p-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">Inkluderer</label>
                <textarea
                  rows={2}
                  value={infoForm.includes}
                  onChange={(e) => setInfoForm({ ...infoForm, includes: e.target.value })}
                  placeholder="Reservedele, arbejdsløn, test..."
                  className="rounded-lg border border-soft-grey p-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">Estimeret tid</label>
                <input
                  type="text"
                  value={infoForm.estimated_time_label}
                  onChange={(e) => setInfoForm({ ...infoForm, estimated_time_label: e.target.value })}
                  placeholder="30-60 min"
                  className="rounded-lg border border-soft-grey p-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">Garanti</label>
                <input
                  type="text"
                  value={infoForm.warranty_info}
                  onChange={(e) => setInfoForm({ ...infoForm, warranty_info: e.target.value })}
                  placeholder="Livstidsgaranti på reservedelen"
                  className="rounded-lg border border-soft-grey p-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingInfo(null)}
                className="rounded-full border border-soft-grey px-5 py-2 text-sm hover:bg-sand"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => saveServiceInfo(editingInfo)}
                className="rounded-full bg-green-eco px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Gem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
