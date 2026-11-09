"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { posJson, printBase64Pdf } from "@/lib/pos/client";
import { validatePayments } from "@/lib/pos/calc";
import {
  DISCOUNT_REASONS,
  PAYMENT_LABELS,
  PAYMENT_TYPES,
  REFERENCE_REQUIRED_TYPES,
  isIntegratedTerminal,
  type DiscountReason,
  type PaymentTerminalKind,
  type PaymentType,
} from "@/lib/pos/constants";
import { oereToInput, parseKr } from "@/lib/pos/money";
import { checkTerminalReceipt, TERMINAL_RECEIPT_MAX } from "@/lib/pos/terminal-receipt";
import {
  DEFAULT_DEPOSIT_SUGGESTION_OERE,
  normalizeReceiptNumber,
  tradeInOffsetProblem,
  tradeInRemainderProblem,
  validateDeposit,
  type CaseContext,
  type TradeInLookup,
} from "@/lib/pos/kasse-logic";
import { normalizeIdentifier } from "@/lib/opkoeb/rules";
import { fmtKr } from "./format";
import { newPaymentLine, paymentLinesToInput, type PaymentLineState } from "./payment-lines";

export const btnPrimary =
  "h-11 rounded-[10px] bg-[#1A3D2E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2D6B45] disabled:cursor-not-allowed disabled:opacity-40";
export const btnSecondary =
  "h-11 rounded-[10px] border border-[#C9D0C7] bg-white px-5 text-sm font-semibold text-[#15211B] transition-colors hover:bg-[#F5F6F4] disabled:cursor-not-allowed disabled:opacity-40";
export const fieldClass =
  "h-11 w-full rounded-[10px] border border-[#C9D0C7] bg-white px-3 text-[15px] text-[#15211B] outline-none focus:border-[#1A3D2E] focus:ring-2 focus:ring-[#1A3D2E]/10";

/** Esc closes the dialog (the screen-level Esc only clears the scan field when no dialog is open). */
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-kasse-dialog
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${wide ? "max-w-xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-[#15211B]">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-[#5E6A63] hover:text-[#15211B]" aria-label="Luk">
            Luk
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {children}
    </p>
  );
}

/**
 * Integrated card terminal only: the amount is on its way to / waiting on the
 * terminal. The cashier can ask the terminal to cancel; the sale request then
 * answers by itself (cancelled, or completed if the card was already approved).
 */
function TerminalPending({ amountOere, cancelling, onCancel }: { amountOere: number; cancelling: boolean; onCancel?: () => void }) {
  return (
    <div role="status" aria-live="polite" className="mt-4 rounded-[10px] border border-[#C9D0C7] bg-[#F5F6F4] p-3">
      <p className="text-[15px] font-semibold text-[#15211B]">Sender beløb til terminalen…</p>
      <p className="mt-1 text-sm text-[#5E6A63]">
        <b>{fmtKr(amountOere)}</b>. Bed kunden betale på terminalen. Salget gemmes, når kortet er godkendt.
      </p>
      {onCancel && (
        <div className="mt-3 flex justify-end">
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={cancelling}>
            {cancelling ? "Annullerer…" : "Annuller betaling"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Find case                                                          */
/* ------------------------------------------------------------------ */

export function CaseDialog({
  mode,
  onFind,
  onClose,
  error,
  busy,
}: {
  mode: "payment" | "deposit";
  onFind: (query: string) => void;
  onClose: () => void;
  error: string;
  busy: boolean;
}) {
  const [q, setQ] = useState("");
  return (
    <Modal title={mode === "payment" ? "Hent sag til betaling" : "Depositum på sag"} onClose={onClose}>
      <label className="mb-1 block text-sm text-[#5E6A63]" htmlFor="kasse-case-q">
        Scan sagens stregkode eller skriv sagsnummer
      </label>
      <input
        id="kasse-case-q"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim()) onFind(q.trim());
        }}
        placeholder="PS-2026-0123 eller #1189"
        className={fieldClass}
      />
      {error && <ErrorLine>{error}</ErrorLine>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onClose}>
          Annuller
        </button>
        <button type="button" className={btnPrimary} disabled={!q.trim() || busy} onClick={() => onFind(q.trim())}>
          {busy ? "Søger..." : "Find sag"}
        </button>
      </div>
    </Modal>
  );
}

/** Optional receipt number from the stand-alone terminal (saved on the card payment line). */
export function TerminalReceiptField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const check = checkTerminalReceipt(value);
  return (
    <div className="mt-3">
      <label className="mb-1 block text-sm text-[#5E6A63]" htmlFor="kasse-terminal-receipt">
        Kvitteringsnr. fra terminalen (valgfrit)
      </label>
      <input
        id="kasse-terminal-receipt"
        value={value}
        disabled={disabled}
        maxLength={TERMINAL_RECEIPT_MAX}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
      {!check.ok && <p className="mt-1 text-sm text-red-700">{check.message}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deposit                                                            */
/* ------------------------------------------------------------------ */

const DEPOSIT_METHODS: PaymentType[] = ["kontant", "kort_terminal", "mobilepay"];

export function DepositDialog({
  c,
  onSubmit,
  onClose,
  busy,
  error,
  terminalKind = "manual",
  cancelling = false,
  onCancelTerminal,
}: {
  c: CaseContext;
  onSubmit: (amountOere: number, method: PaymentType, terminalReceipt?: string) => void;
  onClose: () => void;
  busy: boolean;
  error: string;
  /** "manual" (default) = confirm "Kortet er godkendt"; integrated = the amount is sent to the terminal. */
  terminalKind?: PaymentTerminalKind;
  cancelling?: boolean;
  onCancelTerminal?: () => void;
}) {
  const integrated = isIntegratedTerminal(terminalKind);
  // With an integrated terminal there is no manual confirmation step for card.
  const needsCardStep = (m: PaymentType) => m === "kort_terminal" && !integrated;
  const [amountKr, setAmountKr] = useState(oereToInput(DEFAULT_DEPOSIT_SUGGESTION_OERE));
  const [method, setMethod] = useState<PaymentType>("kort_terminal");
  const [cardStep, setCardStep] = useState(false);
  const [receiptNo, setReceiptNo] = useState("");
  const receiptCheck = checkTerminalReceipt(receiptNo);
  const amount = parseKr(amountKr);
  const check = validateDeposit(amount, c);
  const open = c.deposits.reduce((s, d) => s + Math.max(0, d.remaining_oere), 0);

  return (
    <Modal title="Depositum på sag" onClose={onClose}>
      <div className="rounded-[10px] bg-[#F5F6F4] px-3 py-2.5 text-sm">
        <p className="font-semibold text-[#15211B]">
          Sag {c.ticketNumber}
          {c.deviceLabel ? ` · ${c.deviceLabel}` : ""}
        </p>
        <p className="text-[#5E6A63]">
          {c.customer.name}
          {c.totalOere > 0 ? ` · pris ${fmtKr(c.totalOere)}` : " · ingen pris på sagen endnu"}
        </p>
        {open > 0 && <p className="text-[#23703F]">Allerede indbetalt: {fmtKr(open)}</p>}
      </div>

      <label className="mb-1 mt-4 block text-sm text-[#5E6A63]" htmlFor="kasse-deposit-amount">
        Depositum (kr.)
      </label>
      <input
        id="kasse-deposit-amount"
        autoFocus
        inputMode="decimal"
        value={amountKr}
        onChange={(e) => {
          setAmountKr(e.target.value);
          setCardStep(false);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && check.ok && !busy) {
            if (needsCardStep(method)) setCardStep(true);
            else onSubmit(amount!, method);
          }
        }}
        className={`${fieldClass} text-right text-lg font-semibold tabular-nums`}
      />
      {check.warning && <p className="mt-1.5 text-sm text-amber-800">{check.warning}</p>}
      {amount != null && !check.ok && check.message && <p className="mt-1.5 text-sm text-red-700">{check.message}</p>}

      <p className="mb-1 mt-4 text-sm text-[#5E6A63]">Betalt med</p>
      <div className="grid grid-cols-3 gap-2">
        {DEPOSIT_METHODS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setMethod(t);
              setCardStep(false);
            }}
            aria-pressed={method === t}
            className={`h-11 rounded-[10px] text-sm font-semibold ${
              method === t
                ? "border-2 border-[#1A3D2E] bg-[#E7EFE9] text-[#1A3D2E]"
                : "border border-[#C9D0C7] bg-white text-[#15211B]"
            }`}
          >
            {t === "kort_terminal" ? "Kort" : PAYMENT_LABELS[t]}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-[#5E6A63]">
        Depositum er en forudbetaling. Kvitteringen er inkl. 25 % moms, og beløbet trækkes fra, når sagen betales.
      </p>
      {error && <ErrorLine>{error}</ErrorLine>}

      {integrated && busy && method === "kort_terminal" ? (
        <TerminalPending amountOere={amount ?? 0} cancelling={cancelling} onCancel={onCancelTerminal} />
      ) : cardStep ? (
        <div className="mt-4 rounded-[10px] border border-[#C9D0C7] bg-[#F5F6F4] p-3">
          <p className="text-sm text-[#15211B]">
            Slå <b>{fmtKr(amount ?? 0)}</b> ind på Worldline-terminalen. Tryk først, når kortet er godkendt.
          </p>
          <TerminalReceiptField value={receiptNo} onChange={setReceiptNo} disabled={busy} />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setCardStep(false)} disabled={busy}>
              Tilbage
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !check.ok || !receiptCheck.ok}
              onClick={() => onSubmit(amount!, method, receiptCheck.ok ? (receiptCheck.value ?? undefined) : undefined)}
            >
              {busy ? "Gemmer..." : "Kortet er godkendt"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Annuller
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!check.ok || busy}
            onClick={() => (needsCardStep(method) ? setCardStep(true) : onSubmit(amount!, method))}
          >
            {busy ? "Gemmer..." : `Opkræv ${fmtKr(amount ?? 0)}`}
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Diverse salg                                                       */
/* ------------------------------------------------------------------ */

export function FreeTextDialog({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, priceOere: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [priceKr, setPriceKr] = useState("");
  const price = parseKr(priceKr);
  const ok = name.trim().length > 0 && price != null && price > 0;
  return (
    <Modal title="Diverse salg" onClose={onClose}>
      <label className="mb-1 block text-sm text-[#5E6A63]" htmlFor="kasse-free-name">
        Tekst
      </label>
      <input id="kasse-free-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} maxLength={200} />
      <label className="mb-1 mt-3 block text-sm text-[#5E6A63]" htmlFor="kasse-free-price">
        Pris inkl. moms (kr.)
      </label>
      <input
        id="kasse-free-price"
        inputMode="decimal"
        value={priceKr}
        onChange={(e) => setPriceKr(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && ok) onAdd(name.trim(), price!);
        }}
        className={`${fieldClass} text-right tabular-nums`}
      />
      <p className="mt-2 text-xs text-[#5E6A63]">Diverse salg regnes med 25 % moms.</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onClose}>
          Annuller
        </button>
        <button type="button" className={btnPrimary} disabled={!ok} onClick={() => onAdd(name.trim(), price!)}>
          Læg i kurv
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  IMEI / serial number for a unit without one on file                */
/* ------------------------------------------------------------------ */

export function IdentifierDialog({
  deviceName,
  onConfirm,
  onClose,
}: {
  deviceName: string;
  /** The normalised IMEI or serial number. */
  onConfirm: (identifier: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  function confirm() {
    const n = normalizeIdentifier(value);
    if (!n) {
      setInvalid(true);
      return;
    }
    onConfirm(n.value);
  }

  return (
    <Modal title="Enhedens IMEI eller serienummer" onClose={onClose}>
      <p className="text-sm text-[#5E6A63]">
        <b className="text-[#15211B]">{deviceName}</b> har intet IMEI eller serienummer. Scan eller skriv det, så det står på bonen.
      </p>
      <label className="mb-1 mt-4 block text-sm text-[#5E6A63]" htmlFor="kasse-device-identifier">
        IMEI eller serienummer
      </label>
      <input
        id="kasse-device-identifier"
        autoFocus
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirm();
          }
        }}
        className={`${fieldClass} tabular-nums`}
      />
      {invalid && <p className="mt-1.5 text-sm text-red-700">Ugyldigt IMEI eller serienummer</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onClose}>
          Annuller
        </button>
        <button type="button" className={btnPrimary} disabled={!value.trim()} onClick={confirm}>
          Læg i kurv
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Discount                                                           */
/* ------------------------------------------------------------------ */

export function DiscountDialog({
  maxOere,
  initialKr,
  initialReason,
  onSave,
  onClose,
}: {
  maxOere: number;
  initialKr: string;
  initialReason: DiscountReason | "";
  onSave: (kr: string, reason: DiscountReason | "") => void;
  onClose: () => void;
}) {
  const [kr, setKr] = useState(initialKr);
  const [reason, setReason] = useState<DiscountReason | "">(initialReason);
  const amount = parseKr(kr);
  const tooMuch = amount != null && amount > maxOere;
  const ok = amount != null && amount > 0 && !tooMuch && !!reason;
  return (
    <Modal title="Rabat" onClose={onClose}>
      <label className="mb-1 block text-sm text-[#5E6A63]" htmlFor="kasse-discount">
        Rabat (kr.)
      </label>
      <input
        id="kasse-discount"
        autoFocus
        inputMode="decimal"
        value={kr}
        onChange={(e) => setKr(e.target.value)}
        className={`${fieldClass} text-right tabular-nums`}
      />
      {tooMuch && <p className="mt-1.5 text-sm text-red-700">Rabatten kan højst være {fmtKr(maxOere)} (depositum kan ikke rabatteres)</p>}
      <label className="mb-1 mt-3 block text-sm text-[#5E6A63]" htmlFor="kasse-discount-reason">
        Årsag
      </label>
      <select id="kasse-discount-reason" value={reason} onChange={(e) => setReason(e.target.value as DiscountReason | "")} className={fieldClass}>
        <option value="">Vælg årsag</option>
        {DISCOUNT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <div className="mt-5 flex justify-between gap-2">
        <button type="button" className={btnSecondary} onClick={() => onSave("", "")}>
          Fjern rabat
        </button>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Annuller
          </button>
          <button type="button" className={btnPrimary} disabled={!ok} onClick={() => onSave(kr, reason)}>
            Gem
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer                                                           */
/* ------------------------------------------------------------------ */

export type CustomerPick = { id: string; name: string; phone: string | null; email: string | null };

export function CustomerDialog({ onPick, onClose }: { onPick: (c: CustomerPick) => void; onClose: () => void }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerPick[]>([]);
  const [searched, setSearched] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.replace(/[,()*%\\]/g, " ").trim();
    if (term.length < 2) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, name, email, phone")
        .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(8);
      if (mine !== seq.current) return;
      setRows((data ?? []) as CustomerPick[]);
      setSearched(true);
    }, 250);
    return () => clearTimeout(t);
  }, [q, supabase]);

  const term = q.replace(/[,()*%\\]/g, " ").trim();
  const shown = term.length >= 2 ? rows : [];
  return (
    <Modal title="Tilføj kunde" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Navn, telefon eller e-mail"
        aria-label="Søg kunde"
        className={fieldClass}
      />
      <ul className="mt-3 divide-y divide-[#EEF0EC]">
        {shown.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onPick(r)} className="flex w-full flex-col items-start py-2.5 text-left hover:bg-[#F5F6F4]">
              <span className="text-sm font-semibold text-[#15211B]">{r.name}</span>
              <span className="text-xs text-[#5E6A63]">{[r.phone, r.email].filter(Boolean).join(" · ")}</span>
            </button>
          </li>
        ))}
      </ul>
      {searched && term.length >= 2 && shown.length === 0 && <p className="mt-3 text-sm text-[#5E6A63]">Ingen kunder fundet.</p>}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Split payment                                                      */
/* ------------------------------------------------------------------ */

/** Lookup state of a "Modregnet opkøb" line's slutseddel number. */
type OffsetLookup =
  | { state: "loading" }
  | { state: "found"; receipt: TradeInLookup; problem: string | null }
  | { state: "missing" }
  | { state: "error"; message: string };

/** An offset line is usable when its slutseddel was found, can be settled here and covers the amount. */
function offsetLineProblem(line: PaymentLineState, lookup: OffsetLookup | undefined, lines: PaymentLineState[]): string | null {
  if (!lookup || lookup.state !== "found") return "Find slutsedlen";
  if (lookup.problem) return lookup.problem;
  const amount = parseKr(line.amountKr) ?? 0;
  if (amount > lookup.receipt.total_amount) return `Højst ${fmtKr(lookup.receipt.total_amount)} på denne slutseddel`;
  const remainder = tradeInRemainderProblem(lookup.receipt, amount);
  if (remainder) return remainder;
  const ref = line.reference.trim();
  if (lines.some((l) => l.id !== line.id && l.type === "opkoeb" && l.reference.trim() === ref)) {
    return "Slutsedlen er allerede brugt i en anden linje";
  }
  return null;
}

export function SplitDialog({
  total,
  hasCustomer,
  locationId,
  initialLines,
  onConfirm,
  onClose,
}: {
  total: number;
  hasCustomer: boolean;
  /** The register's store: a slutseddel can only be offset in its own store. */
  locationId: string;
  initialLines: PaymentLineState[];
  onConfirm: (lines: PaymentLineState[]) => void;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<PaymentLineState[]>(initialLines);
  const [offsets, setOffsets] = useState<Record<string, OffsetLookup>>({});
  // The reference each line has right now: a lookup answer for an older number is dropped.
  const currentRefs = useRef<Record<string, string>>({});
  currentRefs.current = Object.fromEntries(lines.map((l) => [l.id, normalizeReceiptNumber(l.reference)]));
  const input = paymentLinesToInput(lines);
  const check = validatePayments(input, total);
  const paid = input.reduce((s, l) => s + l.amountOere, 0);
  const remaining = total - paid;
  const needsCustomer = lines.some((l) => l.type === "faktura") && !hasCustomer;
  const offsetBlocked = lines.some((l) => l.type === "opkoeb" && offsetLineProblem(l, offsets[l.id], lines) !== null);

  function add(type: PaymentType) {
    setLines((ls) => [...ls, newPaymentLine(type, Math.max(0, remaining))]);
  }
  function update(id: string, patch: Partial<PaymentLineState>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function findReceipt(line: PaymentLineState) {
    const number = normalizeReceiptNumber(line.reference);
    if (!number) return;
    const stale = () => currentRefs.current[line.id] !== number;
    setOffsets((o) => ({ ...o, [line.id]: { state: "loading" } }));
    try {
      const rows = await posJson<TradeInLookup[]>(`/api/trade-in/receipts?number=${encodeURIComponent(number)}`);
      if (stale()) return;
      const receipt = rows[0];
      if (!receipt) {
        setOffsets((o) => ({ ...o, [line.id]: { state: "missing" } }));
        return;
      }
      const problem = tradeInOffsetProblem(receipt, locationId);
      setOffsets((o) => ({ ...o, [line.id]: { state: "found", receipt, problem } }));
      // The offset never exceeds the slutseddel: cap the line, the rest is paid another way.
      const amount = parseKr(line.amountKr);
      if (!problem && (amount == null || amount <= 0 || amount > receipt.total_amount)) {
        update(line.id, { amountKr: oereToInput(amount != null && amount > 0 ? Math.min(amount, receipt.total_amount) : receipt.total_amount) });
      }
    } catch (err) {
      if (stale()) return;
      const message = err instanceof Error ? err.message : "Slutsedlen kunne ikke hentes";
      setOffsets((o) => ({ ...o, [line.id]: { state: "error", message } }));
    }
  }

  // Reopened with offset lines that already carry a number: look them up again (the slip may have changed).
  useEffect(() => {
    for (const l of initialLines) if (l.type === "opkoeb" && l.reference.trim()) void findReceipt(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="Del betaling" onClose={onClose} wide>
      <p className="text-sm text-[#5E6A63]">
        Total <b className="text-[#15211B]">{fmtKr(total)}</b>. Tilføj en linje pr. betalingsform; beløbene skal give præcis totalen.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PAYMENT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => add(t)}
            className="h-9 rounded-[10px] border border-[#C9D0C7] bg-white px-3 text-sm font-semibold hover:bg-[#F5F6F4]"
          >
            + {t === "kort_terminal" ? "Kort" : t === "opkoeb" ? "Modregn opkøb" : PAYMENT_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {lines.map((l) => (
          <div key={l.id} className="rounded-[10px] border border-[#E2E5E0] p-3">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm font-semibold">{l.type === "kort_terminal" ? "Kort" : PAYMENT_LABELS[l.type]}</span>
              <input
                inputMode="decimal"
                value={l.amountKr}
                onChange={(e) => update(l.id, { amountKr: e.target.value })}
                aria-label={`Beløb ${PAYMENT_LABELS[l.type]}`}
                className="h-10 w-32 rounded-[10px] border border-[#C9D0C7] px-3 text-right text-[15px] font-semibold tabular-nums outline-none focus:border-[#1A3D2E]"
              />
              <span className="text-sm text-[#5E6A63]">kr.</span>
              <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} className="px-2 text-sm text-[#5E6A63] hover:text-red-600">
                Fjern
              </button>
            </div>
            {l.type === "opkoeb" ? (
              <OffsetReference
                line={l}
                lookup={offsets[l.id]}
                problem={offsetLineProblem(l, offsets[l.id], lines)}
                onChange={(reference) => {
                  update(l.id, { reference: reference.toUpperCase() });
                  setOffsets((o) => {
                    const next = { ...o };
                    delete next[l.id];
                    return next;
                  });
                }}
                onFind={() => void findReceipt(l)}
              />
            ) : (
              REFERENCE_REQUIRED_TYPES.includes(l.type) && (
                <input
                  value={l.reference}
                  onChange={(e) => update(l.id, { reference: e.target.value })}
                  placeholder={l.type === "gavekort" ? "Gavekortnummer" : "Nummer på tilgodebevis"}
                  className="mt-2 h-10 w-full rounded-[10px] border border-[#C9D0C7] px-3 text-sm outline-none focus:border-[#1A3D2E]"
                />
              )
            )}
            {l.type === "faktura" && !hasCustomer && <p className="mt-2 text-xs text-red-700">Vælg en kunde for at betale med faktura.</p>}
            {l.type === "kort_terminal" && <p className="mt-2 text-xs text-[#5E6A63]">Beløbet slås ind på Worldline-terminalen.</p>}
          </div>
        ))}
        {lines.length === 0 && <p className="text-sm text-[#5E6A63]">Ingen linjer endnu.</p>}
      </div>

      <div className="mt-4 flex items-baseline justify-between text-sm">
        <span className="text-[#5E6A63]">{remaining >= 0 ? "Mangler" : "For meget"}</span>
        <span className={`font-semibold tabular-nums ${remaining === 0 ? "text-[#23703F]" : "text-red-700"}`}>{fmtKr(Math.abs(remaining))}</span>
      </div>
      {!check.ok && lines.length > 0 && remaining === 0 && <p className="mt-1 text-sm text-red-700">{check.message}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onClose}>
          Annuller
        </button>
        <button
          type="button"
          className={btnPrimary}
          disabled={!check.ok || needsCustomer || offsetBlocked || lines.length === 0}
          onClick={() => onConfirm(lines)}
        >
          Brug delt betaling
        </button>
      </div>
    </Modal>
  );
}

/** Slutseddel number on a "Modregnet opkøb" line: scan or type it, Enter looks it up and shows its total. */
function OffsetReference({
  line,
  lookup,
  problem,
  onChange,
  onFind,
}: {
  line: PaymentLineState;
  lookup: OffsetLookup | undefined;
  problem: string | null;
  onChange: (reference: string) => void;
  onFind: () => void;
}) {
  const inputId = `kasse-offset-${line.id}`;
  return (
    <div className="mt-2">
      <label htmlFor={inputId} className="sr-only">
        Slutseddelnummer
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          autoFocus
          autoComplete="off"
          value={line.reference}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onFind();
            }
          }}
          placeholder="Slutseddelnummer, fx SS-2026-0001"
          className="h-10 flex-1 rounded-[10px] border border-[#C9D0C7] px-3 text-sm outline-none focus:border-[#1A3D2E]"
        />
        <button
          type="button"
          onClick={onFind}
          disabled={!line.reference.trim() || lookup?.state === "loading"}
          className="h-10 rounded-[10px] border border-[#C9D0C7] bg-white px-3 text-sm font-semibold hover:bg-[#F5F6F4] disabled:opacity-40"
        >
          {lookup?.state === "loading" ? "Søger..." : "Find"}
        </button>
      </div>
      {lookup?.state === "found" && (
        <>
          <p className={`mt-2 text-xs ${problem ? "text-[#5E6A63]" : "text-[#23703F]"}`}>
            Slutsedlens total {fmtKr(lookup.receipt.total_amount)}
            {!problem && " · Kan modregnes"}
          </p>
          {problem && <p className="mt-1 text-xs text-red-700">{problem}</p>}
        </>
      )}
      {lookup?.state === "missing" && <p className="mt-2 text-xs text-red-700">Slutsedlen findes ikke i dine butikker</p>}
      {lookup?.state === "error" && <p className="mt-2 text-xs text-red-700">{lookup.message}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card terminal confirmation                                         */
/* ------------------------------------------------------------------ */

export function CardDialog({
  amountOere,
  busy,
  error,
  onApproved,
  onClose,
  terminalKind = "manual",
  cancelling = false,
  onCancelTerminal,
}: {
  amountOere: number;
  busy: boolean;
  error: string;
  /** Manual: the cashier confirms "Kortet er godkendt". Integrated: (re)sends the amount to the terminal. */
  onApproved: (terminalReceipt?: string) => void;
  onClose: () => void;
  terminalKind?: PaymentTerminalKind;
  cancelling?: boolean;
  onCancelTerminal?: () => void;
}) {
  const [receiptNo, setReceiptNo] = useState("");
  const receiptCheck = checkTerminalReceipt(receiptNo);
  if (isIntegratedTerminal(terminalKind)) {
    return (
      <Modal title="Kortbetaling" onClose={busy ? () => undefined : onClose}>
        {busy ? (
          <TerminalPending amountOere={amountOere} cancelling={cancelling} onCancel={onCancelTerminal} />
        ) : (
          <>
            <p className="text-[15px] text-[#15211B]">
              Send <b>{fmtKr(amountOere)}</b> til terminalen.
            </p>
            {error && <ErrorLine>{error}</ErrorLine>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={onClose}>
                Luk
              </button>
              <button type="button" autoFocus className={btnPrimary} onClick={() => onApproved()}>
                {error ? "Prøv igen" : "Send til terminalen"}
              </button>
            </div>
          </>
        )}
      </Modal>
    );
  }
  return (
    <Modal title="Kortbetaling" onClose={busy ? () => undefined : onClose}>
      <p className="text-[15px] text-[#15211B]">
        Slå <b>{fmtKr(amountOere)}</b> ind på Worldline-terminalen.
      </p>
      <p className="mt-1 text-sm text-[#5E6A63]">Tryk på knappen, først når kortet er godkendt. Salget gemmes først da.</p>
      <TerminalReceiptField value={receiptNo} onChange={setReceiptNo} disabled={busy} />
      {error && <ErrorLine>{error}</ErrorLine>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
          Annuller
        </button>
        <button
          type="button"
          autoFocus
          className={btnPrimary}
          onClick={() => onApproved(receiptCheck.ok ? (receiptCheck.value ?? undefined) : undefined)}
          disabled={busy || !receiptCheck.ok}
        >
          {busy ? "Gemmer..." : "Kortet er godkendt"}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Sale done: receipt actions                                         */
/* ------------------------------------------------------------------ */

export type DoneSale = {
  orderId: string;
  receiptNumber: string;
  total: number;
  receiptPdf: string | null;
  warnings: string[];
  caseNumber?: string | null;
  kind: "sale" | "deposit";
  customerEmail?: string | null;
  customerPhone?: string | null;
};

export function DoneDialog({ sale, onNew }: { sale: DoneSale; onNew: () => void }) {
  const [email, setEmail] = useState(sale.customerEmail ?? "");
  const [phone, setPhone] = useState(sale.customerPhone ?? "");
  const [status, setStatus] = useState<string>("");
  const [sending, setSending] = useState<"email" | "sms" | null>(null);

  async function send(channel: "email" | "sms") {
    setSending(channel);
    setStatus("");
    try {
      await posJson("/api/pos/receipt/send", {
        method: "POST",
        body: JSON.stringify({ channel, orderId: sale.orderId, to: channel === "email" ? email : phone }),
      });
      setStatus(channel === "email" ? "Kvittering sendt på e-mail." : "Link til kvittering sendt på SMS.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Kunne ikke sende");
    }
    setSending(null);
  }

  return (
    <Modal title={sale.kind === "deposit" ? "Depositum modtaget" : "Betaling gennemført"} onClose={onNew}>
      <p className="text-3xl font-bold tabular-nums text-[#1A3D2E]">{fmtKr(sale.total)}</p>
      <p className="mt-1 text-sm text-[#5E6A63]">
        Bon {sale.receiptNumber}
        {sale.caseNumber ? ` · sag ${sale.caseNumber}` : ""}
      </p>
      {sale.warnings.map((w) => (
        <p key={w} className="mt-2 text-sm text-amber-800">
          {w}
        </p>
      ))}

      <div className="mt-5 space-y-3">
        <button
          type="button"
          className={`${btnSecondary} w-full`}
          disabled={!sale.receiptPdf}
          onClick={() => sale.receiptPdf && printBase64Pdf(sale.receiptPdf)}
        >
          Print kvittering (80 mm)
        </button>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Kundens e-mail"
            aria-label="E-mail til kvittering"
            className={fieldClass}
          />
          <button type="button" className={btnSecondary} disabled={!email.includes("@") || sending !== null} onClick={() => send("email")}>
            {sending === "email" ? "Sender..." : "Send"}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Kundens mobil (SMS-link)"
            aria-label="Mobilnummer til kvittering"
            className={fieldClass}
          />
          <button type="button" className={btnSecondary} disabled={phone.replace(/\D/g, "").length < 8 || sending !== null} onClick={() => send("sms")}>
            {sending === "sms" ? "Sender..." : "Send"}
          </button>
        </div>
        {status && (
          <p className="text-sm text-[#5E6A63]" role="status">
            {status}
          </p>
        )}
        <a
          href={`/admin/kasse/salg/${sale.orderId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-[#1A3D2E] hover:text-[#2D6B45]"
        >
          Se salget i salgshistorik
        </a>
      </div>

      <button type="button" autoFocus className={`${btnPrimary} mt-5 w-full`} onClick={onNew}>
        Ny kunde
      </button>
    </Modal>
  );
}
