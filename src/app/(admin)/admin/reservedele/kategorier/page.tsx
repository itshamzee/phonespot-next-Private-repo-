"use client";

import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface FaqItem {
  question: string;
  answer: string;
}

interface SparePartCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_text: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  quality_guide: string | null;
  faq: FaqItem[];
  default_warranty_months: number | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type CreateForm = {
  name: string;
  slug: string;
  icon: string;
  description: string;
  default_warranty_months: string;
  sort_order: string;
  slugManual: boolean;
};

type EditForm = {
  name: string;
  slug: string;
  icon: string;
  description: string;
  seo_title: string;
  seo_description: string;
  seo_text: string;
  hero_title: string;
  hero_subtitle: string;
  quality_guide: string;
  faq: FaqItem[];
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

function emptyEditForm(cat: SparePartCategory): EditForm {
  return {
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon ?? "",
    description: cat.description ?? "",
    seo_title: cat.seo_title ?? "",
    seo_description: cat.seo_description ?? "",
    seo_text: cat.seo_text ?? "",
    hero_title: cat.hero_title ?? "",
    hero_subtitle: cat.hero_subtitle ?? "",
    quality_guide: cat.quality_guide ?? "",
    faq: Array.isArray(cat.faq) ? cat.faq : [],
    default_warranty_months:
      cat.default_warranty_months != null ? String(cat.default_warranty_months) : "",
    sort_order: String(cat.sort_order),
    active: cat.active,
  };
}

const DEFAULT_CREATE: CreateForm = {
  name: "",
  slug: "",
  icon: "",
  description: "",
  default_warranty_months: "12",
  sort_order: "0",
  slugManual: false,
};

/* ------------------------------------------------------------------ */
/*  Toggle component                                                    */
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

/* ------------------------------------------------------------------ */
/*  Section heading                                                     */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-charcoal/35">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Field                                                               */
/* ------------------------------------------------------------------ */

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
/*  Delete confirmation dialog                                          */
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
          <h3 className="font-display text-lg font-bold text-charcoal">Slet kategori</h3>
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

function CreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(DEFAULT_CREATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof CreateForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    const slug = form.slugManual ? form.slug.trim() : generateSlug(form.name);
    try {
      const res = await fetch("/api/admin/spare-parts/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug,
          icon: form.icon.trim() || null,
          description: form.description.trim() || null,
          default_warranty_months: form.default_warranty_months
            ? Number(form.default_warranty_months)
            : null,
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

  const slugPreview = form.slugManual ? form.slug : generateSlug(form.name);

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40">
      <div className="border-b border-emerald-200/60 bg-emerald-50 px-5 py-3">
        <p className="text-sm font-semibold text-emerald-800">Opret ny kategori</p>
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
              placeholder="f.eks. Skærme"
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

          <Field label="Ikon (emoji eller tekst)">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="f.eks. screwdriver"
              value={form.icon}
              onChange={(e) => set("icon", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Garantimaaneder">
              <input
                type="number"
                className={INPUT_CLS}
                placeholder="12"
                min="0"
                value={form.default_warranty_months}
                onChange={(e) => set("default_warranty_months", e.target.value)}
              />
            </Field>
            <Field label="Sortering">
              <input
                type="number"
                className={INPUT_CLS}
                placeholder="0"
                value={form.sort_order}
                onChange={(e) => set("sort_order", e.target.value)}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Beskrivelse">
              <textarea
                className={TEXTAREA_CLS}
                placeholder="Kort beskrivelse af kategorien..."
                rows={2}
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
            {saving ? "Opretter..." : "Opret kategori"}
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
/*  Edit form                                                           */
/* ------------------------------------------------------------------ */

function EditFormPanel({
  category,
  onSaved,
  onCancel,
}: {
  category: SparePartCategory;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EditForm>(() => emptyEditForm(category));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateFaq(index: number, field: keyof FaqItem, value: string) {
    setForm((prev) => {
      const next = [...prev.faq];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, faq: next };
    });
  }

  function addFaq() {
    setForm((prev) => ({
      ...prev,
      faq: [...prev.faq, { question: "", answer: "" }],
    }));
  }

  function removeFaq(index: number) {
    setForm((prev) => ({
      ...prev,
      faq: prev.faq.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/spare-parts/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          icon: form.icon.trim() || null,
          description: form.description.trim() || null,
          seo_title: form.seo_title.trim() || null,
          seo_description: form.seo_description.trim() || null,
          seo_text: form.seo_text.trim() || null,
          hero_title: form.hero_title.trim() || null,
          hero_subtitle: form.hero_subtitle.trim() || null,
          quality_guide: form.quality_guide.trim() || null,
          faq: form.faq.filter((f) => f.question.trim()),
          default_warranty_months: form.default_warranty_months
            ? Number(form.default_warranty_months)
            : null,
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
          <Field label="Ikon">
            <input
              type="text"
              className={INPUT_CLS}
              value={form.icon}
              onChange={(e) => set("icon", e.target.value)}
              placeholder="f.eks. screwdriver"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Beskrivelse">
              <textarea
                className={TEXTAREA_CLS}
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* SEO */}
      <div className="mb-5">
        <SectionHeading>SEO</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="SEO-titel">
            <input
              type="text"
              className={INPUT_CLS}
              value={form.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
              placeholder="Metatitel til sogemaskiner"
            />
          </Field>
          <Field label="SEO-beskrivelse">
            <input
              type="text"
              className={INPUT_CLS}
              value={form.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
              placeholder="Meta description"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="SEO-tekst (synlig pa siden)">
              <textarea
                className={TEXTAREA_CLS}
                rows={3}
                value={form.seo_text}
                onChange={(e) => set("seo_text", e.target.value)}
                placeholder="Langt SEO-indhold til bunden af kategorisiden..."
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mb-5">
        <SectionHeading>Hero</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hero-overskrift">
            <input
              type="text"
              className={INPUT_CLS}
              value={form.hero_title}
              onChange={(e) => set("hero_title", e.target.value)}
              placeholder="Stor overskrift pa kategorisiden"
            />
          </Field>
          <Field label="Hero-undertekst">
            <input
              type="text"
              className={INPUT_CLS}
              value={form.hero_subtitle}
              onChange={(e) => set("hero_subtitle", e.target.value)}
              placeholder="Undertekst"
            />
          </Field>
        </div>
      </div>

      {/* Kvalitetsguide */}
      <div className="mb-5">
        <SectionHeading>Kvalitetsguide</SectionHeading>
        <Field label="Kvalitetsguide-tekst">
          <textarea
            className={TEXTAREA_CLS}
            rows={3}
            value={form.quality_guide}
            onChange={(e) => set("quality_guide", e.target.value)}
            placeholder="Vejledning til kunden om kvaliteter..."
          />
        </Field>
      </div>

      {/* FAQ */}
      <div className="mb-5">
        <SectionHeading>FAQ</SectionHeading>
        <div className="space-y-3">
          {form.faq.map((item, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-xl border border-black/[0.06] bg-white"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] px-4 py-2.5">
                <p className="text-xs font-semibold text-charcoal/50">Sporgsmal {idx + 1}</p>
                <button
                  type="button"
                  onClick={() => removeFaq(idx)}
                  className="rounded-lg p-1 text-charcoal/30 transition-colors hover:bg-red-50 hover:text-red-500"
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
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <Field label="Sporgsmal">
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={item.question}
                    onChange={(e) => updateFaq(idx, "question", e.target.value)}
                    placeholder="Hvad er..."
                  />
                </Field>
                <Field label="Svar">
                  <textarea
                    className={TEXTAREA_CLS}
                    rows={2}
                    value={item.answer}
                    onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                    placeholder="Svaret pa sporgsmalet..."
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addFaq}
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
            Tilfoej sporgsmal
          </button>
        </div>
      </div>

      {/* Garanti + Sortering + Aktiv */}
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
                label="Aktiver/deaktiver kategori"
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
/*  Category card                                                       */
/* ------------------------------------------------------------------ */

function CategoryCard({
  category,
  onToggleActive,
  onDeleted,
  onSaved,
}: {
  category: SparePartCategory;
  onToggleActive: (cat: SparePartCategory) => void;
  onDeleted: () => void;
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/spare-parts/categories/${category.id}`, {
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
          name={category.name}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div
        className={`overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm transition-all ${
          !category.active ? "opacity-60" : ""
        }`}
      >
        {/* Collapsed row */}
        <div className="flex items-center gap-3 px-5 py-4">
          {/* Expand chevron */}
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

          {/* Name + slug */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-charcoal">{category.name}</p>
            <p className="truncate text-xs text-charcoal/40 font-mono">{category.slug}</p>
          </div>

          {/* Sort order */}
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-xs text-charcoal/30">Sortering</p>
            <p className="font-semibold tabular-nums text-charcoal/60">{category.sort_order}</p>
          </div>

          {/* Active toggle */}
          <div className="shrink-0">
            <Toggle
              checked={category.active}
              onChange={() => onToggleActive(category)}
              label={category.active ? "Deaktiver" : "Aktiver"}
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
            category={category}
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

export default function KategorierPage() {
  const [categories, setCategories] = useState<SparePartCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/spare-parts/categories");
      if (!res.ok) throw new Error("Kunne ikke hente kategorier");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleToggleActive(cat: SparePartCategory) {
    try {
      const res = await fetch(`/api/admin/spare-parts/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !cat.active }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Fejl ved opdatering");
      }
      const updated: SparePartCategory = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
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
            Reservedele — Kategorier
          </h1>
          <p className="mt-1 text-sm text-charcoal/50">
            Administrer kategorier for reservedelssektionen
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
        <CreateForm
          onCreated={() => {
            setShowCreate(false);
            fetchCategories();
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
            <p className="text-sm text-charcoal/40">Indlaeser kategorier...</p>
          </div>
        </div>
      ) : categories.length === 0 ? (
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
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
            />
          </svg>
          <p className="text-sm font-medium text-charcoal/40">Ingen kategorier endnu</p>
          <p className="mt-1 text-xs text-charcoal/30">
            Klik &quot;Opret ny&quot; for at tilfoeje den forste
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onToggleActive={handleToggleActive}
              onDeleted={fetchCategories}
              onSaved={fetchCategories}
            />
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && categories.length > 0 && (
        <p className="mt-4 text-right text-xs text-charcoal/30">
          {categories.length} {categories.length === 1 ? "kategori" : "kategorier"} i alt
        </p>
      )}
    </div>
  );
}
