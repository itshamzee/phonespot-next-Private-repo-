"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { formatDKK, formatDate, parseDKKToOere } from "@/lib/platform/format";
import { DeviceTransferDialog } from "@/components/platform/device-transfer-dialog";
import { BarcodeLabelDialog, labelHTML, PRINT_STYLES } from "@/components/platform/barcode-label";

interface StockFilters {
  location_id?: string;
  status?: string;
  grade?: string;
  search?: string;
  category?: string;
  brand?: string;
}

interface Device {
  id: string;
  barcode: string;
  grade: "N" | "P" | "A" | "B" | "C" | null;
  status: string;
  storage: string | null;
  color: string | null;
  purchase_price: number;
  selling_price: number | null;
  source: string | null;
  created_at: string;
  template: {
    display_name: string;
    category: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
}

interface TransferTarget {
  id: string;
  barcode: string;
  templateName: string;
  locationId: string;
  locationName: string;
}

interface StockTableProps {
  filters: StockFilters;
}

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25 pr. side" },
  { value: 50, label: "50 pr. side" },
  { value: 100, label: "100 pr. side" },
  { value: 0, label: "Vis alle" },
];

// Supabase capper svar på 1000 rækker — bruges som limit når "Vis alle" er valgt
const SHOW_ALL_LIMIT = 1000;

const GRADE_BADGE: Record<string, string> = {
  N: "bg-blue-100 text-blue-800 border-blue-200",
  P: "bg-sky-100 text-sky-800 border-sky-200",
  A: "bg-green-100 text-green-800 border-green-200",
  B: "bg-yellow-100 text-yellow-800 border-yellow-200",
  C: "bg-orange-100 text-orange-800 border-orange-200",
};

const STATUS_BADGE: Record<string, string> = {
  intake: "bg-stone-100 text-stone-700 border-stone-200",
  graded: "bg-blue-100 text-blue-700 border-blue-200",
  listed: "bg-green-100 text-green-700 border-green-200",
  reserved: "bg-purple-100 text-purple-700 border-purple-200",
  sold: "bg-stone-200 text-stone-500 border-stone-300",
  shipped: "bg-sky-100 text-sky-700 border-sky-200",
  picked_up: "bg-teal-100 text-teal-700 border-teal-200",
  returned: "bg-red-100 text-red-700 border-red-200",
  delisted: "bg-stone-200 text-stone-500 border-stone-300",
};

const STATUS_LABELS: Record<string, string> = {
  intake: "Modtaget",
  graded: "Graderet",
  listed: "Til salg",
  reserved: "Reserveret",
  sold: "Solgt",
  shipped: "Sendt",
  picked_up: "Afhentet",
  returned: "Returneret",
  delisted: "Arkiveret",
};

export function StockTable({ filters }: StockTableProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Inline price editing
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");

  // Transfer dialog
  const [transferDevice, setTransferDevice] = useState<TransferTarget | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  // Label print dialog
  const [labelDevice, setLabelDevice] = useState<Device | null>(null);

  // Bulk label print
  const bulkPrintIframeRef = useRef<HTMLIFrameElement>(null);

  const fetchDevices = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.location_id) params.set("location_id", filters.location_id);
      if (filters.status) params.set("status", filters.status);
      if (filters.grade) params.set("grade", filters.grade);
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.brand) params.set("brand", filters.brand);
      params.set("limit", String(pageSize === 0 ? SHOW_ALL_LIMIT : pageSize));
      params.set("offset", String(currentOffset));

      const res = await fetch(`/api/platform/devices?${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente enheder");
      const data: { devices: Device[]; count: number } = await res.json();
      setDevices(data.devices);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize]);

  useEffect(() => {
    setOffset(0);
    setSelected(new Set());
  }, [filters, pageSize]);

  useEffect(() => {
    fetchDevices(offset);
  }, [fetchDevices, offset]);

  // ── Quick status change ──
  async function quickStatusChange(deviceId: string, newStatus: string) {
    setUpdatingId(deviceId);
    try {
      const res = await fetch(`/api/platform/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Kunne ikke opdatere status");
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, status: newStatus } : d)),
      );
    } catch {
      fetchDevices(offset);
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Bulk list for sale ──
  async function bulkListForSale() {
    if (selected.size === 0) return;
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/platform/devices/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "listed" }),
          }),
        ),
      );
      setSelected(new Set());
      fetchDevices(offset);
    } catch {
      fetchDevices(offset);
    } finally {
      setBulkUpdating(false);
    }
  }

  // ── Inline price save ──
  async function saveInlinePrice(deviceId: string) {
    const oere = parseDKKToOere(editingPriceValue);
    if (!oere || oere <= 0) {
      setEditingPriceId(null);
      return;
    }
    try {
      const res = await fetch(`/api/platform/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selling_price: oere }),
      });
      if (res.ok) {
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, selling_price: oere } : d)),
        );
      }
    } catch {
      /* ignore */
    } finally {
      setEditingPriceId(null);
    }
  }

  // ── Selection helpers ──
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === devices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(devices.map((d) => d.id)));
    }
  }

  function openTransfer(device: Device) {
    setTransferDevice({
      id: device.id,
      barcode: device.barcode,
      templateName: device.template?.display_name ?? "Ukendt model",
      locationId: device.location?.id ?? "",
      locationName: device.location?.name ?? "Ukendt",
    });
    setTransferOpen(true);
  }

  function bulkPrintLabels() {
    if (selected.size === 0) return;
    const iframe = bulkPrintIframeRef.current;
    if (!iframe) return;

    const selectedDevices = devices.filter((d) => selected.has(d.id));

    const BULK_PRINT_STYLES = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { size: 62mm 29mm; margin: 0; }
      .label {
        width: 62mm;
        height: 29mm;
        font-family: 'DM Sans', 'Barlow Condensed', Arial, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 1.5mm 2.5mm;
        overflow: hidden;
        page-break-after: always;
      }
      .label:last-child { page-break-after: auto; }
      .barcode {
        font-family: 'Barlow Condensed', 'Courier New', monospace;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-align: center;
        line-height: 1.1;
      }
      .model {
        font-size: 9px;
        font-weight: 600;
        text-align: center;
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .meta {
        font-size: 8px;
        text-align: center;
        margin-top: 1px;
        color: #444;
      }
      .grade {
        display: inline-block;
        font-size: 8px;
        font-weight: 700;
        border: 0.5px solid #999;
        border-radius: 2px;
        padding: 0 2px;
      }
      .price {
        font-size: 10px;
        font-weight: 700;
        text-align: center;
        margin-top: 1px;
      }
    `;

    const labelsMarkup = selectedDevices
      .map(
        (d) =>
          `<div class="label">${labelHTML({
            barcode: d.barcode,
            modelName: d.template?.display_name ?? "Ukendt",
            grade: d.grade ?? "B",
            sellingPrice: d.selling_price,
            storage: d.storage,
            color: d.color,
          })}</div>`,
      )
      .join("");

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head><style>${BULK_PRINT_STYLES}</style></head>
        <body>${labelsMarkup}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 200);
  }

  const effectiveLimit = pageSize === 0 ? SHOW_ALL_LIMIT : pageSize;
  const totalPages = Math.max(1, Math.ceil(count / effectiveLimit));
  const currentPage = Math.floor(offset / effectiveLimit) + 1;
  const hasListable = devices.some((d) => ["intake", "graded", "returned"].includes(d.status));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b border-stone-200 bg-charcoal/[0.03] px-4 py-2.5">
          <span className="text-sm font-semibold text-stone-600">
            {selected.size} valgt
          </span>
          <button
            type="button"
            disabled={bulkUpdating}
            onClick={bulkListForSale}
            className="rounded-lg bg-green-eco/10 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-eco/20 disabled:opacity-40"
          >
            {bulkUpdating ? "Opdaterer..." : "Sæt alle til salg"}
          </button>
          <button
            type="button"
            onClick={bulkPrintLabels}
            className="rounded-lg bg-stone-800/10 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-800/20"
          >
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Print labels ({selected.size})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-stone-400 hover:text-stone-600"
          >
            Ryd valg
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              {hasListable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={devices.length > 0 && selected.size === devices.length}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-stone-300 text-green-eco accent-green-eco"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Model
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Stand
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Lokation
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">
                Indkøbspris
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">
                Salgspris
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">
                Margin
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                <span className="sr-only">Handlinger</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-stone-100 animate-pulse">
                  {hasListable && <td className="px-3 py-4" />}
                  <td className="px-4 py-4"><div className="h-4 w-40 rounded bg-stone-100" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-8 rounded bg-stone-100" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-16 rounded bg-stone-100" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-stone-100" /></td>
                  <td className="px-4 py-4"><div className="ml-auto h-4 w-16 rounded bg-stone-100" /></td>
                  <td className="px-4 py-4"><div className="ml-auto h-4 w-16 rounded bg-stone-100" /></td>
                  <td className="px-4 py-4"><div className="ml-auto h-4 w-16 rounded bg-stone-100" /></td>
                  <td className="px-4 py-4"><div className="ml-auto h-6 w-20 rounded bg-stone-100" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={hasListable ? 9 : 8} className="px-4 py-12 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={hasListable ? 9 : 8} className="px-6 py-16 text-center">
                  <div className="mx-auto max-w-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
                      <svg className="h-7 w-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-stone-600">Ingen enheder endnu</p>
                    <p className="mt-1 text-xs text-stone-400">
                      Registrer din første enhed for at komme igang
                    </p>
                    <Link
                      href="/admin/platform/intake"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-eco px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-green-eco/15 transition hover:brightness-110"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Tilføj enhed
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              devices.map((device, i) => (
                <tr
                  key={device.id}
                  className={[
                    "group transition hover:bg-stone-50",
                    i < devices.length - 1 ? "border-b border-stone-100" : "",
                    selected.has(device.id) ? "bg-green-eco/[0.03]" : "",
                  ].join(" ")}
                >
                  {/* Checkbox */}
                  {hasListable && (
                    <td className="px-3 py-3">
                      {["intake", "graded", "returned"].includes(device.status) ? (
                        <input
                          type="checkbox"
                          checked={selected.has(device.id)}
                          onChange={() => toggleSelect(device.id)}
                          className="h-3.5 w-3.5 rounded border-stone-300 text-green-eco accent-green-eco"
                        />
                      ) : null}
                    </td>
                  )}

                  {/* Model + details */}
                  <td className="px-4 py-3">
                    <Link href={`/admin/platform/stock/${device.id}`} className="block transition group-hover:opacity-80">
                      <span className="font-medium text-stone-800">
                        {device.template?.display_name ?? <span className="text-stone-400 italic">Ukendt</span>}
                      </span>
                      {device.source === "foxway" && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[#4B1F82]/10 px-2 py-0.5 text-[11px] font-medium text-[#4B1F82]">
                          Foxway
                        </span>
                      )}
                      {(device.storage || device.color) && (
                        <span className="ml-2 text-xs text-stone-400">
                          {[device.storage, device.color].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {device.barcode && (
                        <span className="block font-mono text-[11px] text-stone-400 mt-0.5">{device.barcode}</span>
                      )}
                    </Link>
                  </td>

                  {/* Grade */}
                  <td className="px-4 py-3">
                    {device.grade ? (
                      <span className={["inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold", GRADE_BADGE[device.grade] ?? "bg-stone-100 text-stone-600 border-stone-200"].join(" ")}>
                        {device.grade}
                      </span>
                    ) : <span className="text-stone-300">—</span>}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={["inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_BADGE[device.status] ?? "bg-stone-100 text-stone-600 border-stone-200"].join(" ")}>
                      {STATUS_LABELS[device.status] ?? device.status}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {device.location?.name ?? <span className="text-stone-300">—</span>}
                  </td>

                  {/* Purchase price (read-only) */}
                  <td className="px-4 py-3 text-right font-mono text-sm text-stone-700">
                    {device.purchase_price > 0 ? formatDKK(device.purchase_price) : <span className="text-stone-300">—</span>}
                  </td>

                  {/* Selling price (inline editable) */}
                  <td className="px-4 py-3 text-right">
                    {editingPriceId === device.id ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        autoFocus
                        value={editingPriceValue}
                        onChange={(e) => setEditingPriceValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveInlinePrice(device.id);
                          if (e.key === "Escape") setEditingPriceId(null);
                        }}
                        onBlur={() => saveInlinePrice(device.id)}
                        className="w-24 rounded-lg border border-green-eco/50 bg-white px-2 py-1 text-right font-mono text-sm text-stone-800 focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPriceId(device.id);
                          setEditingPriceValue(device.selling_price ? String(device.selling_price / 100) : "");
                        }}
                        className="font-mono text-sm text-stone-700 hover:text-green-eco transition"
                        title="Klik for at redigere"
                      >
                        {device.selling_price != null ? formatDKK(device.selling_price) : <span className="text-stone-300">Sæt pris</span>}
                      </button>
                    )}
                  </td>

                  {/* Margin (visning) */}
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {device.purchase_price > 0 && device.selling_price != null && device.selling_price > 0 ? (
                      <span className={device.selling_price - device.purchase_price > 0 ? "text-green-700" : "text-red-600"}>
                        {formatDKK(device.selling_price - device.purchase_price)}
                        <span className="ml-1 text-[11px] opacity-70">
                          {Math.round(((device.selling_price - device.purchase_price) / device.selling_price) * 100)}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {["intake", "graded", "returned"].includes(device.status) && (
                        <button
                          type="button"
                          disabled={updatingId === device.id}
                          onClick={() => quickStatusChange(device.id, "listed")}
                          className="rounded-lg bg-green-eco/10 px-2.5 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-eco/20 disabled:opacity-40"
                        >
                          {updatingId === device.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-green-700/30 border-t-green-700 inline-block" />
                          ) : "Til salg"}
                        </button>
                      )}
                      {device.status === "listed" && (
                        <button
                          type="button"
                          disabled={updatingId === device.id}
                          onClick={() => quickStatusChange(device.id, "delisted")}
                          className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-200 disabled:opacity-40"
                        >
                          {updatingId === device.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-stone-500/30 border-t-stone-500 inline-block" />
                          ) : "Arkiver"}
                        </button>
                      )}
                      {device.status === "delisted" && (
                        <button
                          type="button"
                          disabled={updatingId === device.id}
                          onClick={() => quickStatusChange(device.id, "listed")}
                          className="rounded-lg bg-green-eco/10 px-2.5 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-eco/20 disabled:opacity-40"
                        >
                          {updatingId === device.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-green-700/30 border-t-green-700 inline-block" />
                          ) : "Aktiver"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setLabelDevice(device)}
                        title="Print label"
                        className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-400 transition hover:border-stone-300 hover:text-stone-600"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => openTransfer(device)}
                        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:border-stone-300 hover:text-stone-700"
                      >
                        Overfør
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + page size */}
      {count > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-stone-400">
            Viser {offset + 1}–{Math.min(offset + effectiveLimit, count)} af {count} enheder
          </p>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {count > effectiveLimit && (
              <>
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - effectiveLimit))}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Forrige
                </button>
                <span className="text-xs text-stone-400">Side {currentPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={offset + effectiveLimit >= count}
                  onClick={() => setOffset(offset + effectiveLimit)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Næste
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transfer dialog */}
      <DeviceTransferDialog
        device={transferDevice}
        open={transferOpen}
        onClose={() => { setTransferOpen(false); setTransferDevice(null); }}
        onTransferred={() => { setTransferOpen(false); setTransferDevice(null); fetchDevices(offset); }}
      />

      {/* Label print dialog */}
      {labelDevice && (
        <BarcodeLabelDialog
          open={!!labelDevice}
          onClose={() => setLabelDevice(null)}
          barcode={labelDevice.barcode}
          modelName={labelDevice.template?.display_name ?? "Ukendt"}
          grade={labelDevice.grade ?? "B"}
          sellingPrice={labelDevice.selling_price}
          storage={labelDevice.storage}
          color={labelDevice.color}
        />
      )}

      {/* Hidden iframe for bulk label printing */}
      <iframe
        ref={bulkPrintIframeRef}
        className="fixed left-[-9999px] top-[-9999px] h-0 w-0"
        title="bulk-barcode-label-print"
      />
    </div>
  );
}
