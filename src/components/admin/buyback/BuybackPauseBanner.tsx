"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

/**
 * When the automation has stopped itself, that is the most important thing on
 * the page, so it says so in red rather than hiding in a feed.
 *
 * This used to also render four counter tiles — scheduled sends, auto-sent
 * today, seven-day accept rate — which read 0 / 0 / 60% on most days. They have
 * been replaced by BuybackHeadline, which states the position in words instead.
 */
export default function BuybackPauseBanner() {
  const [pausedReason, setPausedReason] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "buyback")
      .maybeSingle();

    const value = ((data as { value?: unknown } | null)?.value ?? {}) as {
      pausedReason?: string | null;
    };
    setPausedReason(value.pausedReason ?? null);
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

  if (!pausedReason) return null;

  return (
    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5">
      <p className="text-[13px] font-semibold text-rose-800">Automatikken er sat på pause</p>
      <p className="mt-0.5 text-[12px] text-rose-700/80">{pausedReason}</p>
    </div>
  );
}
