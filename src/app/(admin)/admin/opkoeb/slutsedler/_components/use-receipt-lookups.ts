"use client";

import { useEffect, useState } from "react";
import { staffFetch } from "@/lib/buyback/admin-fetch";

export type StoreInfo = { id: string; slug: string; name: string };

/** Butikkerne, medarbejderen må bruge (kun navne). */
export function useStores(): { stores: StoreInfo[]; loaded: boolean } {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await staffFetch("/api/pos/locations");
        if (!res.ok) return;
        const data = (await res.json()) as { locations: StoreInfo[] };
        if (!cancelled) setStores(data.locations ?? []);
      } catch {
        // Butiksnavne er pynt; siden virker uden.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { stores, loaded };
}
