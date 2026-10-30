"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Notice } from "@/components/admin/ui";
import { boxLabel, type SaleBox } from "@/lib/lagersalg/boxes";

type Store = "vejle" | "slagelse";

/** "04" ud af "Kasse 04", så nummerformatet kun bor i boxLabel. */
const boxNo = (n: number) => boxLabel(n).replace(/^Kasse /, "");

/**
 * Den aktive lagersalgskasse i butikken. Alt, der optages (undtagen glas),
 * lægges i den åbne kasse. "Luk kasse" lukker den og åbner straks den næste,
 * så der altid er præcis én åben. En lukket kasse kan kun tømmes, ikke fyldes.
 */
export function BoxBar({
  store,
  onBoxChange,
  showOverviewLink = true,
}: {
  store: Store;
  onBoxChange: (box: SaleBox | null) => void;
  /** Praktikanter kan ikke åbne kasseoversigten, så linket skjules for dem. */
  showOverviewLink?: boolean;
}) {
  const [open, setOpen] = useState<SaleBox | null>(null);
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const onChange = useRef(onBoxChange);
  onChange.current = onBoxChange;
  const seq = useRef(0);

  const load = useCallback(async () => {
    const run = ++seq.current;
    try {
      const res = await fetch(`/api/admin/lagersalg/boxes?store=${store}`);
      const data = await res.json();
      if (run !== seq.current) return;
      if (!res.ok) throw new Error(data?.error ?? "Kasserne kunne ikke hentes. Prøv igen.");
      setLoadFailed(false);
      setOpen(data.open ?? null);
      setNextNumber(data.nextNumber ?? null);
      onChange.current(data.open ?? null);
    } catch (err) {
      if (run !== seq.current) return;
      setLoadFailed(true);
      setError(err instanceof Error ? err.message : "Kasserne kunne ikke hentes. Prøv igen.");
    } finally {
      if (run === seq.current) setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    setLoading(true);
    setConfirming(false);
    setError(null);
    setOpen(null);
    setNextNumber(null);
    onChange.current(null);
    void load();
  }, [load]);

  async function act(body: { action: "open" } | { action: "close"; boxId: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/lagersalg/boxes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ store, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kassen kunne ikke opdateres. Prøv igen.");
      // open → { opened }; close → { closed, opened } (lukker altid og åbner næste).
      const opened: SaleBox | null = data.opened ?? null;
      setOpen(opened);
      onChange.current(opened);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kassen kunne ikke opdateres. Prøv igen.");
    } finally {
      setConfirming(false);
      setBusy(false);
      // Hent den aktuelle tilstand igen, også efter en fejl (fx en kollega lukkede kassen).
      void load();
    }
  }

  const following = open ? Math.max(open.number + 1, nextNumber ?? 0) : null;

  return (
    <div className="space-y-2 rounded-xl border border-sand bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-charcoal/60">Lagersalg</p>
          <p className="text-[16px] font-semibold text-charcoal">
            {loading ? "Henter kasse" : open ? `${boxLabel(open.number)} (åben)` : "Ingen åben kasse"}
          </p>
        </div>
        {!loading && open && !confirming && (
          <Button variant="secondary" className="h-11 shrink-0 px-4 text-[14px]" onClick={() => setConfirming(true)} disabled={busy}>
            Luk kasse
          </Button>
        )}
        {!loading && !open && nextNumber != null && (
          <Button variant="primary" className="h-11 shrink-0 px-4 text-[14px]" onClick={() => void act({ action: "open" })} loading={busy}>
            {`Åbn ${boxLabel(nextNumber).toLowerCase()}`}
          </Button>
        )}
      </div>

      {showOverviewLink && (
        <Link href="/admin/produkter/kasser" className="inline-block text-[13px] text-gray underline hover:text-charcoal">
          Kasseoversigt
        </Link>
      )}

      {confirming && open && following != null && (
        <div className="space-y-2">
          <Notice tone="warning" title={`Luk ${boxLabel(open.number).toLowerCase()} og åbn ${boxNo(following)}?`}>
            En lukket kasse kan kun tømmes, ikke fyldes. Nye varer lægges i den nye kasse.
          </Notice>
          <div className="grid grid-cols-[2fr_1fr] gap-2">
            <Button
              variant="primary"
              className="h-12 text-[15px]"
              onClick={() => void act({ action: "close", boxId: open.id })}
              loading={busy}
            >
              {`Luk ${boxLabel(open.number).toLowerCase()} og åbn ${boxNo(following)}`}
            </Button>
            <Button variant="secondary" className="h-12" onClick={() => setConfirming(false)} disabled={busy}>
              Fortryd
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Notice
          tone="danger"
          action={
            loadFailed ? (
              <Button
                variant="secondary"
                className="h-11 shrink-0"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  void load();
                }}
              >
                Prøv igen
              </Button>
            ) : undefined
          }
        >
          {error}
        </Notice>
      )}
    </div>
  );
}
