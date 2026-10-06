"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatOere } from "@/lib/cart/utils";
import { posJson } from "@/lib/pos/client";
import { oereToInput, parseKr } from "@/lib/pos/money";
import {
  computeCardDifference,
  computeCashDifference,
  computeExpectedCash,
  validateCardClose,
  validateCashClose,
  type CashExpense,
} from "@/lib/pos/cash-session";
import type { RegisterInfo, SessionHistoryRow } from "@/lib/pos/sessions";

type ExpenseRow = { id: string; description: string; amountKr: string };

const card = "rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm";
const input =
  "rounded-xl border border-black/[0.08] bg-[#f4f3f0] px-3 py-2.5 text-sm text-charcoal focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10";

function dateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const locationId = params.get("location_id") ?? "";
  const [registerId, setRegisterId] = useState(params.get("register_id") ?? "");

  const [registers, setRegisters] = useState<RegisterInfo[]>([]);
  const [history, setHistory] = useState<SessionHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [closedInfo, setClosedInfo] = useState<{
    expected: number;
    counted: number;
    difference: number;
    expectedCard: number;
    countedCard: number;
    cardDifference: number;
  } | null>(null);

  // open form
  const [openingFloat, setOpeningFloat] = useState("");
  // close form
  const [counted, setCounted] = useState("");
  const [toBank, setToBank] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [notes, setNotes] = useState("");
  const [terminalTotal, setTerminalTotal] = useState("");
  const [cardNote, setCardNote] = useState("");
  // adjustment form
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const register = registers.find((r) => r.id === registerId) ?? null;
  const open = register?.openSession ?? null;

  const load = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const q = `location_id=${locationId}${registerId ? `&register_id=${registerId}` : ""}`;
      const data = await posJson<{ registers: RegisterInfo[]; history: SessionHistoryRow[] }>(`/api/pos/session?${q}`);
      setRegisters(data.registers);
      setHistory(data.history);
      if (!registerId && data.registers[0]) setRegisterId(data.registers[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente kassestatus");
    }
    setLoading(false);
  }, [locationId, registerId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Suggest the next starting float: what stayed in the drawer last time.
  useEffect(() => {
    const last = history.find((h) => h.locked && h.countedCash != null);
    if (last && !openingFloat) {
      setOpeningFloat(oereToInput((last.countedCash ?? 0) - (last.cashToBank ?? 0)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  if (!locationId) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center text-sm text-charcoal/40">
        Ingen lokation valgt.{" "}
        <Link href="/admin/platform/pos" className="font-semibold text-emerald-600">Tilbage til kassen</Link>
      </div>
    );
  }

  const expenseList: CashExpense[] = expenses
    .map((e) => ({ description: e.description, amountOere: parseKr(e.amountKr) ?? 0 }))
    .filter((e) => e.description.trim() || e.amountOere > 0);
  const countedOere = parseKr(counted);
  const toBankOere = parseKr(toBank) ?? 0;
  const expected = open
    ? computeExpectedCash({ openingFloat: open.openingFloat, netCashPayments: open.netCashPayments, expenses: expenseList })
    : 0;
  const closeCheck =
    countedOere == null
      ? { ok: false as const, code: "counted", message: "Indtast optalt kontant" }
      : validateCashClose({ countedCash: countedOere, cashToBank: toBankOere, expenses: expenseList });

  const expectedCard = open?.netCardPayments ?? 0;
  const terminalOere = parseKr(terminalTotal);
  const cardDiff = terminalOere == null ? null : computeCardDifference(terminalOere, expectedCard);
  const cardCheck = validateCardClose({ countedTerminal: terminalOere, expectedCard, note: cardNote });

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await posJson<Record<string, number | string | boolean>>("/api/pos/session", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openSession() {
    const float = parseKr(openingFloat);
    if (float == null || !registerId) return setError("Indtast startbeholdning");
    const res = await act({ action: "open", registerId, openingFloat: float });
    if (res) {
      setOpeningFloat("");
      await load();
    }
  }

  async function closeSession() {
    if (!open || countedOere == null || terminalOere == null || !closeCheck.ok || !cardCheck.ok) return;
    if (!window.confirm("Luk og lås kassen? Sessionen kan ikke ændres bagefter.")) return;
    const res = await act({
      action: "close",
      sessionId: open.id,
      countedCash: countedOere,
      cashToBank: toBankOere,
      expenses: expenseList,
      notes: notes || undefined,
      countedCard: terminalOere,
      cardNote: cardNote.trim() || undefined,
    });
    if (res) {
      setClosedInfo({
        expected: Number(res.expectedCash),
        counted: Number(res.countedCash),
        difference: Number(res.difference),
        expectedCard: Number(res.expectedCard),
        countedCard: Number(res.countedCard),
        cardDifference: Number(res.cardDifference),
      });
      setCounted("");
      setToBank("");
      setExpenses([]);
      setNotes("");
      setTerminalTotal("");
      setCardNote("");
      await load();
    }
  }

  async function addAdjustment(sessionId: string) {
    const amount = parseKr(adjAmount.replace("-", ""));
    if (amount == null || amount === 0) return setError("Indtast et beløb");
    const signed = adjAmount.trim().startsWith("-") ? -amount : amount;
    const res = await act({ action: "adjust", sessionId, amountOere: signed, reason: adjReason });
    if (res) {
      setAdjusting(null);
      setAdjAmount("");
      setAdjReason("");
      await load();
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/platform/pos" className="text-sm font-semibold text-charcoal/35 hover:text-charcoal/60">
            Tilbage til kassen
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-charcoal sm:text-3xl">Kassesession</h1>
        </div>
        {registers.length > 1 && (
          <select
            value={registerId}
            onChange={(e) => {
              setRegisterId(e.target.value);
              router.replace(`/admin/platform/pos/session?location_id=${locationId}&register_id=${e.target.value}`);
            }}
            className={input}
            aria-label="Kasse"
          >
            {registers.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>
      )}

      {closedInfo && (
        <div className={`${card} border-emerald-200 bg-emerald-50`}>
          <p className="font-display text-lg font-bold text-emerald-900">Kassen er lukket og låst</p>
          <p className="mt-1 text-sm text-emerald-800">
            Forventet {formatOere(closedInfo.expected)} · Optalt {formatOere(closedInfo.counted)} · Difference{" "}
            <strong>{formatOere(closedInfo.difference)}</strong>
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Kortsalg i kassen {formatOere(closedInfo.expectedCard)} · Terminal {formatOere(closedInfo.countedCard)} · Kortdifference{" "}
            <strong>{formatOere(closedInfo.cardDifference)}</strong>
          </p>
          <Link
            href={`/admin/platform/pos/cashup?location_id=${locationId}&register_id=${registerId}`}
            className="mt-2 inline-block text-sm font-semibold text-emerald-700"
          >
            Se dagsopgørelsen
          </Link>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-charcoal/30">Indlæser...</p>
      ) : !register ? (
        <p className="py-10 text-center text-sm text-charcoal/40">Der er ingen kasse oprettet for denne lokation.</p>
      ) : !open ? (
        <div className={card}>
          <h2 className="font-display text-lg font-bold text-charcoal">Åbn {register.name}</h2>
          <p className="mt-1 text-sm text-charcoal/40">Tæl kontanterne i skuffen og indtast startbeholdningen.</p>
          <div className="mt-4 flex items-center gap-2">
            <input
              inputMode="decimal"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              className={`${input} w-40 text-right`}
              aria-label="Startbeholdning i kroner"
            />
            <span className="text-sm text-charcoal/40">kr</span>
            <button
              onClick={openSession}
              disabled={busy || parseKr(openingFloat) == null}
              className="ml-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Åbn kassen
            </button>
          </div>
        </div>
      ) : (
        <div className={card}>
          <h2 className="font-display text-lg font-bold text-charcoal">Luk {register.name}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-charcoal/40">Åbnet</dt><dd className="font-semibold">{dateTime(open.openedAt)}</dd></div>
            <div><dt className="text-charcoal/40">Startbeholdning</dt><dd className="font-semibold">{formatOere(open.openingFloat)}</dd></div>
            <div><dt className="text-charcoal/40">Kontant netto</dt><dd className="font-semibold">{formatOere(open.netCashPayments)}</dd></div>
            <div><dt className="text-charcoal/40">Forventet i kassen</dt><dd className="font-semibold">{formatOere(expected)}</dd></div>
            <div><dt className="text-charcoal/40">Kortsalg i kassen</dt><dd className="font-semibold">{formatOere(expectedCard)}</dd></div>
          </dl>

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Dagens udlæg (kontant ud af kassen)</p>
            {expenses.map((e) => (
              <div key={e.id} className="mb-2 flex gap-2">
                <input
                  value={e.description}
                  onChange={(ev) => setExpenses((rows) => rows.map((r) => (r.id === e.id ? { ...r, description: ev.target.value } : r)))}
                  placeholder="Hvad"
                  className={`${input} min-w-0 flex-1`}
                />
                <input
                  inputMode="decimal"
                  value={e.amountKr}
                  onChange={(ev) => setExpenses((rows) => rows.map((r) => (r.id === e.id ? { ...r, amountKr: ev.target.value } : r)))}
                  placeholder="Beløb"
                  className={`${input} w-28 text-right`}
                />
                <button onClick={() => setExpenses((rows) => rows.filter((r) => r.id !== e.id))} className="px-2 text-xs text-charcoal/30 hover:text-red-500">Fjern</button>
              </div>
            ))}
            <button
              onClick={() => setExpenses((rows) => [...rows, { id: crypto.randomUUID(), description: "", amountKr: "" }])}
              className="text-sm font-semibold text-emerald-600"
            >
              Tilføj udlæg
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-charcoal/50">Optalt kontant (kr)</span>
              <input inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} className={`${input} w-full text-right`} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-charcoal/50">Lagt i bank / pengeskab (kr)</span>
              <input inputMode="decimal" value={toBank} onChange={(e) => setToBank(e.target.value)} className={`${input} w-full text-right`} />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-charcoal/50">Note</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={`${input} w-full`} />
          </label>

          {countedOere != null && (
            <p className="mt-4 text-sm">
              Difference:{" "}
              <strong className={computeCashDifference(countedOere, expected) === 0 ? "text-emerald-600" : "text-red-600"}>
                {formatOere(computeCashDifference(countedOere, expected))}
              </strong>
              {toBankOere > 0 && <span className="text-charcoal/40"> · Efterlades i kassen {formatOere(Math.max(0, countedOere - toBankOere))}</span>}
            </p>
          )}
          {!closeCheck.ok && counted && <p className="mt-2 text-xs text-red-500">{closeCheck.message}</p>}

          <div className="mt-6 border-t border-black/[0.06] pt-5">
            <p className="mb-2 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Kortafstemning</p>
            <label className="block text-sm">
              <span className="mb-1 block text-charcoal/50">Total fra terminalens dagsrapport (kr)</span>
              <input
                inputMode="decimal"
                value={terminalTotal}
                onChange={(e) => setTerminalTotal(e.target.value)}
                className={`${input} w-full text-right sm:w-60`}
              />
            </label>
            {cardDiff != null && (
              <p className="mt-3 text-sm">
                Kortdifference:{" "}
                <strong className={cardDiff === 0 ? "text-emerald-600" : "text-red-600"}>{formatOere(cardDiff)}</strong>
                {cardDiff !== 0 && <span className="text-charcoal/50"> · Tjek bonerne for slåfejl</span>}
              </p>
            )}
            {cardDiff != null && cardDiff !== 0 && (
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-charcoal/50">Note til kortdifferencen</span>
                <input value={cardNote} onChange={(e) => setCardNote(e.target.value)} maxLength={300} className={`${input} w-full`} />
              </label>
            )}
            {!cardCheck.ok && (terminalTotal || cardNote) && <p className="mt-2 text-xs text-red-500">{cardCheck.message}</p>}
          </div>

          <button
            onClick={closeSession}
            disabled={busy || !closeCheck.ok || !cardCheck.ok}
            className="mt-5 rounded-xl bg-charcoal px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Luk og lås kassen
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className={card}>
          <h2 className="mb-3 font-display text-lg font-bold text-charcoal">Seneste sessioner</h2>
          <div className="divide-y divide-black/[0.04]">
            {history.map((h) => (
              <div key={h.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-charcoal">
                    {dateTime(h.openedAt)} - {h.closedAt ? dateTime(h.closedAt) : "åben"}
                  </span>
                  {h.locked ? (
                    <span className="text-charcoal/50">
                      Forventet {formatOere(h.expectedCash ?? 0)} · Optalt {formatOere(h.countedCash ?? 0)} · Difference{" "}
                      <strong>{formatOere(h.finalDifference ?? 0)}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-600">Åben</span>
                  )}
                </div>
                {h.locked && h.countedCard != null && (
                  <p className="mt-1 text-xs text-charcoal/50">
                    Kort: kortsalg {formatOere(h.expectedCard ?? 0)} · Terminal {formatOere(h.countedCard)} · Difference{" "}
                    <strong className={h.cardDifference ? "text-red-600" : undefined}>{formatOere(h.cardDifference ?? 0)}</strong>
                    {h.cardNote ? ` · ${h.cardNote}` : ""}
                  </p>
                )}
                {h.adjustments.map((a) => (
                  <p key={a.id} className="mt-1 text-xs text-charcoal/40">
                    Justering {formatOere(a.amountOere)}: {a.reason}
                  </p>
                ))}
                {h.locked && (
                  <div className="mt-2">
                    {adjusting === h.id ? (
                      <div className="flex flex-wrap gap-2">
                        <input inputMode="decimal" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="Beløb, fx -50" className={`${input} w-32 text-right`} aria-label="Justering i kroner" />
                        <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Begrundelse" className={`${input} min-w-0 flex-1`} aria-label="Begrundelse" />
                        <button onClick={() => addAdjustment(h.id)} disabled={busy || !adjReason.trim()} className="rounded-xl bg-charcoal px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Gem</button>
                        <button onClick={() => setAdjusting(null)} className="text-xs text-charcoal/40">Annuller</button>
                      </div>
                    ) : (
                      <button onClick={() => setAdjusting(h.id)} className="text-xs font-semibold text-emerald-600">Tilføj justering</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={null}>
      <SessionPageInner />
    </Suspense>
  );
}
