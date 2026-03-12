"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDKK, formatDate } from "@/lib/platform/format";
import { DeviceTransferDialog } from "@/components/platform/device-transfer-dialog";

interface StockFilters {
  location_id?: string;
  status?: string;
  grade?: string;
  search?: string;
}

interface Device {
  id: string;
  barcode: string;
  grade: "A" | "B" | "C" | null;
  status: string;
  purchase_price: number;
  selling_price: number | null;
  created_at: string;
  template: {
    display_name: string;
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

const LIMIT = 25;

const GRADE_BADGE: Record<string, string> = {
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
};

export function StockTable({ filters }: StockTableProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transferDevice, setTransferDevice] = useState<TransferTarget | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const fetchDevices = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.location_id) params.set("location_id", filters.location_id);
      if (filters.status) params.set("status", filters.status);
      if (filters.grade) params.set("grade", filters.grade);
      if (filters.search) params.set("search", filters.search);
      params.set("limit", String(LIMIT));
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
  }, [filters]);

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setOffset(0);
  }, [filters]);

  useEffect(() => {
    fetchDevices(offset);
  }, [fetchDevices, offset]);

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

  const totalPages = Math.ceil(count / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Stregkode
              </th>
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Registreret
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                <span className="sr-only">Handlinger</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-stone-400">
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-sm">Henter enheder…</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-stone-400">
                  Ingen enheder matcher filtreringen.
                </td>
              </tr>
            ) : (
              devices.map((device, i) => (
                <tr
                  key={device.id}
                  className={[
                    "group transition hover:bg-stone-50",
                    i < devices.length - 1 ? "border-b border-stone-100" : "",
                  ].join(" ")}
                >
                  {/* Barcode */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/platform/stock/${device.id}`}
                      className="font-mono text-xs text-stone-600 group-hover:text-green-eco transition"
                    >
                      {device.barcode}
                    </Link>
                  </td>

                  {/* Template */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/platform/stock/${device.id}`}
                      className="font-medium text-stone-800 hover:text-green-eco transition"
                    >
                      {device.template?.display_name ?? (
                        <span className="text-stone-400 italic">Ukendt model</span>
                      )}
                    </Link>
                  </td>

                  {/* Grade */}
                  <td className="px-4 py-3">
                    {device.grade ? (
                      <span
                        className={[
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold",
                          GRADE_BADGE[device.grade] ?? "bg-stone-100 text-stone-600 border-stone-200",
                        ].join(" ")}
                      >
                        {device.grade}
                      </span>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                        STATUS_BADGE[device.status] ?? "bg-stone-100 text-stone-600 border-stone-200",
                      ].join(" ")}
                    >
                      {STATUS_LABELS[device.status] ?? device.status}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {device.location?.name ?? <span className="text-stone-300">—</span>}
                  </td>

                  {/* Purchase price */}
                  <td className="px-4 py-3 text-right font-mono text-sm text-stone-700">
                    {formatDKK(device.purchase_price)}
                  </td>

                  {/* Selling price */}
                  <td className="px-4 py-3 text-right font-mono text-sm text-stone-700">
                    {device.selling_price != null ? (
                      formatDKK(device.selling_price)
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {formatDate(device.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openTransfer(device)}
                        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                      >
                        Overfør
                      </button>
                      <Link
                        href={`/admin/platform/stock/${device.id}`}
                        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                      >
                        Se
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {count > LIMIT && (
        <div className="flex items-center justify-between gap-4 border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-stone-400">
            Viser {offset + 1}–{Math.min(offset + LIMIT, count)} af {count} enheder
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Forrige
            </button>
            <span className="text-xs text-stone-400">
              Side {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={offset + LIMIT >= count}
              onClick={() => setOffset(offset + LIMIT)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Næste →
            </button>
          </div>
        </div>
      )}

      {/* Transfer dialog */}
      <DeviceTransferDialog
        device={transferDevice}
        open={transferOpen}
        onClose={() => {
          setTransferOpen(false);
          setTransferDevice(null);
        }}
        onTransferred={() => {
          setTransferOpen(false);
          setTransferDevice(null);
          fetchDevices(offset);
        }}
      />
    </div>
  );
}
