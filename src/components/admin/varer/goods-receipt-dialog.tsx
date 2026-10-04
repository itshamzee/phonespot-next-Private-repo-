"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SCOPE_LABELS, SCOPE_SLUGS, type ScopeSlug } from "@/lib/auth/store-scope";
import { parseDKKToOere } from "@/lib/platform/format";
import { postJson } from "@/lib/transfers/client";
import { Modal } from "./modal";

type Product = { id: string; title: string; ean: string | null; product_number: string | null; cost_price: number | null };
type Line = { product: Product; qty: string; cost: string };

/**
 * Modtag varer: tilbehør og reservedele ind på en butiks lager mod en faktura.
 * Skriver lager og lagerbevægelse (Varemodtagelse) og opdaterer kostprisen.
 */
export function GoodsReceiptDialog({
  onClose,
  defaultLocation,
  lockLocation,
}: {
  onClose: () => void;
  defaultLocation: ScopeSlug;
  /** Managere kan kun modtage til egen butik; ejeren vælger. */
  lockLocation: boolean;
}) {
  const router = useRouter();
  const [location, setLocation] = useState<ScopeSlug>(defaultLocation);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/stock/products?q=${encodeURIComponent(q)}`);
      if (!res.ok || mine !== seq.current) return;
      const json = (await res.json()) as { products: Product[] };
      setResults(json.products);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function addProduct(p: Product) {
    setLines((cur) =>
      cur.some((l) => l.product.id === p.id)
        ? cur
        : [...cur, { product: p, qty: "1", cost: p.cost_price !== null ? String(p.cost_price / 100).replace(".", ",") : "" }],
    );
    setQ("");
    setResults([]);
  }

  async function submit() {
    setError(null);
    const payload = [];
    for (const l of lines) {
      const qty = Number(l.qty);
      if (!Number.isInteger(qty) || qty < 1) {
        setError(`Angiv et antal for ${l.product.title}.`);
        return;
      }
      const cost = l.cost.trim() === "" ? null : parseDKKToOere(l.cost);
      if (l.cost.trim() !== "" && (cost === null || cost < 0)) {
        setError(`Ugyldig kostpris for ${l.product.title}.`);
        return;
      }
      payload.push({ skuProductId: l.product.id, qty, costPriceOere: cost });
    }
    setBusy(true);
    const res = await postJson("/api/admin/stock/receive", {
      locationSlug: location,
      invoiceNo: invoiceNo || null,
      invoiceDate: invoiceDate || null,
      lines: payload,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Modtag varer"
      width={680}
      footer={
        done ? (
          <button type="button" onClick={onClose} className="h-10 rounded-lg bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white">
            Luk
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-[14px] text-[#3D4842] hover:bg-[#F5F6F4]">
              Annuller
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || lines.length === 0}
              className="h-10 rounded-lg bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Gemmer" : "Læg på lager"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-[15px]">Varerne er lagt på lager hos {SCOPE_LABELS[location]}. Lagerbevægelserne er bogført med fakturanummeret.</p>
      ) : (
        <div className="flex flex-col gap-4 text-[14px]">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Butik</span>
              <select
                value={location}
                disabled={lockLocation}
                onChange={(e) => setLocation(e.target.value as ScopeSlug)}
                className="h-10 rounded-lg border border-[#C9D0C7] bg-white px-3 disabled:bg-[#F5F6F4]"
              >
                {SCOPE_SLUGS.map((s) => (
                  <option key={s} value={s}>
                    {SCOPE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Fakturanummer</span>
              <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} maxLength={60} className="h-10 rounded-lg border border-[#C9D0C7] px-3" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Fakturadato</span>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-10 rounded-lg border border-[#C9D0C7] px-3" />
            </label>
          </div>

          <div className="relative">
            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Tilføj vare</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Søg på navn, EAN eller varenummer"
                className="h-10 rounded-lg border border-[#C9D0C7] px-3"
              />
            </label>
            {q.trim().length >= 2 && results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#E2E5E0] bg-white shadow-lg">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => addProduct(p)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-[#F5F6F4]">
                      <span className="font-medium">{p.title}</span>
                      <span className="text-[13px] text-[#5E6A63]">{p.ean ?? p.product_number ?? ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#E2E5E0] text-left text-[13px] text-[#5E6A63]">
                    <th className="py-2 font-semibold">Vare</th>
                    <th className="w-24 py-2 font-semibold">Antal</th>
                    <th className="w-32 py-2 font-semibold">Kostpris pr. stk. (kr.)</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.product.id} className="border-b border-[#EEF0EC]">
                      <td className="py-2 pr-2">{l.product.title}</td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={1}
                          aria-label={`Antal ${l.product.title}`}
                          value={l.qty}
                          onChange={(e) => setLines((cur) => cur.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
                          className="h-9 w-20 rounded-lg border border-[#C9D0C7] px-2"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          inputMode="decimal"
                          aria-label={`Kostpris ${l.product.title}`}
                          value={l.cost}
                          onChange={(e) => setLines((cur) => cur.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))}
                          className="h-9 w-28 rounded-lg border border-[#C9D0C7] px-2"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          aria-label={`Fjern ${l.product.title}`}
                          onClick={() => setLines((cur) => cur.filter((_, j) => j !== i))}
                          className="h-8 w-8 rounded-lg text-[#5E6A63] hover:bg-[#F5F6F4]"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[13px] text-[#5E6A63]">Kostprisen opdaterer varens seneste kostpris. Lad feltet stå tomt for at beholde den nuværende.</p>
          {error && (
            <p role="alert" className="rounded-lg bg-[#FDECEC] px-3 py-2 text-[#B42318]">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
