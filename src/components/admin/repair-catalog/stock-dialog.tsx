"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/admin/varer/modal";
import { parseAmount } from "@/lib/repairs/catalog-manage-rules";
import type { PartStockResponse } from "@/lib/repairs/catalog-manage-types";
import { MANAGE, api } from "./api";
import { ErrorNote, btnPrimary, btnSecondary, inputCls } from "./ui";

type Mode = "count" | "receive";

/**
 * Lager for en reservedel: optælling pr. butik (regulering med noten "Optælling") eller varemodtagelse.
 * Begge går gennem de eksisterende lagerfunktioner, som også skifter delen fra "altid på lager" til lagerstyret.
 */
export function StockDialog({
  partId,
  onClose,
  onChanged,
}: {
  partId: string | null;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const open = partId !== null;
  const [part, setPart] = useState<PartStockResponse | null>(null);
  const [mode, setMode] = useState<Mode>("count");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [recvStore, setRecvStore] = useState("vejle");
  const [recvQty, setRecvQty] = useState("1");
  const [recvCost, setRecvCost] = useState("");
  const [invoice, setInvoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partId) return;
    let cancelled = false;
    setPart(null);
    setError(null);
    setMode("count");
    setInvoice("");
    setRecvQty("1");
    api<PartStockResponse>(`${MANAGE}/parts/${partId}/stock`)
      .then((p) => {
        if (cancelled) return;
        setPart(p);
        setCounts(Object.fromEntries(p.stores.map((s) => [s.slug, p.tracked ? String(s.quantity) : ""])));
        setRecvStore(p.stores.find((s) => s.can_edit)?.slug ?? "vejle");
        setRecvCost(p.cost_oere !== null ? String(p.cost_oere / 100).replace(".", ",") : "");
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [partId]);

  async function saveCount() {
    if (!part || !partId) return;
    const payload: Record<string, number> = {};
    for (const s of part.stores) {
      if (!s.can_edit) continue;
      const raw = counts[s.slug] ?? "";
      if (raw.trim() === "") continue;
      const n = parseAmount(raw);
      if (n === null || !Number.isInteger(n) || n < 0) {
        setError("Antal skal være et helt tal på 0 eller derover");
        return;
      }
      if (part.tracked && n === s.quantity) continue;
      payload[s.slug] = n;
    }
    if (Object.keys(payload).length === 0) {
      setError(part.tracked ? "Ingen ændringer at gemme" : "Indtast et optalt antal");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ results: unknown[]; tracking_started: boolean }>(`${MANAGE}/parts/${partId}/stock`, {
        body: { counts: payload },
      });
      onChanged(res.tracking_started ? "Optællingen er gemt. Delen er nu lagerstyret." : "Optællingen er gemt.");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveReceive() {
    if (!part || !partId) return;
    const qty = parseAmount(recvQty);
    if (qty === null || !Number.isInteger(qty) || qty < 1) {
      setError("Antal skal være mindst 1");
      return;
    }
    let costPriceOere: number | undefined;
    if (recvCost.trim() !== "") {
      const kr = parseAmount(recvCost);
      if (kr === null || kr < 0) {
        setError("Kostprisen er ugyldig");
        return;
      }
      costPriceOere = Math.round(kr * 100);
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/stock/receive", {
        body: {
          locationSlug: recvStore,
          invoiceNo: invoice.trim() || undefined,
          lines: [{ skuProductId: partId, qty, costPriceOere }],
        },
      });
      onChanged("Varemodtagelsen er gemt.");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const tabCls = (active: boolean) =>
    `-mb-px flex h-9 items-center border-b-2 px-3 text-[14px] ${
      active ? "border-[#1A3D2E] font-semibold text-[#1A3D2E]" : "border-transparent text-[#3D4842] hover:text-[#1A3D2E]"
    }`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={part?.title ? `Lager: ${part.title}` : "Lager"}
      width={520}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Luk
          </button>
          <button type="button" className={btnPrimary} onClick={mode === "count" ? saveCount : saveReceive} disabled={busy || !part}>
            {busy ? "Gemmer..." : mode === "count" ? "Gem optælling" : "Modtag varer"}
          </button>
        </>
      }
    >
      {!part && !error && <p className="text-[14px] text-[#5E6A63]">Henter lager...</p>}
      {part && (
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-[#3D4842]">
            {part.tracked
              ? "Delen er lagerstyret: sager reserverer fra lageret, og 0 på lager giver bestilling."
              : "Ikke optalt: delen regnes som altid på lager, og intet reserveres. Når du taster et antal, bliver den lagerstyret."}
          </p>
          <div role="tablist" className="flex gap-1 border-b border-[#E2E5E0]">
            <button type="button" role="tab" aria-selected={mode === "count"} className={tabCls(mode === "count")} onClick={() => setMode("count")}>
              Optælling
            </button>
            <button type="button" role="tab" aria-selected={mode === "receive"} className={tabCls(mode === "receive")} onClick={() => setMode("receive")}>
              Modtag varer
            </button>
          </div>

          {mode === "count" ? (
            <div className="flex flex-col gap-3">
              {part.stores.map((s) => (
                <label key={s.slug} className="grid grid-cols-[1fr_110px] items-center gap-3 text-[14px]">
                  <span>
                    <span className="font-semibold">{s.name}</span>
                    <span className="block text-[13px] text-[#5E6A63]">
                      {part.tracked ? `På lager ${s.quantity}${s.reserved > 0 ? ` · ${s.reserved} reserveret` : ""}` : "Ikke optalt"}
                      {!s.can_edit && " · kun den butiks manager kan tælle op"}
                    </span>
                  </span>
                  <input
                    inputMode="numeric"
                    className={`${inputCls} text-right tabular-nums`}
                    value={counts[s.slug] ?? ""}
                    placeholder="Optalt"
                    disabled={!s.can_edit}
                    onChange={(e) => setCounts((c) => ({ ...c, [s.slug]: e.target.value }))}
                    aria-label={`Optalt antal i ${s.name}`}
                  />
                </label>
              ))}
              <p className="text-[13px] text-[#5E6A63]">Ændringen skrives som en lagerregulering med noten &quot;Optælling&quot;.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-[14px]">
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Butik</span>
                <select className={inputCls} value={recvStore} onChange={(e) => setRecvStore(e.target.value)}>
                  {part.stores.map((s) => (
                    <option key={s.slug} value={s.slug} disabled={!s.can_edit}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-semibold">Antal</span>
                  <input inputMode="numeric" className={`${inputCls} text-right tabular-nums`} value={recvQty} onChange={(e) => setRecvQty(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-semibold">Kostpris pr. stk. (kr.)</span>
                  <input inputMode="decimal" className={`${inputCls} text-right tabular-nums`} value={recvCost} onChange={(e) => setRecvCost(e.target.value)} />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Fakturanummer (valgfri)</span>
                <input className={inputCls} value={invoice} onChange={(e) => setInvoice(e.target.value)} />
              </label>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Modal>
  );
}
