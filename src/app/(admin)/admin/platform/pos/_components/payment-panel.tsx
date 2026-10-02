"use client";

import { useState } from "react";
import { formatOere } from "@/lib/cart/utils";
import {
  PAYMENT_LABELS,
  PAYMENT_TYPES,
  REFERENCE_REQUIRED_TYPES,
  type PaymentType,
} from "@/lib/pos/constants";
import { oereToInput, parseKr } from "@/lib/pos/money";

export type PaymentLineState = {
  id: string;
  type: PaymentType;
  amountKr: string;
  reference: string;
  /** While true the amount follows the remaining total (single-line sales). */
  auto: boolean;
};

export function newPaymentLine(type: PaymentType, amountOere: number): PaymentLineState {
  return {
    id: crypto.randomUUID(),
    type,
    amountKr: amountOere > 0 ? oereToInput(amountOere) : "",
    reference: "",
    auto: true,
  };
}

/** Lines in oere. Unparseable amounts count as 0 so validation fails instead of throwing. */
export function paymentLinesToInput(lines: PaymentLineState[]) {
  return lines.map((l) => ({
    type: l.type,
    amountOere: parseKr(l.amountKr) ?? 0,
    reference: l.reference.trim() || null,
  }));
}

type Props = {
  total: number;
  lines: PaymentLineState[];
  onChange: (lines: PaymentLineState[]) => void;
  hasCustomer: boolean;
};

export function PaymentPanel({ total, lines, onChange, hasCustomer }: Props) {
  const paid = lines.reduce((s, l) => s + (parseKr(l.amountKr) ?? 0), 0);
  const remaining = total - paid;
  const cashLine = lines.find((l) => l.type === "kontant");

  function addLine(type: PaymentType) {
    const rest = Math.max(0, remaining);
    onChange([...lines.map((l) => ({ ...l, auto: false })), newPaymentLine(type, rest)]);
  }

  function update(id: string, patch: Partial<PaymentLineState>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
      <div className="px-5 py-4">
        <p className="mb-3 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Betaling</p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {PAYMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addLine(type)}
              className="rounded-xl border border-black/[0.06] bg-[#f4f3f0] px-2 py-2.5 text-xs font-semibold text-charcoal/60 transition-all hover:bg-charcoal/[0.05] hover:text-charcoal active:scale-[0.97]"
            >
              {PAYMENT_LABELS[type]}
            </button>
          ))}
        </div>

        {lines.length > 0 && (
          <div className="mt-4 space-y-2">
            {lines.map((line) => (
              <div key={line.id} className="rounded-xl border border-black/[0.06] p-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold text-charcoal">
                    {PAYMENT_LABELS[line.type]}
                  </span>
                  <input
                    inputMode="decimal"
                    value={line.amountKr}
                    onChange={(e) => update(line.id, { amountKr: e.target.value, auto: false })}
                    className="w-28 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-right text-sm font-semibold text-charcoal focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                    aria-label={`Beløb ${PAYMENT_LABELS[line.type]}`}
                  />
                  <span className="text-xs text-charcoal/40">kr</span>
                  <button
                    type="button"
                    onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-charcoal/30 hover:bg-red-50 hover:text-red-500"
                  >
                    Fjern
                  </button>
                </div>
                {REFERENCE_REQUIRED_TYPES.includes(line.type) && (
                  <input
                    value={line.reference}
                    onChange={(e) => update(line.id, { reference: e.target.value })}
                    placeholder={line.type === "gavekort" ? "Gavekortnummer" : "Nummer på tilgodebevis"}
                    className="mt-2 w-full rounded-lg border border-black/[0.08] bg-[#f4f3f0] px-3 py-1.5 text-sm text-charcoal placeholder:text-charcoal/25 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                )}
                {line.type === "faktura" && !hasCustomer && (
                  <p className="mt-2 text-xs text-red-500">Vælg en kunde for at betale med faktura.</p>
                )}
                {line.type === "kort_terminal" && (
                  <p className="mt-2 text-[11px] text-charcoal/35">
                    Tast beløbet på kortterminalen først. Gennemfør salget, når betalingen er godkendt.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-baseline justify-between text-sm">
          <span className="text-charcoal/40">Betalt</span>
          <span className="font-semibold text-charcoal">{formatOere(paid)}</span>
        </div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-charcoal/40">{remaining >= 0 ? "Mangler" : "For meget"}</span>
          <span className={`font-semibold ${remaining === 0 ? "text-emerald-600" : "text-red-500"}`}>
            {formatOere(Math.abs(remaining))}
          </span>
        </div>
        {cashLine && <CashChange line={cashLine} />}
      </div>
    </div>
  );
}

/** Helper for the till: how much change to give back on a cash line. Not stored. */
function CashChange({ line }: { line: PaymentLineState }) {
  const due = parseKr(line.amountKr) ?? 0;
  const [given, setGiven] = useState("");
  const givenOere = parseKr(given);
  const change = givenOere != null ? givenOere - due : null;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f4f3f0] px-3 py-2 text-sm">
      <span className="text-charcoal/50">Modtaget kontant</span>
      <input
        inputMode="decimal"
        value={given}
        onChange={(e) => setGiven(e.target.value)}
        className="ml-auto w-24 rounded-lg border border-black/[0.08] bg-white px-2 py-1 text-right text-sm"
        aria-label="Modtaget kontant"
      />
      <span className="w-24 text-right font-semibold text-charcoal">
        {change != null && change >= 0 ? `Retur ${formatOere(change)}` : ""}
      </span>
    </div>
  );
}
