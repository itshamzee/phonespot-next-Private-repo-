"use client";

import Link from "next/link";
import { formatOere } from "@/lib/cart/utils";

/* ------------------------------------------------------------------ *
 * Shared dashboard tile components.
 * Used by /admin (EcommerceDashboard) and /admin/platform.
 * ------------------------------------------------------------------ */

export type KpiAccent = "emerald" | "blue" | "violet" | "amber" | "rose";

const ACCENT_MAP: Record<KpiAccent, { bg: string; text: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-600" },
};

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
}

/* ── KPI card with optional delta vs previous period ────────────── */

export function KpiCard({
  label,
  value,
  sub,
  delta,
  accent = "emerald",
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  accent?: KpiAccent;
}) {
  const a = ACCENT_MAP[accent];
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <p className="text-[13px] font-semibold text-charcoal/35">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold ${a.text}`}>{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta != null ? <DeltaBadge value={delta} /> : <span className="text-charcoal/20">—</span>}
        {sub && <span className="text-charcoal/30">· {sub}</span>}
      </div>
    </div>
  );
}

export function DeltaBadge({ value }: { value: number }) {
  if (Math.abs(value) < 0.1) {
    return <span className="text-charcoal/30">±0,0%</span>;
  }
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold ${
        positive ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-3 w-3 ${positive ? "" : "rotate-180"}`}
      >
        <path
          fillRule="evenodd"
          d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04L10.75 5.612V16.25A.75.75 0 0 1 10 17Z"
          clipRule="evenodd"
        />
      </svg>
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

/* ── Sparkline (revenue area + order bars) ──────────────────────── */

export function Sparkline({
  data,
}: {
  data: Array<{ date: string; revenue: number; orders: number }>;
}) {
  if (data.length === 0) return null;

  const W = 800;
  const H = 160;
  const PAD_X = 16;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 22;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const maxOrders = Math.max(1, ...data.map((d) => d.orders));
  const xStep = innerW / Math.max(1, data.length - 1);

  const revenuePath = data
    .map((d, i) => {
      const x = PAD_X + i * xStep;
      const y = PAD_TOP + innerH - (d.revenue / maxRevenue) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
          Omsætning sidste 30 dage
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-charcoal/40">Omsætning:</span>
            <span className="font-bold text-charcoal">{formatOere(totalRevenue)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500/50" />
            <span className="text-charcoal/40">Ordrer:</span>
            <span className="font-bold text-charcoal">{totalOrders}</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + innerH * p}
            y2={PAD_TOP + innerH * p}
            stroke="rgb(0 0 0 / 0.04)"
            strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const barW = Math.max(2, xStep - 2);
          const x = PAD_X + i * xStep - barW / 2;
          const h = (d.orders / maxOrders) * innerH;
          const y = PAD_TOP + innerH - h;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={1}
              fill="rgb(59 130 246 / 0.18)"
            />
          );
        })}
        <path
          d={`${revenuePath} L${(PAD_X + (data.length - 1) * xStep).toFixed(1)},${PAD_TOP + innerH} L${PAD_X},${PAD_TOP + innerH} Z`}
          fill="rgb(16 185 129 / 0.08)"
        />
        <path d={revenuePath} fill="none" stroke="rgb(16 185 129)" strokeWidth={2} />
        {(() => {
          const last = data[data.length - 1];
          const x = PAD_X + (data.length - 1) * xStep;
          const y = PAD_TOP + innerH - (last.revenue / maxRevenue) * innerH;
          return (
            <circle cx={x} cy={y} r={3.5} fill="white" stroke="rgb(16 185 129)" strokeWidth={2} />
          );
        })()}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => {
          const x = PAD_X + i * xStep;
          return (
            <text
              key={i}
              x={x}
              y={H - 4}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              fontSize="10"
              fill="rgb(0 0 0 / 0.35)"
            >
              {new Date(data[i].date).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Abandoned tile ─────────────────────────────────────────────── */

export function AbandonedTile({
  abandoned,
}: {
  abandoned: { count: number; totalValue: number };
}) {
  return (
    <Link
      href="/admin/platform/abandoned-checkouts"
      className="group rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-charcoal/35">Forladte kurve</p>
          <p className="mt-0.5 text-2xl font-bold text-amber-600">
            {abandoned.count} {abandoned.count === 1 ? "kurv" : "kurve"}
          </p>
          <p className="mt-1 text-xs text-charcoal/40">
            Værdi: {formatOere(abandoned.totalValue)} · Klik for recovery
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}

/* ── Low stock alert ────────────────────────────────────────────── */

export function LowStockTile({
  lowStock,
}: {
  lowStock: Array<{
    template_id: string;
    name: string;
    slug: string;
    category: string;
    device_count: number;
  }>;
}) {
  const outOfStock = lowStock.filter((t) => t.device_count === 0);
  const oneLeft = lowStock.filter((t) => t.device_count === 1);
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
          Lavt lager
        </h3>
        <span className="text-xs text-charcoal/35">
          {outOfStock.length} udsolgte · {oneLeft.length} med kun 1 tilbage
        </span>
      </div>
      {lowStock.length === 0 ? (
        <p className="text-sm text-charcoal/30">Alt på lager — ingen alarmer</p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {lowStock.map((t) => (
            <li key={t.template_id}>
              <Link
                href={`/refurbished/${t.slug}`}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-charcoal/[0.03]"
              >
                <span className="truncate text-sm text-charcoal/70 group-hover:text-charcoal">
                  {t.name}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    t.device_count === 0
                      ? "bg-rose-500/10 text-rose-600"
                      : "bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {t.device_count === 0 ? "UDSOLGT" : "KUN 1"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Top products ───────────────────────────────────────────────── */

export function TopProductsTile({
  products,
}: {
  products: Array<{ name: string; units: number; revenue: number; slug?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
        Top 5 sælgere
      </h3>
      {products.length === 0 ? (
        <p className="text-sm text-charcoal/30">Ingen salg endnu i denne periode</p>
      ) : (
        <ol className="space-y-2.5">
          {products.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal/[0.04] text-xs font-bold text-charcoal/50">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                {p.slug ? (
                  <Link
                    href={`/refurbished/${p.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="truncate text-sm font-medium text-charcoal hover:text-emerald-600"
                  >
                    {p.name}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium text-charcoal">{p.name}</span>
                )}
                <p className="text-xs text-charcoal/35">
                  {p.units} {p.units === 1 ? "stk" : "stk"} · {formatOere(p.revenue)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── Shared types for dashboard data ────────────────────────────── */

export type DashboardKpis = {
  totalRevenue: number;
  totalOrders: number;
  onlineOrders: number;
  posOrders: number;
  devicesSold: number;
  skusSold: number;
  totalMargin: number;
  brugtmomsTotal: number;
  avgOrderValue: number;
};

export type DashboardData = {
  period: string;
  kpis: DashboardKpis;
  previous: DashboardKpis;
  timeSeries: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; units: number; revenue: number; slug?: string }>;
  lowStock: Array<{
    template_id: string;
    name: string;
    slug: string;
    category: string;
    device_count: number;
  }>;
  abandoned: { count: number; totalValue: number };
  inventory: {
    listedCount: number;
    retailValue: number;
    costValue: number;
    byLocation: Record<string, number>;
  };
  activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
};
