"use client";

import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  product_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent: { id: string; name: string; slug: string } | null;
}

type ProductType = "device" | "accessory" | "spare-part";

const TABS: { value: ProductType; label: string }[] = [
  { value: "device", label: "Enheder" },
  { value: "accessory", label: "Tilbehoer" },
  { value: "spare-part", label: "Reservedele" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
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

/** Group categories into parent -> children tree */
function buildTree(categories: Category[]) {
  const parents = categories.filter((c) => !c.parent_id);
  const children = categories.filter((c) => c.parent_id);

  return parents.map((p) => ({
    ...p,
    children: children.filter((c) => c.parent_id === p.id),
  }));
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KategorierPage() {
  const [activeTab, setActiveTab] = useState<ProductType>("device");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Expanded parent rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"name" | "slug" | null>(null);
  const [editValue, setEditValue] = useState("");

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Fetch                                                            */
  /* ---------------------------------------------------------------- */

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/categories?product_type=${activeTab}`);
      if (!res.ok) throw new Error("Kunne ikke hente kategorier");
      const data: Category[] = await res.json();
      setCategories(data);
      // Auto-expand all parents
      const parentIds = data.filter((c) => !c.parent_id).map((c) => c.id);
      setExpanded(new Set(parentIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  async function handleToggleActive(cat: Category) {
    try {
      const res = await fetch("/api/platform/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, is_active: !cat.is_active }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fejl ved opdatering");
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: !cat.is_active } : c))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fejl");
    }
  }

  function startEdit(cat: Category, field: "name" | "slug") {
    setEditingId(cat.id);
    setEditField(field);
    setEditValue(field === "name" ? cat.name : cat.slug);
  }

  async function saveEdit() {
    if (!editingId || !editField) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }

    try {
      const res = await fetch("/api/platform/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, [editField]: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fejl ved opdatering");
      }
      const updated: Category = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fejl");
    } finally {
      cancelEdit();
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditField(null);
    setEditValue("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError("");

    const slug = slugManual ? newSlug.trim() : generateSlug(newName);

    try {
      const res = await fetch("/api/platform/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug,
          parent_id: newParentId || null,
          product_type: activeTab,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fejl ved oprettelse");
      }
      // Reset form
      setNewName("");
      setNewSlug("");
      setNewParentId("");
      setSlugManual(false);
      setShowAddForm(false);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setSaving(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Tree data                                                        */
  /* ---------------------------------------------------------------- */

  const tree = buildTree(categories);
  const parentCategories = categories.filter((c) => !c.parent_id && c.is_active);

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                    */
  /* ---------------------------------------------------------------- */

  function renderEditableCell(cat: Category, field: "name" | "slug") {
    const isEditing = editingId === cat.id && editField === field;

    if (isEditing) {
      return (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") cancelEdit();
          }}
          onBlur={saveEdit}
          className="w-full rounded border border-emerald-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      );
    }

    const value = field === "name" ? cat.name : cat.slug;
    return (
      <button
        type="button"
        onClick={() => startEdit(cat, field)}
        className="cursor-pointer rounded px-2 py-1 text-left text-sm hover:bg-emerald-50 transition-colors"
        title="Klik for at redigere"
      >
        {value}
      </button>
    );
  }

  function renderToggle(cat: Category) {
    return (
      <button
        type="button"
        onClick={() => handleToggleActive(cat)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          cat.is_active ? "bg-emerald-500" : "bg-gray-300"
        }`}
        title={cat.is_active ? "Deaktiver" : "Aktiver"}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            cat.is_active ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    );
  }

  function renderRow(cat: Category, isChild: boolean) {
    return (
      <div
        key={cat.id}
        className={`flex items-center gap-3 border-b border-black/[0.04] px-4 py-2 ${
          isChild ? "pl-12 bg-gray-50/60" : ""
        } ${!cat.is_active ? "opacity-50" : ""}`}
      >
        {/* Expand toggle for parents */}
        {!isChild ? (
          <button
            type="button"
            onClick={() => toggleExpanded(cat.id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-charcoal/40 hover:bg-black/[0.04]"
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded.has(cat.id) ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ) : (
          <div className="w-6 shrink-0" />
        )}

        {/* Name */}
        <div className="min-w-0 flex-1">{renderEditableCell(cat, "name")}</div>

        {/* Slug */}
        <div className="hidden min-w-0 flex-1 sm:block">
          <span className="text-xs text-charcoal/40">/</span>
          {renderEditableCell(cat, "slug")}
        </div>

        {/* Sort order */}
        <div className="hidden w-16 shrink-0 text-center text-xs text-charcoal/40 md:block">
          {cat.sort_order}
        </div>

        {/* Active toggle */}
        <div className="w-12 shrink-0 text-center">{renderToggle(cat)}</div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Kategorier</h1>
          <p className="mt-1 text-sm text-charcoal/50">
            Administrer kategorier for produkter i webshoppen
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Opret kategori
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-black/[0.04] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveTab(tab.value);
              setShowAddForm(false);
              cancelEdit();
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.value
                ? "bg-white text-charcoal shadow-sm"
                : "text-charcoal/40 hover:text-charcoal/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-4 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50">
          <div className="border-b border-emerald-200/60 bg-emerald-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-emerald-800">Opret ny kategori</p>
          </div>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal/60">
                  Navn <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!slugManual) setNewSlug(generateSlug(e.target.value));
                  }}
                  placeholder="f.eks. Smartphones"
                  required
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal/60">
                  Slug
                </label>
                <input
                  type="text"
                  value={slugManual ? newSlug : generateSlug(newName)}
                  onChange={(e) => {
                    setSlugManual(true);
                    setNewSlug(e.target.value);
                  }}
                  placeholder="auto-genereret"
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-mono focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Parent */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal/60">
                  Overordnet kategori
                </label>
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Ingen (hovedkategori)</option>
                  {parentCategories.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product type (locked) */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal/60">
                  Produkttype
                </label>
                <input
                  type="text"
                  value={TABS.find((t) => t.value === activeTab)?.label ?? activeTab}
                  disabled
                  className="w-full rounded-lg border border-black/10 bg-gray-100 px-3 py-2 text-sm text-charcoal/50"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? "Opretter..." : "Opret"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewName("");
                  setNewSlug("");
                  setNewParentId("");
                  setSlugManual(false);
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal/50 hover:bg-black/[0.04]"
              >
                Annuller
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-sm">
        {/* Column headers */}
        <div className="flex items-center gap-3 border-b border-black/[0.06] bg-gray-50 px-4 py-2.5">
          <div className="w-6 shrink-0" />
          <div className="min-w-0 flex-1 text-[11px] font-bold uppercase tracking-wider text-charcoal/35">
            Navn
          </div>
          <div className="hidden min-w-0 flex-1 text-[11px] font-bold uppercase tracking-wider text-charcoal/35 sm:block">
            Slug
          </div>
          <div className="hidden w-16 shrink-0 text-center text-[11px] font-bold uppercase tracking-wider text-charcoal/35 md:block">
            Sortering
          </div>
          <div className="w-12 shrink-0 text-center text-[11px] font-bold uppercase tracking-wider text-charcoal/35">
            Aktiv
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400" />
              </div>
              <p className="text-sm text-charcoal/40">Indlaeser kategorier...</p>
            </div>
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="mb-3 h-10 w-10 text-charcoal/15" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <p className="text-sm font-medium text-charcoal/40">Ingen kategorier fundet</p>
            <p className="mt-1 text-xs text-charcoal/30">
              Klik &quot;Opret kategori&quot; for at tilføje den første
            </p>
          </div>
        ) : (
          <div>
            {tree.map((parent) => (
              <div key={parent.id}>
                {renderRow(parent, false)}
                {expanded.has(parent.id) &&
                  parent.children.map((child) => renderRow(child, true))}
              </div>
            ))}

            {/* Orphan children (parent from different product type — shouldn't happen but just in case) */}
            {categories
              .filter(
                (c) =>
                  c.parent_id &&
                  !categories.some((p) => p.id === c.parent_id && !p.parent_id)
              )
              .map((orphan) => renderRow(orphan, true))}
          </div>
        )}
      </div>

      {/* Category count */}
      {!loading && categories.length > 0 && (
        <p className="mt-3 text-right text-xs text-charcoal/30">
          {categories.length} {categories.length === 1 ? "kategori" : "kategorier"} i alt
        </p>
      )}
    </div>
  );
}
