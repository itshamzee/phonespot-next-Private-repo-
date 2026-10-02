"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatOere } from "@/lib/cart/utils";
import { posJson } from "@/lib/pos/client";
import { PAYMENT_LABELS } from "@/lib/pos/constants";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import type { DailySummary } from "@/lib/pos/daily-summary";
import type { RegisterInfo } from "@/lib/pos/sessions";

const card = "rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-sm">
      <span className="text-charcoal/50">{label}</span>
      <span className={strong ? "font-bold text-charcoal" : "font-medium text-charcoal"}>{value}</span>
    </div>
  );
}

function CashupPageInner() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("location_id") ?? "";
  const [registerId, setRegisterId] = useState(searchParams.get("register_id") ?? "");
  // The day is the Copenhagen calendar day, never the UTC date.
  const [date, setDate] = useState(copenhagenDateString());
  const [registers, setRegisters] = useState<RegisterInfo[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!locationId) return;
    posJson<{ registers: RegisterInfo[] }>(`/api/pos/session?location_id=${locationId}`)
      .then((d) => setRegisters(d.registers))
      .catch(() => undefined);
  }, [locationId]);

  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const q = `location_id=${locationId}&date=${date}${registerId ? `&register_id=${registerId}` : ""}`;
        const data = await posJson<{ summary: DailySummary }>(`/api/pos/cashup?${q}`);
        if (!cancelled) setSummary(data.summary);
      } catch (err) {
        if (!cancelled) {
          setSummary(null);
          setError(err instanceof Error ? err.message : "Fejl ved hentning af dagsopgørelse");
        }
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [locationId, registerId, date]);

  if (!locationId) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <p className="text-sm font-medium text-charcoal/30">Ingen lokation valgt</p>
        <Link href="/admin/platform/pos" className="mt-2 inline-block text-sm font-semibold text-emerald-600">
          Tilbage til kassen
        </Link>
      </div>
    );
  }

  const downloadBase = `/api/pos/daily-summary?location_id=${locationId}&date=${date}${registerId ? `&register_id=${registerId}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/platform/pos" className="text-sm font-semibold text-charcoal/35 hover:text-charcoal/60">
            Tilbage til kassen
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">Dagsopgørelse</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 text-sm"
            aria-label="Kasse"
          >
            <option value="">Alle kasser</option>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm text-charcoal"
          />
          <a href={`${downloadBase}&format=pdf`} className="rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white">
            Hent PDF
          </a>
          <a href={`${downloadBase}&format=csv`} className="rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm font-semibold text-charcoal">
            Hent CSV (Dinero)
          </a>
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>}

      {loading ? (
        <p className="py-16 text-center text-sm text-charcoal/30">Indlæser...</p>
      ) : !summary ? null : (
        <>
          {summary.cash.sessionsOpen > 0 && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
              {summary.cash.sessionsOpen} kassesession er stadig åben. Opgørelsen er først endelig, når kassen er lukket og låst.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className={card}>
              <h2 className="mb-2 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Salg</h2>
              <Row label={`Salg (${summary.salesCount} bon)`} value={formatOere(summary.grossSales)} />
              <Row label={`Returneringer (${summary.creditCount})`} value={`-${formatOere(summary.refunds)}`} />
              <Row label="Omsætning inkl. moms" value={formatOere(summary.netTotal)} strong />
              <Row label="Rabat givet" value={formatOere(summary.discountTotal)} />
              {Object.entries(summary.discountByReason).map(([reason, amount]) => (
                <Row key={reason} label={`  heraf ${reason}`} value={formatOere(amount)} />
              ))}
              <Row label="Enheder / tilbehør" value={`${summary.deviceCount} / ${summary.skuCount}`} />
            </div>

            <div className={card}>
              <h2 className="mb-2 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Moms</h2>
              <Row label="Salg med 25 % moms" value={formatOere(summary.regularGross)} />
              <Row label="Heraf moms" value={formatOere(summary.vatStandard)} />
              <Row label="Brugt-salg (brugtmoms)" value={formatOere(summary.brugtGross)} />
              <Row label="Heraf brugtmoms" value={formatOere(summary.brugtmoms)} />
              <h2 className="mb-2 mt-5 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Bonnumre</h2>
              <Row
                label="Første til sidste"
                value={summary.receiptRange.first ? `${summary.receiptRange.first} - ${summary.receiptRange.last}` : "-"}
              />
              <Row label="Antal bon" value={String(summary.receiptRange.count)} />
              {summary.legacyOrderCount > 0 && <Row label="Ældre salg uden kassenummer" value={String(summary.legacyOrderCount)} />}
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-2 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Betalingstyper (netto)</h2>
            {summary.payments.length === 0 ? (
              <p className="py-3 text-sm text-charcoal/40">Ingen betalinger denne dag.</p>
            ) : (
              summary.payments.map((p) => (
                <Row
                  key={p.type}
                  label={`${PAYMENT_LABELS[p.type]}${p.refunded ? ` (modtaget ${formatOere(p.received)}, retur ${formatOere(p.refunded)})` : ""}`}
                  value={formatOere(p.net)}
                />
              ))
            )}
          </div>

          <div className={card}>
            <h2 className="mb-2 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Kontantkasse</h2>
            <Row label="Startbeholdning" value={formatOere(summary.cash.openingFloat)} />
            <Row label="Forventet kontant" value={formatOere(summary.cash.expectedCash)} />
            <Row label="Optalt kontant" value={formatOere(summary.cash.countedCash)} />
            <Row label="Kassedifference" value={formatOere(summary.cash.difference)} strong />
            <Row label="Dagens udlæg" value={formatOere(summary.cash.expensesTotal)} />
            <Row label="Lagt i bank / pengeskab" value={formatOere(summary.cash.cashToBank)} />
          </div>
        </>
      )}
    </div>
  );
}

export default function CashupPage() {
  return (
    <Suspense fallback={null}>
      <CashupPageInner />
    </Suspense>
  );
}
