"use client";

import { useEffect } from "react";
import { trackRepairBooking, type RepairBookingInput } from "@/lib/tracking/events";

/** Fyrer repair_booking én gang for en betalt reparation (Stripe-retur). */
export function RepairBookingTracker({ dedupeKey, ...input }: RepairBookingInput & { dedupeKey: string }) {
  useEffect(() => {
    const key = `ps-repair-booking:${dedupeKey}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // fortsæt uden lokal dedup
    }
    trackRepairBooking({ ...input, eventId: `repair_${dedupeKey}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
