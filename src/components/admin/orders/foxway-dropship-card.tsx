"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatOere } from "@/lib/cart/utils";

interface FoxwayDevice {
  displayName: string;
  grade: string;
  sourceSku: string | null;
  purchasePrice: number | null;
  sourceUrl: string | null;
}

interface FoxwayDropshipCardProps {
  orderId: string;
  foxwayStatus: "pending" | "ordered";
  foxwayOrderRef: string | null;
  devices: FoxwayDevice[];
  /** True når ordren har opgraderingslinjer — laptoppen skal via butikken. */
  hasUpgrades: boolean;
  shippingAddress: { line1?: string; line2?: string; postal_code?: string; city?: string } | null;
  customerName: string;
}

export function FoxwayDropshipCard(props: FoxwayDropshipCardProps) {
  const router = useRouter();
  const [orderRef, setOrderRef] = useState(props.foxwayOrderRef ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = props.foxwayStatus === "pending";

  async function setStatus(status: "pending" | "ordered") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/shipping/orders/${props.orderId}/foxway`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, order_ref: orderRef }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Ukendt fejl");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke opdatere status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${pending ? "border-[#4B1F82]/40" : "border-sand"}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal">Foxway dropship</h3>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          pending ? "bg-[#4B1F82] text-white" : "bg-[#4B1F82]/10 text-[#4B1F82]"
        }`}>
          {pending ? "Skal bestilles" : "Bestilt"}
        </span>
      </div>

      {/* Enheder der skal bestilles */}
      <ul className="mt-3 space-y-2">
        {props.devices.map((d, i) => (
          <li key={i} className="rounded-lg bg-cream/60 px-3 py-2 text-sm">
            <p className="font-medium text-charcoal">{d.displayName} — Grade {d.grade}</p>
            <p className="mt-0.5 text-xs text-gray">
              SKU: <span className="font-mono">{d.sourceSku ?? "ukendt"}</span>
              {d.purchasePrice != null && <> · Indkøb: {formatOere(d.purchasePrice)}</>}
            </p>
            {d.sourceUrl && (
              <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer"
                 className="mt-1 inline-block text-xs font-medium text-[#4B1F82] underline underline-offset-2">
                Åbn hos Foxway
              </a>
            )}
          </li>
        ))}
      </ul>

      {/* Leveringsadresse-instruks */}
      {props.hasUpgrades ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-semibold">Bestil til butiksadressen</p>
          <p className="mt-0.5">Ordren har opgraderingstilvalg — laptoppen skal monteres og testes her, før den sendes til kunden.</p>
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-cream/60 px-3 py-2 text-xs text-charcoal-light">
          <p className="font-semibold text-charcoal">Bestil med kundens adresse som leveringsadresse</p>
          <p className="mt-0.5">
            {props.customerName}
            {props.shippingAddress && (
              <>, {props.shippingAddress.line1}
              {props.shippingAddress.line2 ? `, ${props.shippingAddress.line2}` : ""},{" "}
              {props.shippingAddress.postal_code} {props.shippingAddress.city}</>
            )}
          </p>
        </div>
      )}

      {/* Statusflow */}
      <div className="mt-4 space-y-2">
        {pending ? (
          <>
            <input
              type="text"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="Foxway-ordrenr. (valgfrit)"
              className="w-full rounded-xl border border-sand bg-cream px-3 py-2 text-sm text-charcoal focus:border-[#4B1F82]/50 focus:bg-white focus:outline-none"
            />
            <button
              onClick={() => setStatus("ordered")}
              disabled={busy}
              className="w-full rounded-xl bg-[#4B1F82] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3a1866] disabled:opacity-50"
            >
              {busy ? "Gemmer…" : "Markér som bestilt"}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-cream/60 px-3 py-2">
            <p className="text-xs text-charcoal-light">
              {props.foxwayOrderRef ? <>Foxway-ordrenr.: <span className="font-mono font-medium text-charcoal">{props.foxwayOrderRef}</span></> : "Bestilt uden ordrenr."}
            </p>
            <button
              onClick={() => setStatus("pending")}
              disabled={busy}
              className="text-xs font-medium text-gray underline underline-offset-2 hover:text-charcoal-light disabled:opacity-50"
            >
              Fortryd
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
