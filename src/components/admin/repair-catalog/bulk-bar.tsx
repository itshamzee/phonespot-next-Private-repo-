"use client";

import { useState } from "react";
import { bulkPriceSummary, formatKr, parseAmount, previewBulkPrice, type BulkPriceOp } from "@/lib/repairs/catalog-manage-rules";
import type { ManageService } from "@/lib/repairs/catalog-manage-types";
import { btnPrimary, btnSecondary, inputCls } from "./ui";

/**
 * Samlet ændring af de valgte rækker: plus/minus kr. eller procent med forhåndsvisning, før noget gemmes.
 * Forhåndsvisningen bruger samme regnefunktion som serveren, så det der vises er det der gemmes.
 */
export function BulkBar({
  selected,
  busy,
  onApplyPrice,
  onSetActive,
  onClear,
}: {
  selected: ManageService[];
  busy: boolean;
  onApplyPrice: (op: BulkPriceOp) => void;
  onSetActive: (active: boolean) => void;
  onClear: () => void;
}) {
  const [mode, setMode] = useState<BulkPriceOp["mode"]>("delta");
  const [amountText, setAmountText] = useState("");

  const amount = parseAmount(amountText);
  const op: BulkPriceOp | null = amount !== null && amount !== 0 ? { mode, amount } : null;
  const preview = op ? previewBulkPrice(selected, op) : [];
  const summary = bulkPriceSummary(preview);
  const names = new Map(selected.map((s) => [s.id, s]));
  const unpriced = selected.filter((s) => !(s.price_dkk > 0) && !s.active).length;

  return (
    <section aria-label="Ændr valgte" className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-[#1A3D2E]/30 bg-white p-4 shadow-lg">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="mr-1 text-[14px] font-semibold">{selected.length} valgt</p>
        <select
          aria-label="Type af prisændring"
          className={`${inputCls} !w-auto`}
          value={mode}
          onChange={(e) => setMode(e.target.value as BulkPriceOp["mode"])}
        >
          <option value="delta">Plus/minus kr.</option>
          <option value="percent">Plus/minus procent</option>
        </select>
        <input
          aria-label="Beløb"
          inputMode="decimal"
          className={`${inputCls} !w-28 text-right tabular-nums`}
          placeholder={mode === "delta" ? "+50 eller -100" : "+10 eller -5"}
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
        />
        <button type="button" className={btnPrimary} disabled={busy || !op || summary.invalid > 0 || summary.changed === 0} onClick={() => op && onApplyPrice(op)}>
          {busy ? "Gemmer..." : `Gem priser (${summary.changed})`}
        </button>
        <span className="mx-1 hidden h-6 w-px bg-[#E2E5E0] sm:block" />
        <button type="button" className={btnSecondary} disabled={busy || unpriced > 0} title={unpriced > 0 ? "Nogle valgte mangler pris" : undefined} onClick={() => onSetActive(true)}>
          Aktivér valgte
        </button>
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => onSetActive(false)}>
          Skjul valgte
        </button>
        <button type="button" className="ml-auto text-[14px] text-[#3D4842] underline" onClick={onClear}>
          Ryd valg
        </button>
      </div>

      {op && (
        <div className="text-[13px]">
          <p className={summary.invalid > 0 ? "text-[#9A5B0A]" : "text-[#3D4842]"}>
            {summary.changed} ændres
            {summary.unchanged > 0 && `, ${summary.unchanged} uændret`}
            {summary.invalid > 0 && `, ${summary.invalid} ville få en ugyldig pris (under 1 kr.)`}
            {" · "}Ændringen vises på hjemmesiden med det samme for aktive reparationer.
          </p>
          <ul className="mt-2 max-h-40 divide-y divide-[#EEF0EC] overflow-y-auto rounded-lg border border-[#E2E5E0]">
            {preview.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <span className="truncate">{names.get(p.id)?.name}</span>
                <span className={`shrink-0 tabular-nums ${p.valid ? "" : "font-semibold text-[#9A5B0A]"}`}>
                  {formatKr(p.from)} <span aria-hidden>→</span> <span className="sr-only">til</span> {formatKr(p.to)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
