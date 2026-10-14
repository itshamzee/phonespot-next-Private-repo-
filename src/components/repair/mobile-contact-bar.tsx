"use client";

import { useEffect } from "react";
import Link from "next/link";

type Props = {
  phone: string;
  bookingHref: string;
  storeName: string;
};

// Højden på selve baren (3.5rem) uden safe-area.
const BAR_HEIGHT = "3.5rem";

/**
 * Fast bund-bar på mobil (< md) med Ring og Book tid. Sidens bund får
 * ekstra padding, så sidefoden og cookie-indstillinger kan scrolles fri af baren.
 * Cookie-banneret ligger over (højere z-index) og dækkes derfor ikke.
 */
export function MobileContactBar({ phone, bookingHref, storeName }: Props) {
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      document.body.style.paddingBottom = mq.matches
        ? `calc(${BAR_HEIGHT} + env(safe-area-inset-bottom))`
        : "";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.style.paddingBottom = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E5EA] bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="region"
      aria-label={`Kontakt ${storeName}`}
    >
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex h-10 flex-1 items-center justify-center rounded-full border border-[#1A3D2E] text-sm font-bold text-[#1A3D2E]"
        >
          Ring
        </a>
        <Link
          href={bookingHref}
          className="flex h-10 flex-1 items-center justify-center rounded-full bg-[#1A3D2E] text-sm font-bold text-white"
        >
          Book tid
        </Link>
      </div>
    </div>
  );
}
