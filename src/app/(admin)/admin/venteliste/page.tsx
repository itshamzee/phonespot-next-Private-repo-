"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotifyStatus = "waiting" | "notified" | "purchased";

type NotifyRow = {
  id: string;
  customer_email: string;
  template_id: string;
  grade_preference: "A" | "B" | "C" | null;
  status: NotifyStatus;
  created_at: string;
  product_templates: { display_name: string; slug: string | null } | null;
};

const STATUS_LABELS: Record<NotifyStatus, string> = {
  waiting: "Venter",
  notified: "Adviseret",
  purchased: "Købt",
};

const STATUS_BADGE: Record<NotifyStatus, string> = {
  waiting: "bg-amber-500/10 text-amber-600",
  notified: "bg-blue-500/10 text-blue-600",
  purchased: "bg-emerald-500/10 text-emerald-600",
};

const STATUS_DOT: Record<NotifyStatus, string> = {
  waiting: "bg-amber-500",
  notified: "bg-blue-500",
  purchased: "bg-emerald-500",
};

const ALL_STATUSES: (NotifyStatus | "alle")[] = ["alle", "waiting", "notified", "purchased"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminVentelistePage() {
  const [rows, setRows] = useState<NotifyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotifyStatus | "alle">("waiting");
  const [search, setSearch] = useState("");

  const supabase = createBrowserClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notify_requests")
        .select("id, customer_email, template_id, grade_preference, status, created_at, product_templates(display_name, slug)")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setRows((data as unknown as NotifyRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demand by product (waiting only) — the actionable "what to restock" view.
  const demand = useMemo(() => {
    const map = new Map<string, { name: string; slug: string | null; count: number }>();
    for (const r of rows) {
      if (r.status !== "waiting") continue;
      const name = r.product_templates?.display_name ?? "Ukendt produkt";
      const entry = map.get(r.template_id) ?? { name, slug: r.product_templates?.slug ?? null, count: 0 };
      entry.count++;
      map.set(r.template_id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (filter !== "alle" && r.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.customer_email.toLowerCase().includes(q) ||
        (r.product_templates?.display_name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const waitingCount = rows.filter((r) => r.status === "waiting").length;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Venteliste
        </h2>
        <p className="mt-0.5 text-sm text-charcoal/35">
          {waitingCount} kunder venter på udsolgte produkter
        </p>
      </div>

      {/* Demand summary */}
      {demand.length > 0 && (
        <div className="mb-6 rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/30">
            Mest efterspurgte (venter nu)
          </p>
          <div className="flex flex-wrap gap-2">
            {demand.slice(0, 12).map((d) => (
              <span
                key={d.name}
                className="inline-flex items-center gap-2 rounded-lg bg-charcoal/[0.03] px-3 py-1.5 text-[13px] font-semibold text-charcoal/70"
              >
                {d.slug ? (
                  <Link href={`/refurbished/${d.slug}`} className="hover:text-charcoal hover:underline">
                    {d.name}
                  </Link>
                ) : (
                  d.name
                )}
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                  {d.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-4 w-4 text-charcoal/25" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Søg efter email eller produkt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/[0.06] bg-white py-3 pl-11 pr-4 text-sm text-charcoal placeholder:text-charcoal/25 shadow-sm transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
              filter === s
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
            }`}
          >
            {s !== "alle" && <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />}
            {s === "alle" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indlæser venteliste...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen på ventelisten</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.04] text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/30">
                <th className="px-5 py-3">Produkt</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Ønsket stand</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Tilmeldt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {filtered.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-black/[0.01]">
                  <td className="px-5 py-3.5 font-semibold text-charcoal">
                    {r.product_templates?.slug ? (
                      <Link href={`/refurbished/${r.product_templates.slug}`} className="hover:underline">
                        {r.product_templates.display_name}
                      </Link>
                    ) : (
                      r.product_templates?.display_name ?? "Ukendt produkt"
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-charcoal/60">
                    <a href={`mailto:${r.customer_email}`} className="hover:text-charcoal hover:underline">
                      {r.customer_email}
                    </a>
                  </td>
                  <td className="px-5 py-3.5 text-charcoal/50">
                    {r.grade_preference ? `Grade ${r.grade_preference}` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[r.status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-charcoal/30">
                    {formatDate(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
