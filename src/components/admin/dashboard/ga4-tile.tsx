"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type Ga4Data =
  | { configured: false }
  | {
      configured: true;
      period: string;
      kpis: { sessions: number; users: number; pageViews: number; conversions: number };
      topPages: Array<{ path: string; sessions: number }>;
      topSources: Array<{ channel: string; sessions: number }>;
      error?: string;
    };

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "I dag",
  week: "7 dage",
  month: "30 dage",
};

export function Ga4Tile() {
  const [data, setData] = useState<Ga4Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");

  const supabase = createBrowserClient();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) {
            setError("Ikke logget ind");
            setLoading(false);
          }
          return;
        }
        const res = await fetch(`/api/dashboard/ga4?period=${period}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok && !json.configured) {
          setError(json.error ?? `HTTP ${res.status}`);
        } else {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message ?? "Kunne ikke hente GA4-data");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-charcoal/35">
            Trafik (GA4)
          </h3>
          <p className="mt-0.5 text-xs text-charcoal/30">Google Analytics 4</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-charcoal/[0.04] p-0.5 text-[11px] font-semibold">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2.5 py-1 transition ${
                period === p
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-charcoal/40 hover:text-charcoal/60"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="text-sm text-rose-500">{error}</p>
      ) : data && data.configured === false ? (
        <NotConfigured />
      ) : data && data.configured ? (
        data.error ? (
          <p className="text-sm text-rose-500">{data.error}</p>
        ) : (
          <Loaded data={data} />
        )
      ) : null}
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
      <p className="font-semibold">GA4 er ikke konfigureret</p>
      <p className="mt-1.5 text-xs leading-relaxed text-amber-900/80">
        Sæt disse to env vars i Vercel for at hente trafikdata her:
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        <li>
          <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono">GA4_PROPERTY_ID</code>{" "}
          — numerisk property-ID (uden <code>properties/</code> prefix)
        </li>
        <li>
          <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono">
            GOOGLE_SERVICE_ACCOUNT_JSON
          </code>{" "}
          — hele service-account JSON (én linje)
        </li>
      </ul>
      <p className="mt-2 text-xs text-amber-900/70">
        Service-kontoen skal have mindst Viewer-adgang til GA4-property'et.
      </p>
    </div>
  );
}

function Loaded({
  data,
}: {
  data: Extract<Ga4Data, { configured: true }>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Sessions" value={data.kpis.sessions.toLocaleString("da-DK")} />
        <Stat label="Brugere" value={data.kpis.users.toLocaleString("da-DK")} />
        <Stat label="Sidevisninger" value={data.kpis.pageViews.toLocaleString("da-DK")} />
        <Stat
          label="Konverteringer"
          value={Math.round(data.kpis.conversions).toLocaleString("da-DK")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-charcoal/30">
            Top sider
          </h4>
          {data.topPages.length === 0 ? (
            <p className="text-xs text-charcoal/30">Ingen data</p>
          ) : (
            <ul className="space-y-1.5">
              {data.topPages.map((p) => (
                <li
                  key={p.path}
                  className="flex items-baseline justify-between gap-3 text-xs"
                >
                  <span className="truncate text-charcoal/70">{p.path}</span>
                  <span className="shrink-0 font-bold text-charcoal">
                    {p.sessions.toLocaleString("da-DK")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-charcoal/30">
            Trafik-kanaler
          </h4>
          {data.topSources.length === 0 ? (
            <p className="text-xs text-charcoal/30">Ingen data</p>
          ) : (
            <ul className="space-y-1.5">
              {data.topSources.map((s) => (
                <li
                  key={s.channel}
                  className="flex items-baseline justify-between gap-3 text-xs"
                >
                  <span className="truncate text-charcoal/70">{s.channel}</span>
                  <span className="shrink-0 font-bold text-charcoal">
                    {s.sessions.toLocaleString("da-DK")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-charcoal/[0.025] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/30">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold text-charcoal">{value}</p>
    </div>
  );
}
