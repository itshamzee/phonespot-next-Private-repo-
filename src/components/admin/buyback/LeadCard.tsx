"use client";

import Link from "next/link";
import type { ContactInquiry } from "@/lib/supabase/types";
import { DECLINE_REASONS, type DeclineReasonCode } from "@/lib/buyback/decline-reasons";
import { deviceLabel, type LeadDevice } from "@/lib/buyback/lead-devices";
import { DeviceChips } from "./DeviceChips";
import { DeviceLines, type DraftLine, type DeviceSuggestion } from "./DeviceLines";

export interface SuggestionResponse {
  status: "ok" | "manual";
  manualReason: string | null;
  suggestDecline: boolean;
  totalAimKr: number;
  totalFloorKr: number;
  devices: DeviceSuggestion[];
}

export type LeadOutcome =
  | { kind: "offer"; amountKr: number; excluded: number }
  | { kind: "declined"; reasonLabel: string };

export interface LeadDraft {
  lines: DraftLine[];
  suggestion: SuggestionResponse | null;
  suggestionLoaded: boolean;
  outcome: LeadOutcome | null;
}

export interface QueueLead {
  inquiry: ContactInquiry;
  devices: LeadDevice[];
}

interface Props {
  lead: QueueLead;
  draft: LeadDraft;
  position: number;
  total: number;
  handled: number;
  working: boolean;
  error: string;
  declineOpen: boolean;
  reasonPickerFor: number | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onAmountChange: (index: number, value: string) => void;
  onToggleExclude: (index: number) => void;
  onPickReason: (index: number, code: DeclineReasonCode) => void;
  onClosePicker: () => void;
  onSend: () => void;
  onOpenDecline: () => void;
  onCloseDecline: () => void;
  onDecline: (code: DeclineReasonCode) => void;
}

export function LeadCard({
  lead,
  draft,
  position,
  total,
  handled,
  working,
  error,
  declineOpen,
  reasonPickerFor,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onAmountChange,
  onToggleExclude,
  onPickReason,
  onClosePicker,
  onSend,
  onOpenDecline,
  onCloseDecline,
  onDecline,
}: Props) {
  const meta = (lead.inquiry.metadata || {}) as Record<string, unknown>;
  const { devices } = lead;
  const multi = devices.length > 1;
  const suggestion = draft.suggestion;

  const allExcluded = draft.lines.length > 0 && draft.lines.every((line) => line.excluded);
  const readOnly = draft.outcome !== null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal">Kø</h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            {position} af {total}
            {handled > 0 && ` · ${handled} behandlet`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Alt, not the bare arrows — the amount field is focused and there
              the arrow keys belong to the caret. */}
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Forrige lead (Alt+venstre)"
            title="Forrige lead (Alt+venstre)"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-charcoal/50 transition-colors hover:border-stone-300 hover:text-charcoal disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            aria-label="Næste lead (Alt+højre)"
            title="Næste lead (Alt+højre)"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-charcoal/50 transition-colors hover:border-stone-300 hover:text-charcoal disabled:opacity-30"
          >
            ›
          </button>
          <Link href="/admin/opkoeb" className="text-[13px] text-charcoal/40 underline">
            Forlad kø (Esc)
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
        {/* Customer */}
        <div className="border-b border-black/[0.03] px-6 py-4">
          <p className="text-sm font-semibold text-charcoal">{lead.inquiry.name}</p>
          <p className="mt-0.5 text-xs text-charcoal/35">
            {lead.inquiry.email}
            {typeof meta.preferredStore === "string" && ` · ${meta.preferredStore}`}
            {meta.deliveryMethod === "Aflever i butik" ? " · Butik" : " · Forsendelse"}
          </p>
        </div>

        {/* Devices */}
        <div className="space-y-4 px-6 py-5">
          {multi ? (
            <DeviceLines
              devices={devices}
              lines={draft.lines}
              suggestions={suggestion?.devices ?? null}
              reasonPickerFor={reasonPickerFor}
              disabled={working || readOnly}
              onAmountChange={onAmountChange}
              onToggleExclude={onToggleExclude}
              onPickReason={onPickReason}
              onClosePicker={onClosePicker}
            />
          ) : (
            devices.map((entry, i) => (
              <div key={i}>
                <p className="mb-2 text-sm font-semibold text-charcoal">{deviceLabel(entry.device)}</p>
                <DeviceChips condition={entry.condition} />
              </div>
            ))
          )}
          {devices.length === 0 && (
            <p className="text-sm text-charcoal/40">Ingen enhedsdata på henvendelsen.</p>
          )}
        </div>

        {/* What happened, or what to do */}
        <div className="border-t border-black/[0.03] bg-stone-50/50 px-6 py-5">
          {readOnly ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {draft.outcome?.kind === "offer" ? (
                  <>
                    <p className="text-sm font-semibold text-emerald-700">
                      Bud sendt · {draft.outcome.amountKr.toLocaleString("da-DK")} kr
                    </p>
                    {draft.outcome.excluded > 0 && (
                      <p className="mt-0.5 text-[12px] text-charcoal/40">
                        {draft.outcome.excluded}{" "}
                        {draft.outcome.excluded === 1 ? "enhed" : "enheder"} ikke med
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-semibold text-rose-700">
                    Afvist · {draft.outcome?.reasonLabel}
                  </p>
                )}
                <p className="mt-1 text-[12px] text-charcoal/35">Mailen er afsendt og kan ikke trækkes tilbage.</p>
              </div>
              <Link
                href={`/admin/opkoeb/${lead.inquiry.id}`}
                className="text-[13px] text-charcoal/45 underline"
              >
                Åbn hele leadet
              </Link>
            </div>
          ) : !declineOpen ? (
            <>
              {!multi && (
                <>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">Beløb (kr)</label>
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    step="1"
                    disabled={devices.length === 0 || working}
                    value={draft.lines[0]?.amountKr ?? ""}
                    onChange={(e) => onAmountChange(0, e.target.value)}
                    placeholder={suggestion?.status === "manual" ? "Intet forslag — tast selv" : "F.eks. 2500"}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-lg font-semibold text-charcoal placeholder:text-sm placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 disabled:opacity-50"
                  />

                  {suggestion?.status === "ok" && (
                    <div className="mt-2">
                      {suggestion.devices.map((d) => (
                        <p key={d.label} className="text-[12px] leading-relaxed text-stone-500">
                          {d.explanation}
                        </p>
                      ))}
                    </div>
                  )}
                  {suggestion?.status === "manual" && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700">
                      {suggestion.manualReason}
                    </p>
                  )}
                </>
              )}

              {suggestion?.status === "ok" && (
                <p className="mt-2 text-[12px] text-stone-400">
                  Gulv: {suggestion.totalFloorKr.toLocaleString("da-DK")} kr
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {allExcluded ? (
                  // Every device is out. That is a decline, not a 0 kr offer.
                  <button
                    type="button"
                    disabled={working}
                    onClick={onSend}
                    className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {working ? "Afviser..." : "Afvis henvendelsen"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={working || devices.length === 0}
                    onClick={onSend}
                    className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {working ? "Sender..." : "Send tilbud"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={working}
                  onClick={onOpenDecline}
                  className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                >
                  Afvis
                </button>
                <span className="ml-auto text-[11px] text-charcoal/25">
                  Enter sender · A afviser · Alt+← → skifter lead · Esc ud
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-charcoal/50">Vælg årsag — kunden får den at vide:</p>
              <div className="space-y-2">
                {DECLINE_REASONS.map((reason, i) => (
                  <button
                    key={reason.code}
                    type="button"
                    disabled={working}
                    onClick={() => onDecline(reason.code)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-50 ${
                      suggestion?.suggestDecline && reason.code === "icloud_laast"
                        ? "border-amber-300 bg-amber-50 font-semibold text-amber-800"
                        : "border-stone-200 bg-white text-stone-600 hover:border-rose-300 hover:text-rose-600"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-stone-100 text-[11px] font-bold text-stone-500">
                      {i + 1}
                    </span>
                    {reason.label}
                  </button>
                ))}
              </div>
              {error && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={onCloseDecline}
                className="mt-3 text-[13px] text-charcoal/40 underline"
              >
                Fortryd (Esc)
              </button>
            </>
          )}
        </div>
      </div>

      {!readOnly && (
        <p className="mt-4 text-center text-[12px] text-charcoal/25">
          <Link href={`/admin/opkoeb/${lead.inquiry.id}`} className="underline">
            Åbn hele leadet
          </Link>
        </p>
      )}
    </div>
  );
}
