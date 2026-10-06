"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatOere } from "@/lib/cart/utils";
import { posJson, printBase64Pdf } from "@/lib/pos/client";
import { oereToInput, parseKr } from "@/lib/pos/money";
import {
  PAYMENT_LABELS,
  REFUND_TYPES,
  RETURN_REASONS,
  isIntegratedTerminal,
  type PaymentTerminalKind,
  type RefundType,
} from "@/lib/pos/constants";
import { buildCreditNote, CreditNoteError, type CreditNote } from "@/lib/pos/credit-note";
import type { ReturnableOrder } from "@/lib/pos/create-return";
import { terminalBodyExtras } from "@/lib/pos/kasse-logic";

type RefundLine = { id: string; type: RefundType; amountKr: string; reference: string };

const card = "rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm";
const input =
  "rounded-xl border border-black/[0.08] bg-[#f4f3f0] px-3 py-2.5 text-sm text-charcoal focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10";

function ReturnPageInner() {
  const params = useSearchParams();
  const locationId = params.get("location_id") ?? "";
  const registerId = params.get("register_id") ?? "";

  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<ReturnableOrder | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const [refunds, setRefunds] = useState<RefundLine[]>([]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Card terminal integration from GET /api/pos/return; "manual" = refund on the terminal by hand.
  const [terminalKind, setTerminalKind] = useState<PaymentTerminalKind>("manual");
  const integrated = isIntegratedTerminal(terminalKind);
  const [done, setDone] = useState<{ receiptNumber: string; refundAmount: number; receiptPdf: string | null } | null>(null);

  async function find() {
    setError("");
    setDone(null);
    setOrder(null);
    try {
      const data = await posJson<{ order: ReturnableOrder; terminalKind?: PaymentTerminalKind }>(
        `/api/pos/return?q=${encodeURIComponent(query)}`,
      );
      setOrder(data.order);
      setTerminalKind(data.terminalKind === "worldline" ? "worldline" : "manual");
      setQty({});
      setRestock(
        Object.fromEntries(data.order.lines.map((l) => [l.id, l.itemType === "sku_product"])),
      );
      setRefunds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salget blev ikke fundet");
    }
  }

  const preview = useMemo<{ note: CreditNote | null; problem: string | null }>(() => {
    if (!order) return { note: null, problem: null };
    const requests = order.lines
      .map((l) => ({ orderItemId: l.id, quantity: qty[l.id] ?? 0, restock: !!restock[l.id] }))
      .filter((r) => r.quantity > 0);
    if (requests.length === 0) return { note: null, problem: null };
    try {
      const returned = Object.fromEntries(order.lines.map((l) => [l.id, l.returned]));
      return { note: buildCreditNote(order.lines, returned, requests), problem: null };
    } catch (err) {
      return { note: null, problem: err instanceof CreditNoteError ? err.message : "Ugyldig returnering" };
    }
  }, [order, qty, restock]);

  const refundAmount = preview.note?.refundAmount ?? 0;
  const refundSum = refunds.reduce((s, r) => s + (parseKr(r.amountKr) ?? 0), 0);
  const canSubmit =
    !!order && !!preview.note && !!reason && refundSum === refundAmount && refundAmount > 0 && !busy && !!locationId && !!registerId;

  function addRefund(type: RefundType) {
    const rest = Math.max(0, refundAmount - refundSum);
    setRefunds((r) => [...r, { id: crypto.randomUUID(), type, amountKr: rest ? oereToInput(rest) : "", reference: "" }]);
  }

  async function submit() {
    if (!order || !canSubmit) return;
    setBusy(true);
    setError("");
    const refundLines = refunds.map((r) => ({ type: r.type, amountOere: parseKr(r.amountKr) ?? 0, reference: r.reference || undefined }));
    try {
      const res = await posJson<{ receiptNumber: string; refundAmount: number; receiptPdf: string | null }>("/api/pos/return", {
        method: "POST",
        body: JSON.stringify({
          originalOrderId: order.id,
          locationId,
          registerId,
          lines: order.lines
            .filter((l) => (qty[l.id] ?? 0) > 0)
            .map((l) => ({ orderItemId: l.id, quantity: qty[l.id], restock: !!restock[l.id] })),
          refunds: refundLines,
          reason,
          notes: notes || undefined,
          ...terminalBodyExtras(terminalKind, refundLines, crypto.randomUUID()),
        }),
      });
      setDone(res);
      setOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Returneringen fejlede");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/platform/pos" className="text-sm font-semibold text-charcoal/35 hover:text-charcoal/60">
          Tilbage til kassen
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold text-charcoal sm:text-3xl">Returnering</h1>
        <p className="mt-1 text-sm text-charcoal/40">
          En returnering oprettes som kreditnota. Det oprindelige salg ændres aldrig.
        </p>
      </div>

      {(!locationId || !registerId) && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          Åbn returnering fra kassen, så kasse og lokation er valgt.
        </p>
      )}
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>}

      {done && (
        <div className={`${card} border-emerald-200 bg-emerald-50`}>
          <p className="font-display text-lg font-bold text-emerald-900">Kreditnota {done.receiptNumber} oprettet</p>
          <p className="mt-1 text-sm text-emerald-800">Tilbagebetal {formatOere(done.refundAmount)}.</p>
          {done.receiptPdf && (
            <button onClick={() => printBase64Pdf(done.receiptPdf!)} className="mt-3 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700">
              Print kreditnota
            </button>
          )}
        </div>
      )}

      <div className={`${card} flex gap-2`}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && find()}
          placeholder="Bonnummer, fx V1-000123"
          className={`${input} min-w-0 flex-1 font-mono`}
          aria-label="Bonnummer"
        />
        <button onClick={find} disabled={query.trim().length < 3} className="rounded-xl bg-charcoal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          Find salg
        </button>
      </div>

      {order && (
        <>
          <div className={card}>
            <p className="font-display text-lg font-bold text-charcoal">
              Bon {order.receiptNumber ?? order.orderNumber} · {formatOere(order.total)}
            </p>
            <p className="text-xs text-charcoal/40">
              {order.confirmedAt ? new Date(order.confirmedAt).toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" }) : ""}
              {order.customerName ? ` · ${order.customerName}` : ""}
            </p>

            <div className="mt-4 divide-y divide-black/[0.04]">
              {order.lines.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-charcoal">{l.description ?? "Vare"}</p>
                    <p className="text-xs text-charcoal/40">
                      {l.quantity} stk. · {formatOere(l.totalPrice - l.discountAmount)}
                      {l.returned.quantity > 0 ? ` · ${l.returned.quantity} allerede returneret` : ""}
                    </p>
                  </div>
                  {l.remaining > 0 && l.itemType === "deposit" && (l.depositRemaining ?? l.totalPrice) < l.totalPrice ? (
                    <span className="text-xs text-charcoal/40">Brugt på en sag. Returnér sagens betaling.</span>
                  ) : l.remaining > 0 ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={l.remaining}
                        value={qty[l.id] ?? 0}
                        onChange={(e) => {
                          const next = Math.max(0, Math.min(l.remaining, Number(e.target.value) || 0));
                          setQty((q) => {
                            const out = { ...q, [l.id]: next };
                            // Repair line and applied deposit go back together.
                            const partner =
                              l.itemType === "repair_service" ? "deposit_applied" : l.itemType === "deposit_applied" ? "repair_service" : null;
                            if (partner) {
                              for (const o of order.lines) if (o.itemType === partner && o.remaining > 0) out[o.id] = next > 0 ? 1 : 0;
                            }
                            return out;
                          });
                        }}
                        className={`${input} w-20 text-right`}
                        aria-label={`Antal der returneres: ${l.description ?? "vare"}`}
                      />
                      {(l.itemType === "device" || l.itemType === "sku_product") && (
                        <label className="flex items-center gap-2 text-xs text-charcoal/60">
                          <input
                            type="checkbox"
                            checked={!!restock[l.id]}
                            onChange={(e) => setRestock((r) => ({ ...r, [l.id]: e.target.checked }))}
                          />
                          {l.itemType === "device" ? "Læg tilbage til salg" : "Læg tilbage på lager"}
                        </label>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-charcoal/40">Fuldt returneret</span>
                  )}
                </div>
              ))}
            </div>
            {preview.problem && <p className="mt-2 text-xs text-red-500">{preview.problem}</p>}
          </div>

          {preview.note && (
            <div className={card}>
              <p className="font-display text-lg font-bold text-charcoal">Tilbagebetal {formatOere(refundAmount)}</p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <select value={reason} onChange={(e) => setReason(e.target.value)} className={input} aria-label="Returårsag">
                  <option value="">Vælg returårsag</option>
                  {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (valgfri)" className={input} />
              </div>

              <p className="mb-2 mt-5 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Tilbagebetaling</p>
              <div className="flex flex-wrap gap-2">
                {REFUND_TYPES.map((t) => (
                  <button key={t} onClick={() => addRefund(t)} className="rounded-xl border border-black/[0.06] bg-[#f4f3f0] px-3 py-2 text-xs font-semibold text-charcoal/60 hover:text-charcoal">
                    {PAYMENT_LABELS[t]}
                  </button>
                ))}
              </div>
              {refunds.map((r) => (
                <div key={r.id} className="mt-2 flex items-center gap-2">
                  <span className="flex-1 text-sm font-semibold text-charcoal">{PAYMENT_LABELS[r.type]}</span>
                  {r.type === "kort_terminal" && (
                    <span className="text-[11px] text-charcoal/40">{integrated ? "Sendes til terminalen" : "Refunder på terminalen"}</span>
                  )}
                  {r.type === "tilgodebevis" && (
                    <input
                      value={r.reference}
                      onChange={(e) => setRefunds((rs) => rs.map((x) => (x.id === r.id ? { ...x, reference: e.target.value } : x)))}
                      placeholder="Nr. (valgfri)"
                      className={`${input} w-32`}
                    />
                  )}
                  <input
                    inputMode="decimal"
                    value={r.amountKr}
                    onChange={(e) => setRefunds((rs) => rs.map((x) => (x.id === r.id ? { ...x, amountKr: e.target.value } : x)))}
                    className={`${input} w-28 text-right`}
                    aria-label={`Beløb ${PAYMENT_LABELS[r.type]}`}
                  />
                  <button onClick={() => setRefunds((rs) => rs.filter((x) => x.id !== r.id))} className="text-xs text-charcoal/30 hover:text-red-500">Fjern</button>
                </div>
              ))}
              <p className={`mt-3 text-sm ${refundSum === refundAmount ? "text-emerald-600" : "text-red-500"}`}>
                {refundSum === refundAmount ? "Tilbagebetalingen matcher kreditbeløbet" : `Mangler ${formatOere(refundAmount - refundSum)}`}
              </p>

              <button onClick={submit} disabled={!canSubmit} className="mt-4 rounded-xl bg-charcoal px-6 py-3 text-sm font-bold text-white disabled:opacity-40">
                {busy
                  ? integrated && refunds.some((r) => r.type === "kort_terminal")
                    ? "Sender beløb til terminalen…"
                    : "Behandler..."
                  : "Opret kreditnota"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnPageInner />
    </Suspense>
  );
}
