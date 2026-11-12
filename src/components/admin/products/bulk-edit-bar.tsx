"use client";

import { useState } from "react";
import { Button, Input, Notice, Select } from "@/components/admin/ui";
import { formatOere, parseKrToOere } from "./create/money";

/** Det, der sendes som `change` til /api/admin/products/bulk. */
export type BulkChangeInput = {
  status?: "published" | "draft";
  alwaysInStock?: boolean;
  price?: { mode: "set"; oere: number } | { mode: "percent"; percent: number };
  sale?: { mode: "set"; oere: number } | { mode: "percent"; percent: number } | { mode: "clear" };
};

type Action =
  | ""
  | "publish"
  | "draft"
  | "price-set"
  | "price-percent"
  | "sale-set"
  | "sale-percent"
  | "sale-clear"
  | "order-on"
  | "order-off";

const NEEDS_KR: Action[] = ["price-set", "sale-set"];
const NEEDS_PERCENT: Action[] = ["price-percent", "sale-percent"];

function parsePercent(value: string): number | null {
  const n = Number(value.replace(/%/g, "").replace(/\s/g, "").replace("−", "-").replace(",", "."));
  return value.trim() && Number.isFinite(n) ? n : null;
}

/** Bygger ændringen og en sætning, der siger præcis hvad der sker. Fejltekst, hvis værdien mangler eller er forkert. */
function build(action: Action, value: string): { change: BulkChangeInput; text: string } | { error: string } | null {
  switch (action) {
    case "":
      return null;
    case "publish":
      return { change: { status: "published" }, text: "Vis på webshoppen" };
    case "draft":
      return { change: { status: "draft" }, text: "Skjul fra webshoppen (kladde)" };
    case "order-on":
      return { change: { alwaysInStock: true }, text: "Gør til bestillingsvare" };
    case "order-off":
      return { change: { alwaysInStock: false }, text: "Gør til lagervare (kan blive udsolgt)" };
    case "sale-clear":
      return { change: { sale: { mode: "clear" } }, text: "Fjern tilbudsprisen" };
    case "price-set":
    case "sale-set": {
      const oere = parseKrToOere(value);
      if (oere == null || oere < 100) return { error: "Skriv et beløb i kroner, fx 199." };
      return action === "price-set"
        ? { change: { price: { mode: "set", oere } }, text: `Sæt prisen til ${formatOere(oere)}` }
        : { change: { sale: { mode: "set", oere } }, text: `Sæt tilbudsprisen til ${formatOere(oere)}` };
    }
    case "price-percent": {
      const percent = parsePercent(value);
      if (percent == null || percent === 0 || percent < -90 || percent > 500) return { error: "Skriv en procent, fx -10 for billigere eller 15 for dyrere." };
      return {
        change: { price: { mode: "percent", percent } },
        text: percent < 0 ? `Sænk prisen med ${Math.abs(percent)} %` : `Hæv prisen med ${percent} %`,
      };
    }
    case "sale-percent": {
      const percent = parsePercent(value);
      if (percent == null || percent < 1 || percent > 90) return { error: "Skriv en rabat mellem 1 og 90 procent." };
      return { change: { sale: { mode: "percent", percent } }, text: `Sæt tilbud med ${percent} % rabat` };
    }
  }
}

/**
 * Valglinjen til masseændring: viser hvor mange der er valgt, lader brugeren
 * vælge én ændring og bekræfte den, før noget skrives.
 */
export function BulkEditBar({
  count,
  pageCount,
  total,
  allMatching,
  busy,
  onSelectAllMatching,
  onClear,
  onClose,
  onApply,
}: {
  /** Antal produkter ændringen rammer. */
  count: number;
  /** Antal rækker på den viste side. */
  pageCount: number;
  /** Antal produkter, der matcher filtrene. */
  total: number;
  allMatching: boolean;
  busy: boolean;
  onSelectAllMatching: () => void;
  onClear: () => void;
  onClose: () => void;
  onApply: (change: BulkChangeInput) => Promise<void>;
}) {
  const [action, setAction] = useState<Action>("");
  const [value, setValue] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsKr = NEEDS_KR.includes(action);
  const needsPercent = NEEDS_PERCENT.includes(action);
  const built = build(action, value);
  const ready = built && "change" in built ? built : null;

  function review() {
    if (built && "error" in built) { setError(built.error); return; }
    if (!ready) { setError("Vælg en ændring."); return; }
    setError(null);
    setConfirming(true);
  }

  async function apply() {
    if (!ready) return;
    await onApply(ready.change);
    setConfirming(false);
    setAction("");
    setValue("");
  }

  const products = count === 1 ? "1 produkt" : `${count} produkter`;

  return (
    <div className="sticky top-2 z-10 mb-4 rounded-xl border border-green-eco/30 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[14px] font-medium text-charcoal">
          {count === 0 ? "Sæt flueben ved de produkter, du vil ændre" : allMatching ? `Alle ${count}, der matcher, er valgt` : `${products} valgt`}
        </p>
        {!allMatching && total > pageCount && (
          <button type="button" onClick={onSelectAllMatching} className="text-[13px] font-medium text-green-eco underline-offset-2 hover:underline">
            Vælg alle {total}, der matcher
          </button>
        )}
        {count > 0 && (
          <button type="button" onClick={onClear} className="text-[13px] text-gray underline-offset-2 hover:underline">
            Fravælg alle
          </button>
        )}
        <div className="ml-auto">
          <Button size="sm" variant="quiet" onClick={onClose}>Luk masseændring</Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Select
            aria-label="Ændring"
            value={action}
            onChange={(e) => { setAction(e.target.value as Action); setValue(""); setConfirming(false); setError(null); }}
          >
            <option value="">Vælg ændring</option>
            <optgroup label="Status">
              <option value="publish">Vis på webshoppen</option>
              <option value="draft">Sæt som kladde</option>
            </optgroup>
            <optgroup label="Pris">
              <option value="price-set">Sæt pris</option>
              <option value="price-percent">Ændr pris i procent</option>
            </optgroup>
            <optgroup label="Tilbud">
              <option value="sale-set">Sæt tilbudspris</option>
              <option value="sale-percent">Sæt tilbud i procent</option>
              <option value="sale-clear">Fjern tilbud</option>
            </optgroup>
            <optgroup label="Lager">
              <option value="order-on">Gør til bestillingsvare</option>
              <option value="order-off">Gør til lagervare</option>
            </optgroup>
          </Select>
        </div>
        {(needsKr || needsPercent) && (
          <div className="w-36">
            <Input
              aria-label={needsKr ? "Beløb i kroner" : "Procent"}
              inputMode={needsKr ? "decimal" : "text"}
              value={value}
              onChange={(e) => { setValue(e.target.value); setConfirming(false); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") review(); }}
              placeholder={needsKr ? "199" : action === "price-percent" ? "-10" : "20"}
              suffix={needsKr ? "kr" : "%"}
            />
          </div>
        )}
        <Button variant="primary" disabled={count === 0 || !action || busy} onClick={review}>
          Ændr {count > 0 ? products : ""}
        </Button>
        {action === "price-percent" && <p className="text-[12px] text-gray">Minus gør billigere. Afrundes til hele kroner.</p>}
        {action === "sale-percent" && <p className="text-[12px] text-gray">Rabat af den nuværende pris, afrundet til hele kroner.</p>}
      </div>

      {error && <p className="mt-2 text-[13px] text-[#B42318]" role="alert">{error}</p>}

      {confirming && ready && (
        <div className="mt-3">
          <Notice
            tone="warning"
            title={`${ready.text} på ${products}?`}
            action={
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="primary" loading={busy} onClick={() => void apply()}>Ja, ændr</Button>
                <Button size="sm" disabled={busy} onClick={() => setConfirming(false)}>Fortryd</Button>
              </div>
            }
          >
            Ændringen slår igennem på webshoppen med det samme.
          </Notice>
        </div>
      )}
    </div>
  );
}
