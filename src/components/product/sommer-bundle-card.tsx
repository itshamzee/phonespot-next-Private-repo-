"use client";

import { useEffect, useState } from "react";
import { SOMMER_BUNDLE_2026 } from "@/lib/campaigns/sommer-bundle";

function daysUntil(end: Date, now: Date = new Date()): number {
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function SommerBundleCard() {
  const [days, setDays] = useState<number>(() => daysUntil(SOMMER_BUNDLE_2026.endsAt));

  useEffect(() => {
    // Update once per minute so the count is current without re-rendering aggressively.
    const id = window.setInterval(() => setDays(daysUntil(SOMMER_BUNDLE_2026.endsAt)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full" style={{ background: "radial-gradient(circle, rgba(34,139,82,0.4) 0%, transparent 70%)" }} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-block rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            {SOMMER_BUNDLE_2026.name}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d83b15] px-2.5 py-0.5 text-[11px] font-bold">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Slutter om {days} {days === 1 ? "dag" : "dage"}
          </span>
        </div>
        <h3 className="font-display text-2xl font-bold leading-tight tracking-tight">Gratis tilbehør.</h3>
        <p className="mt-0.5 text-xs text-white/60">Inkluderet i prisen — kun til 30. juni.</p>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-7 rounded-md border border-white/40" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(150,180,220,0.2) 100%)" }} />
            <div className="leading-tight">
              <p className="text-xs font-bold">Tempered Glass</p>
              <p className="text-[11px]">
                <span className="text-white/40 line-through">159 kr</span>{" "}
                <span className="font-bold text-[#4ed086]">0 kr</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-7 rounded-md" style={{ background: "linear-gradient(135deg, #888 0%, #555 100%)" }}>
              <div className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#555]" />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold">TPU cover (klar)</p>
              <p className="text-[11px]">
                <span className="text-white/40 line-through">99 kr</span>{" "}
                <span className="font-bold text-[#4ed086]">0 kr</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
