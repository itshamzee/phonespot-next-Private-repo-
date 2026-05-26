"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SOMMER_BUNDLE_2026 } from "@/lib/campaigns/sommer-bundle";

function daysUntil(end: Date, now: Date = new Date()): number {
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

type FreebieProps = {
  src: string;
  alt: string;
  name: string;
  retail: string;
};

function FreebieItem({ src, alt, name, retail }: FreebieProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white p-2 sm:p-2.5">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#faf8f1]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="48px"
          className="object-contain p-1"
        />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-[12px] font-semibold text-charcoal truncate">{name}</p>
        <p className="mt-0.5 text-[11px]">
          <span className="text-charcoal/40 line-through">{retail}</span>{" "}
          <span className="font-extrabold text-[#1A3D2E]">Gratis</span>
        </p>
      </div>
    </div>
  );
}

export function SommerBundleCard() {
  const [days, setDays] = useState<number>(() => daysUntil(SOMMER_BUNDLE_2026.endsAt));

  useEffect(() => {
    const id = window.setInterval(() => setDays(daysUntil(SOMMER_BUNDLE_2026.endsAt)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white"
      style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,139,82,0.45) 0%, transparent 70%)" }}
      />
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
        <h3 className="font-display text-xl sm:text-2xl font-bold leading-tight tracking-tight">
          Gratis tilbehør.
        </h3>
        <p className="mt-0.5 text-xs text-white/60">Inkluderet i prisen — kun til 30. juni.</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <FreebieItem
            src="/images/panserglas.png"
            alt="Tempered Glass"
            name="Tempered Glass"
            retail="159 kr"
          />
          <FreebieItem
            src="/images/tpu-cover-clear.png"
            alt="TPU cover (klar)"
            name="TPU cover (klar)"
            retail="99 kr"
          />
        </div>
      </div>
    </div>
  );
}
