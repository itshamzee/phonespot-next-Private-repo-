"use client";

import { useState } from "react";
import { parseKr } from "@/lib/pos/money";
import type { PaymentType } from "@/lib/pos/constants";
import { PAYMENT_LABELS } from "@/lib/pos/constants";
import type { AppliedDepositLine, CartLine, CartTotals, PaymentChoice } from "@/lib/pos/kasse-logic";
import { lineTotal } from "@/lib/pos/kasse-logic";
import type { CustomerPick } from "./dialogs";
import { fmt, fmtKr, shortDate } from "./format";

const QUICK_METHODS: Array<{ type: PaymentType; label: string }> = [
  { type: "kontant", label: "Kontant" },
  { type: "kort_terminal", label: "Kort" },
  { type: "mobilepay", label: "MobilePay" },
];

type Props = {
  lines: CartLine[];
  applied: AppliedDepositLine[];
  totals: CartTotals;
  customer: CustomerPick | null;
  discountOere: number;
  discountReason: string;
  payChoice: PaymentChoice;
  canCharge: boolean;
  processing: boolean;
  blockReason: string | null;
  error: string;
  hasOpenSession: boolean;
  onQty: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onPrice: (key: string, oere: number) => void;
  onCustomer: () => void;
  onClearCustomer: () => void;
  onDiscount: () => void;
  onMethod: (type: PaymentType) => void;
  onSplit: () => void;
  onCharge: () => void;
};

export function CartPanel(p: Props) {
  const [cashGiven, setCashGiven] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const single = p.payChoice.kind === "single" ? p.payChoice.type : null;
  const split = p.payChoice.kind === "split" ? p.payChoice.lines : null;
  const given = parseKr(cashGiven);
  const change = single === "kontant" && given != null ? given - p.totals.total : null;
  const zero = p.totals.total <= 0 && p.lines.length > 0;

  const hint =
    single === "kort_terminal" || (split && split.some((l) => l.type === "kort_terminal"))
      ? "Slå beløbet ind på Worldline-terminalen, og tryk når kortet er godkendt"
      : single === "kontant"
        ? "Indtast det modtagne beløb for at se byttepenge"
        : single === "mobilepay"
          ? "Bekræft, når kunden har betalt med MobilePay"
          : "";

  return (
    <aside aria-label="Kurv" className="flex min-h-0 flex-col border-t border-[#E2E5E0] bg-white lg:w-[400px] lg:shrink-0 lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between border-b border-[#E2E5E0] px-5 py-4">
        <b className="text-base">Kurv</b>
        {p.customer ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="max-w-[180px] truncate font-semibold">{p.customer.name}</span>
            <button type="button" onClick={p.onClearCustomer} className="text-[#5E6A63] hover:text-[#15211B]" aria-label="Fjern kunde">
              Fjern
            </button>
          </span>
        ) : (
          <button type="button" onClick={p.onCustomer} className="text-sm font-medium text-[#1A3D2E] hover:text-[#2D6B45]">
            + Tilføj kunde
          </button>
        )}
      </div>

      <div className="flex min-h-[120px] flex-1 flex-col overflow-y-auto px-5 py-2 text-sm">
        {p.lines.length === 0 && p.applied.length === 0 && (
          <p className="py-6 text-center text-[#5E6A63]">Kurven er tom. Scan en vare, eller vælg et felt.</p>
        )}
        {p.lines.map((l) => (
          <div key={l.key} className="flex items-start justify-between gap-3 border-b border-[#EEF0EC] py-3">
            <div className="min-w-0">
              <b className="break-words">
                {l.type === "repair_service" ? `Sag ${l.ticketNumber}` : l.name}
              </b>
              <div className="text-[#5E6A63]">
                {l.type === "repair_service" && l.detail}
                {l.type === "device" && l.detail}
                {(l.type === "sku_product" || l.type === "free_text") && (
                  <span className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Færre"
                      onClick={() => p.onQty(l.key, -1)}
                      className="h-6 w-6 rounded-md border border-[#C9D0C7] leading-none"
                    >
                      −
                    </button>
                    <span className="tabular-nums">{l.quantity} stk.</span>
                    <button
                      type="button"
                      aria-label="Flere"
                      onClick={() => p.onQty(l.key, 1)}
                      className="h-6 w-6 rounded-md border border-[#C9D0C7] leading-none"
                    >
                      +
                    </button>
                  </span>
                )}
              </div>
              <div className="mt-1 flex gap-3 text-xs">
                {l.type === "repair_service" && (
                  <button
                    type="button"
                    className="text-[#1A3D2E] hover:text-[#2D6B45]"
                    onClick={() => {
                      setEditing(l.key);
                      setEditValue(fmt(l.price).replace(/\./g, ""));
                    }}
                  >
                    Ret pris
                  </button>
                )}
                <button type="button" className="text-[#5E6A63] hover:text-red-600" onClick={() => p.onRemove(l.key)}>
                  {l.type === "repair_service" ? "Fjern sag" : "Fjern"}
                </button>
              </div>
              {editing === l.key && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = parseKr(editValue);
                        if (v != null && v > 0) p.onPrice(l.key, v);
                        setEditing(null);
                      }
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setEditing(null);
                      }
                    }}
                    aria-label="Ny pris i kroner"
                    className="h-9 w-28 rounded-lg border border-[#C9D0C7] px-2 text-right tabular-nums"
                  />
                  <span className="text-xs text-[#5E6A63]">kr. (Enter)</span>
                </div>
              )}
            </div>
            <span className="tabular-nums">{fmt(lineTotal(l))}</span>
          </div>
        ))}
        {p.applied.map((a) => (
          <div key={a.key} className="flex justify-between gap-3 border-b border-[#EEF0EC] py-3 text-[#23703F]">
            <span>Depositum betalt {shortDate(a.paidAt)}</span>
            <span className="tabular-nums">{fmt(-a.price)}</span>
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center justify-between py-1.5 text-[#5E6A63]">
          <span>Rabat</span>
          {p.discountOere > 0 ? (
            <span className="flex items-center gap-2">
              <span className="tabular-nums">{fmt(-p.totals.discount)}</span>
              <button type="button" onClick={p.onDiscount} className="text-[#1A3D2E]">
                Ret
              </button>
            </span>
          ) : (
            <button type="button" onClick={p.onDiscount} className="text-[#1A3D2E] hover:text-[#2D6B45]">
              Tilføj
            </button>
          )}
        </div>
        {p.discountOere > 0 && p.discountReason && <div className="-mt-1 text-xs text-[#5E6A63]">Årsag: {p.discountReason}</div>}
        <div className="flex justify-between py-1.5 text-[#5E6A63]">
          <span>Heraf moms</span>
          <span className="tabular-nums">{fmt(p.totals.vat)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-[#E2E5E0] px-5 py-4">
        {!zero && (
          <div className="grid grid-cols-3 gap-2">
            {QUICK_METHODS.map((m) => {
              const active = single === m.type;
              return (
                <button
                  key={m.type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => p.onMethod(m.type)}
                  className={`h-11 rounded-[10px] text-sm font-semibold ${
                    active ? "border-2 border-[#1A3D2E] bg-[#E7EFE9]" : "border border-[#C9D0C7] bg-white hover:bg-[#F5F6F4]"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}

        {split ? (
          <p className="text-center text-[13px] text-[#15211B]">
            Delt betaling: {split.map((l) => `${PAYMENT_LABELS[l.type as PaymentType]} ${fmt(l.amountOere)}`).join(" + ")} ·{" "}
            <button type="button" onClick={p.onSplit} className="text-[#1A3D2E] underline">
              Ændr
            </button>
          </p>
        ) : (
          !zero && (
            <button type="button" onClick={p.onSplit} className="text-center text-[13px] text-[#1A3D2E] hover:text-[#2D6B45]">
              Del betaling · Faktura · Klarna · Tilgodebevis
            </button>
          )
        )}

        {single === "kontant" && !zero && (
          <div className="flex items-center gap-2 rounded-[10px] bg-[#F5F6F4] px-3 py-2 text-sm">
            <span className="text-[#5E6A63]">Modtaget</span>
            <input
              inputMode="decimal"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              aria-label="Modtaget kontant"
              className="ml-auto h-8 w-24 rounded-lg border border-[#C9D0C7] bg-white px-2 text-right tabular-nums"
            />
            <span className="w-28 text-right font-semibold tabular-nums">{change != null && change >= 0 ? `Retur ${fmt(change)}` : ""}</span>
          </div>
        )}

        {p.error && (
          <p role="alert" className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {p.error}
          </p>
        )}
        {p.blockReason && <p className="text-center text-[13px] text-amber-800">{p.blockReason}</p>}

        <button
          type="button"
          disabled={!p.canCharge}
          onClick={p.onCharge}
          className="h-[60px] rounded-xl bg-[#1A3D2E] text-[19px] font-bold text-white transition-colors hover:bg-[#2D6B45] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {p.processing ? "Behandler..." : zero ? "Afslut salget" : `Opkræv ${fmtKr(p.totals.total)}`}
        </button>
        {hint && <span className="text-center text-xs text-[#5E6A63]">{hint}</span>}
      </div>
    </aside>
  );
}
