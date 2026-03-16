"use client";

import { useEffect, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ReservationStatus = "pending" | "ready" | "collected" | "expired" | "cancelled";

interface Reservation {
  id: string;
  product_type: "accessory" | "device";
  product_id: string;
  product_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  store_id: string;
  status: ReservationStatus;
  created_at: string;
  expires_at: string;
}

/* ------------------------------------------------------------------ */
/*  Display maps                                                        */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Afventer",
  ready: "Klar",
  collected: "Afhentet",
  expired: "Udløbet",
  cancelled: "Annulleret",
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  pending: "bg-blue-500/10 text-blue-600",
  ready: "bg-emerald-500/10 text-emerald-700",
  collected: "bg-charcoal/[0.05] text-charcoal/40",
  expired: "bg-rose-500/10 text-rose-600",
  cancelled: "bg-charcoal/[0.05] text-charcoal/40",
};

const STATUS_DOT: Record<ReservationStatus, string> = {
  pending: "bg-blue-500",
  ready: "bg-emerald-500",
  collected: "bg-charcoal/20",
  expired: "bg-rose-400",
  cancelled: "bg-charcoal/20",
};

const ALL_FILTERS: (ReservationStatus | "alle")[] = [
  "alle",
  "pending",
  "ready",
  "collected",
  "expired",
  "cancelled",
];

const FILTER_LABELS: Record<ReservationStatus | "alle", string> = {
  alle: "Alle",
  ...STATUS_LABELS,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isActive(status: ReservationStatus): boolean {
  return status === "pending" || status === "ready";
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function AdminReservationerPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReservationStatus | "alle">("alle");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    try {
      const url =
        filter === "alle"
          ? "/api/admin/reservations"
          : `/api/admin/reservations?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Kunne ikke hente reservationer");
      const data: Reservation[] = await res.json();
      setReservations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Initial load + re-fetch when filter changes
  useEffect(() => {
    setLoading(true);
    fetchReservations();
  }, [fetchReservations]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchReservations, 30_000);
    return () => clearInterval(interval);
  }, [fetchReservations]);

  async function updateStatus(id: string, status: ReservationStatus) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Opdatering mislykkedes");
      // Optimistic update
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl ved opdatering");
    } finally {
      setUpdating(null);
    }
  }

  // Count per status for badges
  const statusCounts = reservations.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const activeCount = reservations.filter((r) => isActive(r.status)).length;

  const displayed =
    filter === "alle" ? reservations : reservations.filter((r) => r.status === filter);

  return (
    <div className="mx-auto max-w-6xl">
      {/* ---- Header ---- */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                Reservationer
              </h2>
              {activeCount > 0 && (
                <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  {activeCount} aktive
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-charcoal/35">
              {displayed.length}{" "}
              {displayed.length === 1 ? "reservation" : "reservationer"}
              {filter !== "alle" && ` \— ${FILTER_LABELS[filter]}`}
            </p>
          </div>
        </div>

        {/* Refresh indicator */}
        <button
          type="button"
          onClick={() => { setLoading(true); fetchReservations(); }}
          className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm font-semibold text-charcoal/50 shadow-sm transition-all hover:text-charcoal/70 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Opdater
        </button>
      </div>

      {/* ---- Error ---- */}
      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* ---- Filter chips ---- */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {ALL_FILTERS.map((s) => {
          const count =
            s === "alle"
              ? reservations.length
              : (statusCounts[s] ?? 0);
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
                filter === s
                  ? "bg-charcoal text-white shadow-sm"
                  : "border border-black/[0.04] bg-white text-charcoal/40 shadow-sm hover:text-charcoal/60"
              }`}
            >
              {s !== "alle" && (
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s as ReservationStatus]}`} />
              )}
              {FILTER_LABELS[s]}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filter === s
                    ? "bg-white/20 text-white"
                    : "bg-charcoal/[0.04] text-charcoal/30"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---- Content ---- */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indlæser reservationer...</p>
          </div>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen reservationer fundet</p>
          {filter !== "alle" && (
            <button
              type="button"
              onClick={() => setFilter("alle")}
              className="mt-2 text-xs text-emerald-600 hover:underline"
            >
              Vis alle
            </button>
          )}
        </div>
      ) : (
        /* ---- Table (desktop) / Cards (mobile) ---- */
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.03]">
                  {["Kunde", "Produkt", "Butik", "Oprettet", "Udløber", "Status", "Handlinger"].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/30 first:pl-6 last:pr-6"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {displayed.map((r) => (
                  <tr key={r.id} className="group transition-colors hover:bg-black/[0.015]">
                    {/* Kunde */}
                    <td className="py-4 pl-6 pr-4">
                      <p className="font-semibold text-charcoal">{r.customer_name}</p>
                      <p className="mt-0.5 text-xs text-charcoal/35">{r.customer_phone}</p>
                      {r.customer_email && (
                        <p className="mt-0.5 truncate text-xs text-charcoal/30">{r.customer_email}</p>
                      )}
                    </td>

                    {/* Produkt */}
                    <td className="px-4 py-4">
                      <p className="max-w-[180px] truncate font-medium text-charcoal">
                        {r.product_name}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-charcoal/35">
                        {r.product_type === "device" ? "Enhed" : "Tilbehør"}
                      </p>
                    </td>

                    {/* Butik */}
                    <td className="px-4 py-4">
                      <span className="capitalize text-charcoal/60">{r.store_id}</span>
                    </td>

                    {/* Oprettet */}
                    <td className="px-4 py-4 text-xs text-charcoal/40">
                      <span>{formatDate(r.created_at)}</span>
                      <br />
                      <span className="text-charcoal/25">{formatTime(r.created_at)}</span>
                    </td>

                    {/* Udløber */}
                    <td className="px-4 py-4 text-xs text-charcoal/40">
                      <span>{formatDate(r.expires_at)}</span>
                      <br />
                      <span className="text-charcoal/25">{formatTime(r.expires_at)}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[r.status]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>

                    {/* Handlinger */}
                    <td className="py-4 pl-4 pr-6">
                      <div className="flex items-center gap-2">
                        {r.status === "pending" && (
                          <ActionButton
                            label="Klar til afhentning"
                            color="emerald"
                            loading={updating === r.id}
                            onClick={() => updateStatus(r.id, "ready")}
                          />
                        )}
                        {r.status === "ready" && (
                          <ActionButton
                            label="Afhentet"
                            color="stone"
                            loading={updating === r.id}
                            onClick={() => updateStatus(r.id, "collected")}
                          />
                        )}
                        {isActive(r.status) && (
                          <ActionButton
                            label="Annuller"
                            color="rose"
                            loading={updating === r.id}
                            onClick={() => updateStatus(r.id, "cancelled")}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 lg:hidden">
            {displayed.map((r) => (
              <div
                key={r.id}
                className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm"
              >
                {/* Card top accent by status */}
                <div
                  className={`h-[2px] ${
                    r.status === "pending"
                      ? "bg-blue-400"
                      : r.status === "ready"
                        ? "bg-emerald-400"
                        : "bg-charcoal/10"
                  }`}
                />
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-charcoal">{r.customer_name}</p>
                      <p className="text-xs text-charcoal/40">{r.customer_phone}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg border border-black/[0.04] bg-[#f9f8f6] px-3 py-2.5">
                    <p className="truncate text-[13px] font-medium text-charcoal">{r.product_name}</p>
                    <p className="mt-0.5 text-xs capitalize text-charcoal/35">
                      {r.product_type === "device" ? "Enhed" : "Tilbehør"} &middot; {r.store_id}
                    </p>
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-charcoal/35">
                    <span>Oprettet {formatDate(r.created_at)}</span>
                    <span>Udløber {formatDate(r.expires_at)}</span>
                  </div>

                  {isActive(r.status) && (
                    <div className="mt-3 flex gap-2">
                      {r.status === "pending" && (
                        <ActionButton
                          label="Klar til afhentning"
                          color="emerald"
                          loading={updating === r.id}
                          onClick={() => updateStatus(r.id, "ready")}
                          fullWidth
                        />
                      )}
                      {r.status === "ready" && (
                        <ActionButton
                          label="Afhentet"
                          color="stone"
                          loading={updating === r.id}
                          onClick={() => updateStatus(r.id, "collected")}
                          fullWidth
                        />
                      )}
                      <ActionButton
                        label="Annuller"
                        color="rose"
                        loading={updating === r.id}
                        onClick={() => updateStatus(r.id, "cancelled")}
                        fullWidth
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Auto-refresh note */}
      <p className="mt-4 text-center text-[11px] text-charcoal/20">
        Opdateres automatisk hvert 30. sekund
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ActionButton sub-component                                          */
/* ------------------------------------------------------------------ */

interface ActionButtonProps {
  label: string;
  color: "emerald" | "stone" | "rose";
  loading: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}

function ActionButton({ label, color, loading, onClick, fullWidth }: ActionButtonProps) {
  const colorMap = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    stone:
      "border-charcoal/[0.08] bg-charcoal/[0.03] text-charcoal/50 hover:bg-charcoal/[0.06]",
    rose: "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-[0.97] disabled:opacity-50 ${colorMap[color]} ${fullWidth ? "flex-1" : ""}`}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      ) : null}
      {label}
    </button>
  );
}
