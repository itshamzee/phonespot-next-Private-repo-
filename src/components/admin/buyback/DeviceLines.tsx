"use client";

import { DECLINE_REASONS, type DeclineReasonCode } from "@/lib/buyback/decline-reasons";
import { deviceLabel, type LeadDevice } from "@/lib/buyback/lead-devices";
import { DeviceChips } from "./DeviceChips";

export interface DraftLine {
  amountKr: string;
  excluded: boolean;
  reasonCode: DeclineReasonCode | null;
}

export interface DeviceSuggestion {
  label: string;
  explanation: string;
  manualReason: string | null;
  aimKr: number;
}

interface Props {
  devices: LeadDevice[];
  lines: DraftLine[];
  suggestions: DeviceSuggestion[] | null;
  /** Which device has its reason list open, if any. */
  reasonPickerFor: number | null;
  disabled: boolean;
  onAmountChange: (index: number, value: string) => void;
  onToggleExclude: (index: number) => void;
  onPickReason: (index: number, code: DeclineReasonCode) => void;
  onClosePicker: () => void;
}

function reasonLabel(code: DeclineReasonCode | null): string {
  return DECLINE_REASONS.find((r) => r.code === code)?.label ?? "Vælg årsag";
}

/**
 * One row per device: what the customer said about it, what we offer for it,
 * and the option to leave it out of the offer entirely.
 *
 * Only rendered when the lead has more than one device — a single device reads
 * better as one amount field with no row chrome around it.
 */
export function DeviceLines({
  devices,
  lines,
  suggestions,
  reasonPickerFor,
  disabled,
  onAmountChange,
  onToggleExclude,
  onPickReason,
  onClosePicker,
}: Props) {
  const total = lines.reduce((sum, line) => {
    if (line.excluded) return sum;
    const kr = parseFloat(line.amountKr);
    return Number.isFinite(kr) && kr > 0 ? sum + kr : sum;
  }, 0);

  const includedCount = lines.filter((line) => !line.excluded).length;

  return (
    <div className="space-y-3">
      {devices.map((entry, i) => {
        const line = lines[i];
        const suggestion = suggestions?.[i];
        const pickerOpen = reasonPickerFor === i;

        return (
          <div
            key={i}
            className={`rounded-xl border px-4 py-3.5 transition-colors ${
              line.excluded ? "border-stone-200 bg-stone-50/60" : "border-black/[0.06] bg-white"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className={`mb-2 text-sm font-semibold ${
                    line.excluded ? "text-charcoal/35 line-through" : "text-charcoal"
                  }`}
                >
                  {deviceLabel(entry.device)}
                </p>
                {!line.excluded && <DeviceChips condition={entry.condition} />}
              </div>

              {!line.excluded && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={disabled}
                    value={line.amountKr}
                    onChange={(e) => onAmountChange(i, e.target.value)}
                    placeholder={suggestion?.manualReason ? "Tast selv" : "0"}
                    aria-label={`Beløb for ${deviceLabel(entry.device)}`}
                    className="w-28 rounded-lg border border-stone-200 bg-white px-3 py-2 text-right text-base font-semibold text-charcoal placeholder:text-sm placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 disabled:opacity-50"
                  />
                  <span className="text-[13px] text-charcoal/35">kr</span>
                </div>
              )}
            </div>

            {/* Why this device has no suggested price of its own. */}
            {!line.excluded && suggestion?.manualReason && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                {suggestion.manualReason}
              </p>
            )}
            {!line.excluded && !suggestion?.manualReason && suggestion?.explanation && (
              <p className="mt-2 text-[12px] leading-relaxed text-stone-500">{suggestion.explanation}</p>
            )}

            {line.excluded && !pickerOpen && (
              <p className="mt-1 text-[12px] text-charcoal/45">
                Ikke med i tilbuddet — {reasonLabel(line.reasonCode).toLowerCase()}
              </p>
            )}

            {pickerOpen && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[12px] text-charcoal/50">Hvorfor køber vi den ikke? Kunden får årsagen at vide.</p>
                {DECLINE_REASONS.map((reason, n) => (
                  <button
                    key={reason.code}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPickReason(i, reason.code)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors disabled:opacity-50 ${
                      line.reasonCode === reason.code
                        ? "border-rose-300 bg-rose-50 font-semibold text-rose-700"
                        : "border-stone-200 bg-white text-stone-600 hover:border-rose-300 hover:text-rose-600"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-stone-100 text-[11px] font-bold text-stone-500">
                      {n + 1}
                    </span>
                    {reason.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onClosePicker}
                  className="pt-1 text-[12px] text-charcoal/40 underline"
                >
                  Luk (Esc)
                </button>
              </div>
            )}

            <div className="mt-2.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggleExclude(i)}
                className="text-[12px] text-charcoal/40 underline transition-colors hover:text-charcoal/70 disabled:opacity-50"
              >
                {line.excluded ? "Tag med i tilbuddet igen" : "Ikke med"}
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex items-baseline justify-between border-t border-black/[0.06] pt-3">
        <span className="text-sm font-semibold text-charcoal">
          I alt
          {includedCount !== lines.length && (
            <span className="ml-2 text-[12px] font-normal text-charcoal/40">
              {includedCount} af {lines.length} enheder
            </span>
          )}
        </span>
        <span className="text-lg font-bold text-charcoal">
          {total.toLocaleString("da-DK")} kr
        </span>
      </div>
    </div>
  );
}
