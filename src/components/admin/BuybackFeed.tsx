"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { BuybackEventSeverity, BuybackEventType } from "@/lib/buyback/events";

/**
 * Live view of what the buyback automation has been doing. Polls every 30s and
 * on window focus, matching NewOrdersWatcher — the project does not use Supabase
 * realtime anywhere, so this stays on the same pattern.
 *
 * The point of this panel is that nothing the system does is silent: every
 * automatic decision writes a buyback_events row, and this is where they surface.
 */

interface FeedRow {
  id: string;
  inquiry_id: string | null;
  type: BuybackEventType;
  severity: BuybackEventSeverity;
  summary: string;
  created_at: string;
}

const POLL_MS = 30_000;

const SEVERITY_STYLE: Record<BuybackEventSeverity, { dot: string; text: string }> = {
  info: { dot: "bg-charcoal/20", text: "text-charcoal/60" },
  warn: { dot: "bg-amber-500", text: "text-amber-700" },
  critical: { dot: "bg-rose-500", text: "text-rose-700" },
};

function relativeTime(iso: string, now: number): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "lige nu";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `for ${minutes} min. siden`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `for ${hours} t. siden`;
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export default function BuybackFeed({ limit = 12 }: { limit?: number }) {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const rowsRef = useRef<FeedRow[]>([]);

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("buyback_events")
      .select("id, inquiry_id, type, severity, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    // The table may not exist yet in an environment where the migration has not
    // been applied. Staying quiet beats breaking the whole page.
    if (error) {
      setLoaded(true);
      return;
    }

    const next = (data ?? []) as FeedRow[];
    const changed =
      next.length !== rowsRef.current.length ||
      next.some((row, i) => row.id !== rowsRef.current[i]?.id);
    if (changed) {
      rowsRef.current = next;
      setRows(next);
    }
    setNow(Date.now());
    setLoaded(true);
  }, [limit]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void load();
    };

    // Deferred rather than called inline so the first fetch does not set state
    // during the effect body.
    const initial = setTimeout(run, 0);
    const timer = setInterval(run, POLL_MS);
    window.addEventListener("focus", run);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", run);
    };
  }, [load]);

  // Nothing has happened yet and nothing is configured — do not take up space.
  if (loaded && rows.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-black/[0.03] px-5 py-3">
        <h3 className="text-[13px] font-semibold text-charcoal">Aktivitet</h3>
        <span className="text-[11px] text-charcoal/30">Opdateres hvert 30. sekund</span>
      </header>
      <ul className="divide-y divide-black/[0.03]">
        {rows.map((row) => {
          const style = SEVERITY_STYLE[row.severity] ?? SEVERITY_STYLE.info;
          return (
            <li key={row.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
              <p className={`min-w-0 flex-1 truncate text-[13px] ${style.text}`}>{row.summary}</p>
              <span className="shrink-0 text-[11px] text-charcoal/25">
                {relativeTime(row.created_at, now)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
