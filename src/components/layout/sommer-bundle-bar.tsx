"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isCampaignActive } from "@/lib/campaigns/sommer-bundle";

const DISMISS_KEY = "sommer-bundle-dismissed";

export function SommerBundleBar() {
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setActive(isCampaignActive());
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // sessionStorage unavailable — keep dismissed=false
    }
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
          <span className="hidden sm:inline text-green-light"> · Kun til 30. juni</span>
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
