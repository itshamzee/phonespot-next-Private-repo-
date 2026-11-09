"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Notice } from "@/components/admin/ui";
import { staffFetch } from "@/lib/buyback/admin-fetch";

/**
 * Den gamle slutseddelside for en henvendelse. Opkøb laves nu i editoren:
 * findes der en bekræftet (ikke annulleret) seddel, åbnes den; ellers åbnes
 * editoren udfyldt fra henvendelsen (den genbruger selv en eksisterende kladde).
 */
export default function SlutseddelRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await staffFetch(`/api/trade-in/receipts?inquiry_id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error();
        const list = (await res.json()) as Array<{ id: string; status: string }>;
        const done = list.find((r) => r.status !== "draft" && r.status !== "voided");
        router.replace(done ? `/admin/opkoeb/slutsedler/${done.id}` : `/admin/opkoeb/slutsedler/ny?inquiry=${encodeURIComponent(id)}`);
      } catch {
        setError("Slutsedlen kunne ikke findes. Gå tilbage til henvendelsen, og prøv igen.");
      }
    })();
  }, [id, router]);

  return error ? <Notice tone="danger">{error}</Notice> : <p className="text-[14px] text-gray">Åbner slutsedlen …</p>;
}
