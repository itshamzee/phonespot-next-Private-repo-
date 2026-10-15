"use client";

import { useState } from "react";
import { Btn } from "@/components/admin/repairs/ui";
import { formatKrShort } from "@/lib/repairs/case-money";
import { PRICE_REASON_CHIPS, oereToInput, parseKrToOere } from "@/lib/repairs/price-input";

const input = "h-10 rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm text-[#15211B]";

export function ReasonChips({ chips, onPick }: { chips: readonly string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hurtige begrundelser">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="h-7 rounded-md border border-[#C9D0C7] bg-white px-2 text-[13px] text-[#3D4842] hover:bg-[#F5F6F4]"
        >
          {c}
        </button>
      ))}
    </div>
  );
}

type Props = {
  /** Linjens navn, til skærmlæsere og tekst. */
  name: string;
  /** Listepris pr. stk. i øre. null for fritekst (ingen listepris, ingen begrundelse nødvendig). */
  listOere: number | null;
  /** Nuværende pris pr. stk. i øre. */
  currentOere: number;
  /** Nuværende begrundelse (forudfyldes). */
  currentReason?: string | null;
  busy?: boolean;
  submitLabel?: string;
  onSubmit: (unitOere: number, reason: string | null) => void;
  onCancel: () => void;
};

/**
 * Indbygget prisrettelse: kr.-felt (komma som decimaltegn), begrundelse med hurtigvalg og
 * en tydelig linje med listepris og ny pris. Begrundelse kræves når prisen afviger fra listeprisen.
 */
export function PriceOverrideForm({ name, listOere, currentOere, currentReason, busy, submitLabel = "Gem pris", onSubmit, onCancel }: Props) {
  const [price, setPrice] = useState(oereToInput(currentOere));
  const [reason, setReason] = useState(currentReason ?? "");
  const [touched, setTouched] = useState(false);

  const parsed = parseKrToOere(price);
  const differs = parsed != null && listOere != null && parsed !== listOere;
  const needsReason = differs;
  const reasonMissing = needsReason && reason.trim().length === 0;
  const priceError = parsed == null ? "Skriv en gyldig pris i kroner, f.eks. 999 eller 999,50" : null;
  const error = priceError ?? (reasonMissing ? "Skriv en begrundelse, når prisen afviger fra listeprisen" : null);

  return (
    <form
      role="group"
      aria-label={`Ret pris: ${name}`}
      className="mt-2 flex flex-col gap-3 rounded-lg border border-[#E2E5E0] bg-[#FAFBF9] p-3 no-underline"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (error || parsed == null) return;
        onSubmit(parsed, differs ? reason.trim() : null);
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[13px] text-[#5E6A63]">
          Ny pris (kr.)
          <input
            inputMode="decimal"
            aria-label="Ny pris (kr.)"
            className={`${input} w-32`}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            autoFocus
          />
        </label>
        <p className="m-0 pb-2 text-[13px] text-[#5E6A63]">
          {listOere != null && (
            <>
              Listepris {formatKrShort(listOere)}
              {" · "}
            </>
          )}
          {parsed != null && parsed !== currentOere ? <>Nu {formatKrShort(currentOere)}, ny {formatKrShort(parsed)}</> : <>Nu {formatKrShort(currentOere)}</>}
        </p>
      </div>
      {listOere != null && (
        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1 text-[13px] text-[#5E6A63]">
            Begrundelse{needsReason ? "" : " (kun nødvendig ved afvigelse fra listeprisen)"}
            <input
              aria-label="Begrundelse for prisen"
              className={`${input} w-full`}
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <ReasonChips chips={PRICE_REASON_CHIPS} onPick={setReason} />
        </div>
      )}
      {touched && error && (
        <p role="alert" className="m-0 text-sm text-[#B42318]">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Btn type="submit" variant="primary" size="sm" disabled={busy}>
          {submitLabel}
        </Btn>
        <Btn size="sm" onClick={onCancel}>
          Annuller
        </Btn>
      </div>
    </form>
  );
}
