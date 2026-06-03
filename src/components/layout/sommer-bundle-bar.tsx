"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isCampaignActive, SOMMER_BUNDLE_2026 } from "@/lib/campaigns/sommer-bundle";

const DISMISS_KEY = "sommer-bundle-dismissed";

/** Build a "Nd HH:MM:SS" countdown string from ms remaining, or null if ended. */
function formatRemaining(ms: number): string | null {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

export function SommerBundleBar() {
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    setActive(isCampaignActive());
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // sessionStorage unavailable — keep dismissed=false
    }
  }, []);

  // Tick the countdown once per second. Runs client-side only, so no hydration
  // mismatch; deactivates the bar when the deadline passes.
  useEffect(() => {
    const end = SOMMER_BUNDLE_2026.endsAt.getTime();
    const tick = () => {
      const remaining = formatRemaining(end - Date.now());
      setCountdown(remaining);
      if (remaining === null) setActive(false);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  if (!active || dismissed) return null;

  return (
    <div className="relative bg-charcoal text-white">
      <Link
        href="/iphones"
        className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm hover:bg-charcoal/95"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-eco text-[10px] font-bold">+</span>
        <span>
          <span className="font-semibold">Sommer Bundle:</span>{" "}
          Gratis Tempered Glass + TPU cover med alle iPhones
          {countdown && (
            <span className="hidden sm:inline text-green-light">
              {" "}· Slutter om <span className="font-semibold tabular-nums">{countdown}</span>
            </span>
          )}
        </span>
        <span className="hidden sm:inline underline underline-offset-4 font-medium">Se iPhones →</span>
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Luk besked"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M4.28 3.22 8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 1.06-1.06Z" />
        </svg>
      </button>
    </div>
  );
}
