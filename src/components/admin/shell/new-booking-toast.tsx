"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dayLabel } from "@/lib/admin/overview/web-bookings";
import { formatTimeWindow } from "@/lib/admin/overview/format";
import { normalizeStoreId, storeLabel } from "@/lib/stores";

export type LatestWebBooking = {
  id: string;
  device: string | null;
  store: string | null;
  date: string | null;
  time: string | null;
  createdAt: string;
};

const STORAGE_KEY = "phonespot_admin_last_seen_booking";
const VISIBLE_MS = 15_000;

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeen(iso: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    /* privat vindue: beskeden kan komme igen ved genindlæsning, men intet går i stykker */
  }
}

/** "Pixel 9 Pro XL · Vejle, tirsdag 27. okt. 16.00–18.00" */
export function bookingSummary(b: LatestWebBooking): string {
  const when = [b.date ? dayLabel(b.date.slice(0, 10)).toLowerCase() : null, formatTimeWindow(b.time)].filter(Boolean).join(" ");
  const where = [storeLabel(normalizeStoreId(b.store)), when].filter(Boolean).join(", ");
  return [b.device, where].filter(Boolean).join(" · ");
}

/**
 * Viser en besked nederst til venstre (ordrebeskeder ligger til højre), når en ny reparationsanmodning lander, mens admin er
 * åben. Første gang siden indlæses, huskes den nyeste booking uden besked, så man ikke
 * får gamle bookinger vist igen; derefter giver hver nyere booking én besked.
 */
export function NewBookingToast({ latest }: { latest: LatestWebBooking | null | undefined }) {
  const [shown, setShown] = useState<LatestWebBooking | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (latest === undefined) return;
    const seen = readSeen();
    if (!initialized.current) {
      initialized.current = true;
      if (latest && (!seen || latest.createdAt > seen)) {
        // Første måling efter indlæsning: kun en booking fra de sidste 10 minutter er "ny nok" til en besked.
        if (Date.now() - Date.parse(latest.createdAt) < 10 * 60_000 && seen) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setShown(latest);
        }
        writeSeen(latest.createdAt);
      }
      return;
    }
    if (latest && (!seen || latest.createdAt > seen)) {
      setShown(latest);
      writeSeen(latest.createdAt);
    }
  }, [latest]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;

  return (
    <div role="status" className="fixed bottom-4 left-4 right-4 z-[70] sm:right-auto sm:w-[360px] lg:left-[248px]">
      <div className="flex items-start gap-3 rounded-xl bg-[#15211B] px-4 py-3 text-white shadow-lg">
        <div className="min-w-0 flex-1 text-[14px]">
          <div className="font-semibold">Ny reparationsanmodning</div>
          <div className="truncate text-[#C9D2CC]">{bookingSummary(shown)}</div>
        </div>
        <Link
          href={`/admin/reparationer/${shown.id}`}
          onClick={() => setShown(null)}
          className="shrink-0 text-[14px] font-semibold text-white underline underline-offset-2"
        >
          Se
        </Link>
        <button
          type="button"
          onClick={() => setShown(null)}
          aria-label="Luk"
          className="-mr-1 shrink-0 rounded-md p-1 text-[#C9D2CC] hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
