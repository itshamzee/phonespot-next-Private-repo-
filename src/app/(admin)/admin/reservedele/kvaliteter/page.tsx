"use client";

import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface SpecEntry {
  key: string;
  value: string;
}

interface QualityTier {
  id: string;
  name: string;
  slug: string;
  badge_color: string;
  badge_text_color: string;
  description: string | null;
  short_description: string | null;
  specifications: Record<string, string> | null;
  default_warranty_months: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type CreateForm = {
  name: string;
  slug: string;
  badge_color: string;
  badge_text_color: string;
  description: string;
  short_description: string;
  default_warranty_months: string;
  sort_order: string;
  slugManual: boolean;
};

type EditForm = {
  name: string;
  slug: string;
  badge_color: string;
  badge_text_color: string;
  description: string;
  short_description: string;
  specifications: SpecEntry[];
  default_warranty_months: string;
  sort_order: string;
  active: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/&/g, "og")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function specsToEntries(specs: Record<string, string> | null): SpecEntry[] {
  if (!specs || typeof specs !== "object") return [];
  return Object.entries(specs).map(([key, value]) => ({ key, value: String(value) }));
}

function entriesToSpecs(entries: SpecEntry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of entries) {
    if (e.key.trim()) out[e.key.trim()] = e.value;
  }
  return out;
}

function emptyEditForm(tier: QualityTier): EditForm {
  return {
    name: tier.name,
    slug: tier.slug,
    badge_color: tier.badge_color ?? "#86868B",
    badge_text_color: tier.badge_text_color ?? "#FFFFFF",
    description: tier.description ?? "",
    short_description: tier.short_description ?? "",
    specifications: specsToEntries(tier.specifications),
    default_warranty_months: String(tier.default_warranty_months ?? 12),
    sort_order: String(tier.sort_order ?? 0),
    active: tier.active,
  };
}

const DEFAULT_CREATE: CreateForm = {
  name: "",
  slug: "",
  badge_color: "#86868B",
  badge_text_color: "#FFFFFF",
  description: "",
  short_description: "",
  default_warranty_months: "12",
  sort_order: "0",
  slugManual: false,
};

/* ------------------------------------------------------------------ */
/*  Reusable primitives                                                 */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-emerald-500" : "bg-gray-300"
      }`}
      aria-label={label}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-charcoal/35">
      {children}
    </p>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-charcoal/60">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

const TEXTAREA_CLS =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y";

/* ------------------------------------------------------------------ */
/*  Color picker field                                                  */
/* ------------------------------------------------------------------ */

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-black/10 bg-white p-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLS + " font-mono uppercase"}
          maxLength={7}
          placeholder="#FFFFFF"
        />
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/*  Badge preview                                                       */
/* ------------------------------------------------------------------ */

function BadgePreview({
  name,
  badgeColor,
  badgeTextColor,
}: {
  name: string;
  badgeColor: string;
  badgeTextColor: string;
}) {
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-xs font-bold"
      style={{ backgroundColor: badgeColor, color: badgeTextColor }}
    >
      {name || "Preview"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete dialog                                                       */
/* ------------------------------------------------------------------ */

function DeleteDialog({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl">
        <div className="p-6">
          <h3 className="font-display text-lg font-bold text-charcoal">Slet kvalitetsniveau</h3>
          <p className="mt-2 text-sm text-charcoal/60">
            Er du sikker pa, at du vil slette{" "}
            <span className="font-semibold text-charcoal">{name}</span>? Dette kan ikke fortrydes.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-black/[0.04] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal/60 transition-colors hover:bg-black/[0.04]"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            Slet
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create form                                                         */
/* ------------------------------------------------------------------ */

function CreateFormPanel({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(DEFAULT_CREATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const slugPreview = form.slugManual ? form.slug : generateSlug(form.name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    const slug = form.slugManual ? form.slug.trim() : generateSlug(form.name);
    try {
      const res = await fetch("/api/admin/spare-parts/quality-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug,
          badge_color: form.badge_color,
          badge_text_color: form.badge_text_color,
          description: form.description.trim() || null,
          short_description: form.short_description.trim() || null,
          default_warranty_months: form.default_warranty_months
            ? Number(form.default_warranty_months)
            : 12,
          sort_order: form.sort_order ? Number(form.sort_order) : 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Fejl ved oprettelse");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40">
      <div className="border-b border-emerald-200/60 bg-emerald-50 px-5 py-3">
        <p className="text-sm font-semibold text-emerald-800">Opret nyt kvalitetsniveau</p>
      </div>
      <form onSubmit={handleSubmit} className="p-5">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Navn" required>
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="f.eks. OEM Kvalitet"
              value={form.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!form.slugManual) set("slug", generateSlug(e.target.value));
              }}
              required
              autoFocus
            />
          </Field>

          <Field label="Slug">
            <input
              type="text"
              className={INPUT_CLS + " font-mono"}
              placeholder="auto-genereret"
              value={slugPreview}
              onChange={(e) => {
                set("slugManual", true);
                set("slug", e.target.value);
              }}
            />
          </Field>

          <ColorField
            label="Badge-baggrundsfarve"
            value={form.badge_color}
            onChange={(v) => set("badge_color", v)}
          />

          <ColorField
            label="Badge-tekstfarve"
            value={form.badge_text_color}
            onChange={(v) => set("badge_text_color", v)}
          />

          <div className="sm:col-span-2">
            <Field label="Badge-preview">
              <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] bg-white px-4 py-3">
                <BadgePreview
                  name={form.name}
                  badgeColor={form.badge_color}
                  badgeTextColor={form.badge_text_color}
                />
                <span className="text-xs text-charcoal/40">sa ser dit badge ud</span>
              </div>
            </Field>
          </div>

          <Field label="Kort beskrivelse">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="f.eks. Originale reservedele"
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Garantimaaneder">
              <input
                type="number"
                className={INPUT_CLS}
                min="0"
                value={form.default_warranty_months}
                onChange={(e) => set("default_warranty_months", e.target.value)}
                placeholder="12"
              />
            </Field>
            <Field label="Sortering">
              <input
                type="number"
                className={INPUT_CLS}
                value={form.sort_order}
                onChange={(e) => set("sort_order", e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Beskrivelse">
              <textarea
                className={TEXTAREA_CLS}
                rows={2}
                placeholder="Fuld beskrivelse af kvalitetsniveauet..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? "Opretter..." : "Opret kvalitetsniveau"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-charcoal/50 transition-colors hover:bg-black/[0.04]"
          >
            Annuller
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit form panel                                                     */
/* ------------------------------------------------------------------ */

function EditFormPanel({
  tier,
  onSaved,
  onCancel,
}: {
  tier: QualityTier;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EditForm>(() => emptyEditForm(tier));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSpec(index: number, field: keyof SpecEntry, value: string) {
    setForm((prev) => {
      const next = [...prev.specifications];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, specifications: next };
    });
  }

  function addSpec() {
    setForm((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: "", value: "" }],
    }));
  }

  function removeSpec(index: number) {
    setForm((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/spare-parts/quality-tiers/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          badge_color: form.badge_color,
          badge_text_color: form.badge_text_color,
          description: form.description.trim() || null,
          short_description: form.short_description.trim() || null,
          specifications: entriesToSpecs(form.specifications),
          default_warranty_months: form.default_warranty_months
            ? Number(form.default_warranty_months)
            : 12,
          sort_order: form.sort_order ? Number(form.sort_order) : 0,
          active: form.active,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Fejl ved gemning");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-black/[0.04] bg-stone-50/40 p-5">
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grundinfo */}
      <div className="mb-5">
        <SectionHeading>Grundinfo</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Navn" required>
            <input
              type="text"
              className={INPUT_CLS}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </Field>
          <Field label="Slug">
            <input
              type="text"
              className={INPUT_CLS + " font-mono"}
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
          </Field>
          <Field label="Kort beskrivelse">
            <input
              type="text"
              className={INPUT_CLS}
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              placeholder="Vises pa produktkort"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Fuld beskrivelse">
              <textarea
                className={TEXTAREA_CLS}
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="mb-5">
        <SectionHeading>Badge</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <ColorField
            label="Baggrundsfarve"
            value={form.badge_color}
            onChange={(v) => set("badge_color", v)}
          />
          <ColorField
            label="Tekstfarve"
            value={form.badge_text_color}
            onChange={(v) => set("badge_text_color", v)}
          />
          <div className="sm:col-span-2">
            <Field label="Preview">
              <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] bg-white px-4 py-3">
                <BadgePreview
                  name={form.name}
                  badgeColor={form.badge_color}
                  badgeTextColor={form.badge_text_color}
                />
                <span className="text-xs text-charcoal/40">sa ser badge ud</span>
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="mb-5">
        <SectionHeading>Specifikationer</SectionHeading>
        <div className="space-y-2">
          {form.specifications.map((spec, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Nogleord"
                value={spec.key}
                onChange={(e) => updateSpec(idx, "key", e.target.value)}
              />
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Vaerdi"
                value={spec.value}
                onChange={(e) => updateSpec(idx, "value", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeSpec(idx)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-charcoal/30 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Fjern"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSpec}
            className="flex items-center gap-2 rounded-xl border border-dashed border-black/15 px-4 py-2 text-sm font-medium text-charcoal/50 transition-colors hover:border-emerald-400 hover:text-emerald-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tilfoej specifikation
          </button>
        </div>
      </div>

      {/* Indstillinger */}
      <div className="mb-5">
        <SectionHeading>Indstillinger</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Garantimaaneder">
            <input
              type="number"
              className={INPUT_CLS}
              min="0"
              value={form.default_warranty_months}
              onChange={(e) => set("default_warranty_months", e.target.value)}
              placeholder="12"
            />
          </Field>
          <Field label="Sorteringsraekkefolge">
            <input
              type="number"
              className={INPUT_CLS}
              value={form.sort_order}
              onChange={(e) => set("sort_order", e.target.value)}
            />
          </Field>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal/60">Aktiv</label>
            <div className="flex items-center gap-2 pt-1.5">
              <Toggle
                checked={form.active}
                onChange={(v) => set("active", v)}
                label="Aktiver/deaktiver kvalitetsniveau"
              />
              <span className="text-sm text-charcoal/60">{form.active ? "Aktiv" : "Inaktiv"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
        >
          {saving ? "Gemmer..." : "Gem aendringer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-charcoal/50 transition-colors hover:bg-black/[0.04]"
        >
          Annuller
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Quality tier card                                                   */
/* ------------------------------------------------------------------ */

function TierCard({
  tier,
  onToggleActive,
  onDeleted,
  onSaved,
}: {
  tier: QualityTier;
  onToggleActive: (t: QualityTier) => void;
  onDeleted: () => void;
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/spare-parts/quality-tiers/${tier.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Sletning fejlede");
      }
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fejl ved sletning");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      {confirmDelete && (
        <DeleteDialog
          name={tier.name}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div
        className={`overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm transition-all ${
          !tier.active ? "opacity-60" : ""
        }`}
      >
        {/* Collapsed header */}
        <div className="flex items-center gap-3 px-5 py-4">
          {/* Expand */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-charcoal/30 transition-colors hover:bg-black/[0.04] hover:text-charcoal/60"
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* Badge + name */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BadgePreview
              name={tier.name}
              badgeColor={tier.badge_color}
              badgeTextColor={tier.badge_text_color}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-charcoal">{tier.name}</p>
              {tier.short_description && (
                <p className="truncate text-xs text-charcoal/40">{tier.short_description}</p>
              )}
            </div>
          </div>

          {/* Warranty */}
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-xs text-charcoal/30">Garanti</p>
            <p className="font-semibold tabular-nums text-charcoal/60">
              {tier.default_warranty_months} mdr.
            </p>
          </div>

          {/* Sort order */}
          <div className="hidden shrink-0 text-right md:block">
            <p className="text-xs text-charcoal/30">Sortering</p>
            <p className="font-semibold tabular-nums text-charcoal/60">{tier.sort_order}</p>
          </div>

          {/* Active toggle */}
          <div className="shrink-0">
            <Toggle
              checked={tier.active}
              onChange={() => onToggleActive(tier)}
              label={tier.active ? "Deaktiver" : "Aktiver"}
            />
          </div>

          {/* Edit / Delete */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/30 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              title="Rediger"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/30 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              title="Slet"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded edit form */}
        {expanded && (
          <EditFormPanel
            tier={tier}
            onSaved={() => {
              setExpanded(false);
              onSaved();
            }}
            onCancel={() => setExpanded(false)}
          />
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function KvaliteterPage() {
  const [tiers, setTiers] = useState<QualityTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/spare-parts/quality-tiers");
      if (!res.ok) throw new Error("Kunne ikke hente kvalitetsniveauer");
      const data = await res.json();
      setTiers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  async function handleToggleActive(tier: QualityTier) {
    try {
      const res = await fetch(`/api/admin/spare-parts/quality-tiers/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !tier.active }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Fejl ved opdatering");
      }
      const updated: QualityTier = await res.json();
      setTiers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fejl");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">
            Reservedele — Kvalitetsniveauer
          </h1>
          <p className="mt-1 text-sm text-charcoal/50">
            Administrer kvalitetsniveauer og badge-farver for reservedele
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Opret ny
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateFormPanel
          onCreated={() => {
            setShowCreate(false);
            fetchTiers();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400" />
            </div>
            <p className="text-sm text-charcoal/40">Indlaeser kvalitetsniveauer...</p>
          </div>
        </div>
      ) : tiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 py-20">
          <svg
            className="mb-3 h-10 w-10 text-charcoal/15"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          <p className="text-sm font-medium text-charcoal/40">Ingen kvalitetsniveauer endnu</p>
          <p className="mt-1 text-xs text-charcoal/30">
            Klik &quot;Opret ny&quot; for at tilfoeje det forste
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              onToggleActive={handleToggleActive}
              onDeleted={fetchTiers}
              onSaved={fetchTiers}
            />
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && tiers.length > 0 && (
        <p className="mt-4 text-right text-xs text-charcoal/30">
          {tiers.length} {tiers.length === 1 ? "kvalitetsniveau" : "kvalitetsniveauer"} i alt
        </p>
      )}
    </div>
  );
}
