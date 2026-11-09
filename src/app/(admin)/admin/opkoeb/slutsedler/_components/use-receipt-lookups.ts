"use client";

import { useEffect, useState } from "react";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
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

/**
 * Medarbejdernavne til "Medarbejder". Navnelisten er kun til ejeren; alle
 * andre ser deres eget navn og "Kollega" for andre.
 */
export function useStaffNames(): (id: unknown) => string {
  const { me, isOwner } = useStoreScope();
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await staffFetch("/api/admin/staff");
        if (!res.ok) return;
        const data = (await res.json()) as { staff?: Array<{ id: string; name: string | null }> };
        if (cancelled) return;
        setNames(Object.fromEntries((data.staff ?? []).filter((s) => s.name).map((s) => [s.id, s.name as string])));
      } catch {
        // Uden navne vises "Kollega".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner]);
  return (id) => {
    if (typeof id !== "string" || !id) return "–";
    if (me?.id === id) return me.name ?? "Dig";
    return names[id] ?? "Kollega";
  };
}
