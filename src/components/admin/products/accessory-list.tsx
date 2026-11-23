"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACCESSORY_SUBCATEGORIES } from "@/lib/admin/products/attributes";
import { ACCESSORY_CATEGORY_TO_SLUG, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { Button, DataTable, Input, Notice, PageHeader, Pagination, Segmented, Select, Tag, type Column } from "@/components/admin/ui";
import { formatOere } from "./create/money";
import { BulkEditBar, type BulkChangeInput } from "./bulk-edit-bar";

interface Row {
  id: string;
  title: string;
  slug: string | null;
  subcategory: string | null;
  brand: string | null;
  selling_price: number;
  sale_price: number | null;
  always_in_stock: boolean;
  images: string[] | null;
  compatible_models: string[] | null;
  /** Modeller samlet fra compatible_models og skabelon-koblinger. */
  models?: string[];
  status: "published" | "draft";
  is_active: boolean;
  created_at: string;
  store_stock: number;
  online_stock: number;
  total_stock: number;
}

type StockFilter = "" | "in" | "out" | "order";
type StatusFilter = "" | "published" | "draft";

const labelBySlug = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d.label]));
const LIMIT = 50;

function publicUrl(row: Row): string | null {
  if (!row.slug) return null;
  return `/tilbehoer/${ACCESSORY_CATEGORY_TO_SLUG[row.subcategory ?? ""] ?? "andet"}/${row.slug}`;
}

export function AccessoryList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [stock, setStock] = useState<StockFilter>("");
  const [brands, setBrands] = useState<string[]>([]);
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  // Masseændring: afkrydsede rækker, eller "alle der matcher filtrene".
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ updated: number; failed: number; skipped: { id: string; title: string; reason: string }[] } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetch("/api/platform/sku/brands").then((r) => (r.ok ? r.json() : [])).then((b) => setBrands(Array.isArray(b) ? b : [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ type: "accessory", page: String(page), limit: String(LIMIT) });
    if (query) params.set("search", query);
    if (subcategory) params.set("subcategory", subcategory);
    if (brand) params.set("brand", brand);
    if (status) params.set("status", status);
    if (stock) params.set("stock", stock);
    try {
      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Produkterne kunne ikke hentes."); return; }
      setRows(data.items);
      setTotal(data.total);
    } catch {
      setError("Ingen forbindelse. Prøv igen.");
    } finally {
      setLoading(false);
    }
  }, [page, query, subcategory, brand, status, stock]);

  useEffect(() => { void load(); }, [load]);

  // Et nyt filter giver en ny liste; et gammelt valg må ikke hænge ved usynligt.
  useEffect(() => {
    setSelected(new Set());
    setAllMatching(false);
  }, [query, subcategory, brand, status, stock]);

  function toggle(id: string) {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pageAllSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function togglePage() {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (pageAllSelected) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  }

  function closeBulk() {
    setBulkMode(false);
    setSelected(new Set());
    setAllMatching(false);
  }

  async function applyBulk(change: BulkChangeInput) {
    setBulkBusy(true);
    setError(null);
    setBulkResult(null);
    try {
      const filter: Record<string, string> = {};
      if (query) filter.search = query;
      if (subcategory) filter.subcategory = subcategory;
      if (brand) filter.brand = brand;
      if (status) filter.status = status;
      if (stock) filter.stock = stock;
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "accessory", ...(allMatching ? { filter } : { ids: [...selected] }), change }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error ?? "Ændringen blev ikke gemt."); return; }
      setBulkResult({ updated: data.updated ?? 0, failed: data.failed ?? 0, skipped: data.skipped ?? [] });
      setSelected(new Set());
      setAllMatching(false);
      await load();
    } catch {
      setError("Ingen forbindelse. Prøv igen.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function patch(row: Row, body: Record<string, unknown>, failText: string) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/products/${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setError(failText); return; }
      const data = await res.json();
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...data } : r)));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: Row) {
    setBusyId(row.id);
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/admin/products/${row.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error ?? "Produktet blev ikke slettet."); return; }
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      setTotal((t) => t - 1);
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(row: Row) {
    router.push(`/admin/produkter/${row.id}`);
  }

  async function duplicate(row: Row) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/products/${row.id}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error ?? "Kopien blev ikke oprettet."); return; }
      // Åbn kopien til redigering med det samme; den er gemt som kladde.
      router.push(`/admin/produkter/${data.id}`);
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<Column<Row>[]>(() => [
    ...(bulkMode
      ? [{
          key: "select",
          header: (
            <input type="checkbox" aria-label="Vælg alle på siden" className="h-4 w-4 cursor-pointer accent-[#1A3D2E]" checked={allMatching || pageAllSelected} onChange={togglePage} />
          ),
          className: "w-8",
          render: (r: Row) => (
            <input
              type="checkbox"
              aria-label={`Vælg ${r.title}`}
              className="h-4 w-4 cursor-pointer accent-[#1A3D2E]"
              checked={allMatching || selected.has(r.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggle(r.id)}
            />
          ),
        } satisfies Column<Row>]
      : []),
    {
      key: "product",
      header: "Produkt",
      className: "w-full max-w-0",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-cream">
            {r.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.images[0]} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium leading-snug text-charcoal">{r.title}</p>
            <p className="truncate text-[12px] text-gray">
              {[r.brand, r.subcategory === "spot-glass" ? "Beskyttelsesglas (Spot)" : ACCESSORY_SUBCATEGORIES.find((c) => c.value === r.subcategory)?.label ?? r.subcategory].filter(Boolean).join(" · ")}
              {!r.slug && <span className="text-[#B42318]"> · mangler link</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "models",
      header: "Passer til",
      hideBelow: "lg",
      className: "whitespace-nowrap",
      render: (r) => {
        const m = r.models ?? r.compatible_models ?? [];
        if (!m.length) return <span className="text-gray">–</span>;
        const shown = m.slice(0, 2).map((slug) => labelBySlug.get(slug) ?? slug).join(", ");
        return <span className="text-[13px]">{shown}{m.length > 2 ? ` +${m.length - 2}` : ""}</span>;
      },
    },
    {
      key: "price",
      header: "Pris",
      align: "right",
      className: "whitespace-nowrap",
      render: (r) =>
        r.sale_price != null && r.sale_price < r.selling_price ? (
          <span className="inline-flex flex-col items-end leading-tight">
            <span className="font-semibold text-[#B42318]">
              {formatOere(r.sale_price)} <span className="ml-0.5 rounded bg-[#FDECEC] px-1 py-0.5 text-[11px]">−{Math.round((1 - r.sale_price / r.selling_price) * 100)}%</span>
            </span>
            <span className="text-[12px] text-gray line-through">{formatOere(r.selling_price)}</span>
          </span>
        ) : (
          formatOere(r.selling_price)
        ),
    },
    {
      key: "stock",
      header: "Lager",
      align: "right",
      hideBelow: "sm",
      render: (r) =>
        r.always_in_stock ? (
          <Tag>Bestilling</Tag>
        ) : r.total_stock > 0 ? (
          <span title={`Online ${r.online_stock} · Butik ${r.store_stock}`}>{r.total_stock}</span>
        ) : (
          <Tag tone="red">Udsolgt</Tag>
        ),
    },
    {
      key: "status",
      header: "Status",
      hideBelow: "md",
      className: "whitespace-nowrap",
      render: (r) => (r.status === "published" ? <Tag tone="green">På webshoppen</Tag> : <Tag tone="amber">Kladde</Tag>),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      // På telefon åbner et tryk på rækken produktet; Dupliker og Slet ligger øverst på produktets side.
      hideBelow: "sm",
      className: "whitespace-nowrap",
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="quiet" className="hidden lg:inline-flex" loading={busyId === r.id} onClick={() => patch(r, { status: r.status === "published" ? "draft" : "published" }, "Status blev ikke ændret.")}>
            {r.status === "published" ? "Skjul" : "Vis"}
          </Button>
          <Button size="sm" variant="quiet" onClick={() => openEdit(r)}>Rediger</Button>
          <Button size="sm" variant="quiet" loading={busyId === r.id} onClick={() => duplicate(r)}>Dupliker</Button>
          {publicUrl(r) && (
            <Link href={publicUrl(r)!} target="_blank" prefetch={false} className="hidden h-8 items-center rounded-lg px-3 text-[13px] text-gray hover:bg-cream hover:text-charcoal lg:inline-flex">Se</Link>
          )}
          <Button size="sm" variant="quiet" className="hidden lg:inline-flex" onClick={() => setConfirmDelete(r)}>Slet</Button>
        </div>
      ),
    },
  ], [busyId, bulkMode, selected, allMatching, pageAllSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Tilbehør"
        description="Alt tilbehør på webshoppen og i butikkerne. Klik på en række for at rette."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant={bulkMode ? "primary" : "secondary"} aria-pressed={bulkMode} onClick={() => (bulkMode ? closeBulk() : setBulkMode(true))}>
              Masseændring
            </Button>
            <Link href="/admin/produkter/kasser" className="inline-flex h-10 items-center rounded-lg border border-sand bg-white px-4 text-[14px] font-medium text-charcoal hover:bg-cream">
              Kasser
            </Link>
            <Link href="/admin/produkter/hurtig-cover" className="inline-flex h-10 items-center rounded-lg border border-sand bg-white px-4 text-[14px] font-medium text-charcoal hover:bg-cream">
              Hurtig tilbehørsoptagelse
            </Link>
            <Link href="/admin/produkter/ny?type=accessory" className="inline-flex h-10 items-center rounded-lg bg-green-eco px-4 text-[14px] font-medium text-white hover:bg-green-light">
              Opret produkt
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-72">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søg navn eller mærke" />
          </div>
          <Select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} className="!w-44">
            <option value="">Alle mærker</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
          <Segmented
            label="Lager"
            size="sm"
            value={stock}
            onChange={(v) => { setStock(v); setPage(1); }}
            options={[{ value: "", label: "Alle" }, { value: "in", label: "På lager" }, { value: "order", label: "Bestilling" }, { value: "out", label: "Udsolgt" }]}
          />
          <Segmented
            label="Status"
            size="sm"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[{ value: "", label: "Alle" }, { value: "published", label: "På webshoppen" }, { value: "draft", label: "Kladde" }]}
          />
        </div>
        <Segmented
          label="Kategori"
          size="sm"
          value={subcategory}
          onChange={(v) => { setSubcategory(v); setPage(1); }}
          options={[{ value: "", label: "Alle kategorier" }, ...ACCESSORY_SUBCATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
        />
      </div>

      {error && <div className="mb-4"><Notice tone="danger" action={<Button size="sm" onClick={() => void load()}>Prøv igen</Button>}>{error}</Notice></div>}

      {bulkResult && (
        <div className="mb-4">
          <Notice
            tone={bulkResult.failed > 0 || (bulkResult.updated === 0 && bulkResult.skipped.length > 0) ? "warning" : "success"}
            title={`${bulkResult.updated === 1 ? "1 produkt" : `${bulkResult.updated} produkter`} ændret${bulkResult.skipped.length ? `, ${bulkResult.skipped.length} sprunget over` : ""}${bulkResult.failed ? `, ${bulkResult.failed} fejlede` : ""}`}
            action={<Button size="sm" onClick={() => setBulkResult(null)}>Luk</Button>}
          >
            {bulkResult.skipped.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[13px]">
                {bulkResult.skipped.slice(0, 5).map((s) => <li key={s.id}>{s.title}: {s.reason}</li>)}
                {bulkResult.skipped.length > 5 && <li>… og {bulkResult.skipped.length - 5} mere</li>}
              </ul>
            )}
            {bulkResult.failed > 0 && <p className="text-[13px]">Prøv igen på dem, der fejlede.</p>}
          </Notice>
        </div>
      )}

      {bulkMode && (
        <BulkEditBar
          count={allMatching ? total : selected.size}
          pageCount={rows.length}
          total={total}
          allMatching={allMatching}
          busy={bulkBusy}
          onSelectAllMatching={() => setAllMatching(true)}
          onClear={() => { setSelected(new Set()); setAllMatching(false); }}
          onClose={closeBulk}
          onApply={applyBulk}
        />
      )}

      {confirmDelete && (
        <div className="mb-4">
          <Notice
            tone="warning"
            title={`Slet “${confirmDelete.title}”?`}
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={() => remove(confirmDelete)}>Slet</Button>
                <Button size="sm" onClick={() => setConfirmDelete(null)}>Fortryd</Button>
              </div>
            }
          >
            Kan kun slettes, hvis det aldrig er solgt. Ellers: skjul det i stedet.
          </Notice>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={bulkMode ? (r) => toggle(r.id) : openEdit}
        empty={{
          title: query || subcategory || brand || status || stock ? "Ingen produkter matcher" : "Intet tilbehør endnu",
          description: query || subcategory || brand || status || stock ? "Prøv at fjerne et filter." : "Opret det første, så er det på webshoppen med det samme.",
          action: <Link href="/admin/produkter/ny?type=accessory" className="inline-flex h-9 items-center rounded-lg bg-green-eco px-4 text-[13px] font-medium text-white">Opret produkt</Link>,
        }}
      />
      <div className="mt-3">
        <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
      </div>
    </div>
  );
}
