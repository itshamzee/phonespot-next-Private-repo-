"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

/**
 * The four numbers that say whether buyback needs you today, plus the pause
 * banner. When automation has stopped itself, that is the most important thing
 * on the page and it says so in red rather than hiding in a feed.
 */

interface Props {
  needsYou: number;
}

interface Stats {
  scheduled: number;
  autoSentToday: number;
  acceptRate7d: number | null;
  pausedReason: string | null;
  autoSendEnabled: boolean;
}

function Tile({
  label,
  value,
  tone = "calm",
}: {
  label: string;
  value: string | number;
  tone?: "calm" | "attention" | "pending";
}) {
  const toneClass =
    tone === "attention"
      ? "text-rose-600"
      : tone === "pending"
        ? "text-amber-600"
        : "text-charcoal";
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal/30">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function BuybackStatusBar({ needsYou }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [{ data: scheduled }, { data: todayOffers }, { data: weekOffers }, { data: settingsRow }] =
      await Promise.all([
        supabase.from("trade_in_offers").select("id").eq("send_state", "scheduled"),
        supabase
          .from("trade_in_offers")
          .select("id")
          .eq("auto_sent", true)
          .gte("created_at", startOfToday.toISOString()),
        supabase.from("trade_in_offers").select("status").gte("created_at", sevenDaysAgo),
        supabase.from("app_settings").select("value").eq("key", "buyback").maybeSingle(),
      ]);

    const answered = (weekOffers ?? []).filter(
      (o) => o.status === "accepted" || o.status === "rejected",
    );
    const accepted = answered.filter((o) => o.status === "accepted");

    const value = ((settingsRow as { value?: unknown } | null)?.value ?? {}) as {
      pausedReason?: string | null;
      autoSendEnabled?: boolean;
    };

    setStats({
      scheduled: (scheduled ?? []).length,
      autoSentToday: (todayOffers ?? []).length,
      acceptRate7d: answered.length > 0 ? Math.round((accepted.length / answered.length) * 100) : null,
      pausedReason: value.pausedReason ?? null,
      autoSendEnabled: value.autoSendEnabled === true,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void load();
    };
    const initial = setTimeout(run, 0);
    const timer = setInterval(run, 60_000);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);

  return (
    <>
      {stats?.pausedReason && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5">
          <p className="text-[13px] font-semibold text-rose-800">
            Automatikken er sat på pause
          </p>
          <p className="mt-0.5 text-[12px] text-rose-700/80">{stats.pausedReason}</p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Kræver dig" value={needsYou} tone={needsYou > 0 ? "attention" : "calm"} />
        <Tile
          label="Sendes nu"
          value={stats?.scheduled ?? 0}
          tone={(stats?.scheduled ?? 0) > 0 ? "pending" : "calm"}
        />
        <Tile label="Auto-sendt i dag" value={stats?.autoSentToday ?? 0} />
        <Tile
          label="Acceptrate 7 dage"
          value={stats?.acceptRate7d === null || stats === null ? "—" : `${stats.acceptRate7d}%`}
        />
      </div>
    </>
  );
}
