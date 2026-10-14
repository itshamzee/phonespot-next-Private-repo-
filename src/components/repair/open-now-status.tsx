"use client";

import { useEffect, useState } from "react";
import { getOpenStatus, type OpenStatus } from "@/lib/store-hours";
import type { StoreLocationConfig } from "@/lib/store-config";

type Props = {
  hours: StoreLocationConfig["hours"];
  /** "dark" til grøn hero-baggrund, "light" til hvide/lyse flader. */
  tone?: "dark" | "light";
  className?: string;
};

/**
 * Åbent/lukket ud fra butikkens åbningstider. Renderer først efter mount
 * (serveren kender ikke besøgendes tidspunkt og siden er cachet i en time),
 * så der ikke opstår hydration-forskelle. Pladsen holdes, så layoutet ikke hopper.
 */
export function OpenNowStatus({ hours, tone = "light", className = "" }: Props) {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    const update = () => setStatus(getOpenStatus(hours));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [hours]);

  const textColor = tone === "dark" ? "text-white/85" : "text-[#111111]";
  const dotColor = status?.open ? (tone === "dark" ? "bg-[#7BD389]" : "bg-[#2D6B45]") : "bg-[#86868B]";

  return (
    <p
      className={`inline-flex min-h-5 items-center gap-2 text-sm font-semibold ${textColor} ${className}`}
      aria-live="off"
    >
      {status && (
        <>
          <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
          <span>{status.label}</span>
        </>
      )}
    </p>
  );
}
