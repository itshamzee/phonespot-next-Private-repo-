"use client";

import { formatKr } from "@/lib/repairs/case-money";
import { LOCATION_LABELS, type LocationSlug, type PanelLine } from "./logic";
import { focusRing } from "./section-card";

/** En enhed i panelet. Med mere end én enhed vises hver for sig med egen delsum og depositum-besked. */
export type PanelDevice = {
  key: string;
  name: string | null;
  sub: string;
  lines: PanelLine[];
  total_oere: number;
  depositHint: boolean;
};

type Props = {
  customerName: string | null;
  customerSub: string | null;
  devices: PanelDevice[];
  /** Samlet beløb for alle enheder. */
  total_oere: number;
  onRemoveLine: (deviceKey: string, line: PanelLine) => void;
  sendSms: boolean;
  onSendSms: (v: boolean) => void;
  print: boolean;
  onPrint: (v: boolean) => void;
  /** Butik skal vælges af brugeren (ejer i "Alle"/"Webshop"). */
  pickStore: boolean;
  location: LocationSlug | null;
  onLocation: (l: LocationSlug) => void;
  missing: string[];
  submitting: boolean;
  error: string;
  canSubmit: boolean;
  onSubmit: () => void;
};

function LineList({ lines, onRemove, suffix }: { lines: PanelLine[]; onRemove: (l: PanelLine) => void; suffix: string }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {lines.map((l) => (
        <li key={l.key} className="flex items-start justify-between gap-3 border-b border-[#EEF0EC] py-3">
          <span className="min-w-0">
            {l.label}
            {l.note && <span className={`block text-[13px] ${l.noteTone === "warn" ? "text-[#9A5B0A]" : "text-[#5E6A63]"}`}>{l.note}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="tabular-nums">{formatKr(l.amount_oere).replace(" kr.", "")}</span>
            <button type="button" aria-label={`Fjern ${l.label}${suffix}`} onClick={() => onRemove(l)} className={`h-6 w-6 rounded-md text-[#5E6A63] hover:bg-[#F5F6F4] ${focusRing}`}>
              x
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

const DEPOSIT_TEXT = "Del skal flyttes eller bestilles. Tag et depositum, når sagen er oprettet.";

export function SummaryPanel(p: Props) {
  const multi = p.devices.length > 1;
  const single = p.devices[0];
  return (
    <aside
      aria-label="Sagen"
      className="flex w-full flex-col border-t border-[#E2E5E0] bg-white lg:sticky lg:top-0 lg:max-h-[calc(100vh-3.5rem)] lg:w-[380px] lg:flex-none lg:self-start lg:border-l lg:border-t-0"
    >
      <div className="flex flex-col gap-1 border-b border-[#E2E5E0] p-5">
        {p.customerName ? (
          <>
            <b className="text-base">{p.customerName}</b>
            <span className="text-sm text-[#5E6A63]">{p.customerSub}</span>
          </>
        ) : (
          <span className="text-sm text-[#5E6A63]">Ingen kunde valgt</span>
        )}
        {multi ? (
          <span className="mt-1.5 text-sm text-[#5E6A63]">{p.devices.length} enheder · én sag pr. enhed</span>
        ) : (
          <span className="mt-1.5 text-sm">
            {single?.name ? (
              <>
                <b>{single.name}</b> · {single.sub}
              </>
            ) : (
              <span className="text-[#5E6A63]">Ingen enhed valgt</span>
            )}
          </span>
        )}
      </div>

      <div className="flex min-h-[120px] flex-1 flex-col overflow-y-auto px-5 py-2 text-sm">
        {multi ? (
          p.devices.map((dev, i) => (
            <section key={dev.key} aria-label={`Opsummering, enhed ${i + 1}`} className="border-b border-[#E2E5E0] py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-[#5E6A63]">Enhed {i + 1}</span>
                  <b className="block">{dev.name ?? "Ingen enhed valgt"}</b>
                  <span className="text-[13px] text-[#5E6A63]">{dev.sub}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums" data-testid={`device-total-${i + 1}`}>
                  {formatKr(dev.total_oere)}
                </span>
              </div>
              {dev.lines.length === 0 ? (
                <p className="m-0 py-2 text-[#5E6A63]">Ingen opgaver endnu.</p>
              ) : (
                <LineList lines={dev.lines} onRemove={(l) => p.onRemoveLine(dev.key, l)} suffix={`, enhed ${i + 1}`} />
              )}
              {dev.depositHint && (
                <div role="note" className="mt-2 rounded-[10px] bg-[#FBEFD9] px-3 py-2.5 text-[13px] text-[#7A4A06]">
                  Enhed {i + 1}: {DEPOSIT_TEXT}
                </div>
              )}
            </section>
          ))
        ) : (
          <>
            {(single?.lines.length ?? 0) === 0 && <p className="m-0 py-3 text-[#5E6A63]">Ingen opgaver endnu.</p>}
            {single && <LineList lines={single.lines} onRemove={(l) => p.onRemoveLine(single.key, l)} suffix="" />}
          </>
        )}
        <div className="mt-auto flex justify-between pb-2 pt-3 text-lg font-bold">
          <span>I alt</span>
          <span className="tabular-nums" data-testid="panel-total">
            {formatKr(p.total_oere)}
          </span>
        </div>
        {!multi && single?.depositHint && (
          <div role="note" className="mb-2 rounded-[10px] bg-[#FBEFD9] px-3 py-2.5 text-[13px] text-[#7A4A06]">
            {DEPOSIT_TEXT}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-[#E2E5E0] p-5 text-sm">
        {p.pickStore && (
          <div role="group" aria-label="Butik" className="flex items-center gap-2">
            <span className="text-[#5E6A63]">Butik</span>
            {(["vejle", "slagelse"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={p.location === s}
                onClick={() => p.onLocation(s)}
                className={`h-8 rounded-lg border px-3 text-sm ${focusRing} ${p.location === s ? "border-[#1A3D2E] bg-[#E7EFE9] font-semibold" : "border-[#C9D0C7] bg-white"}`}
              >
                {LOCATION_LABELS[s]}
              </button>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={p.sendSms} onChange={(e) => p.onSendSms(e.target.checked)} className="h-4 w-4 accent-[#1A3D2E]" />
          Send indleverings-SMS
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={p.print} onChange={(e) => p.onPrint(e.target.checked)} className="h-4 w-4 accent-[#1A3D2E]" />
          Vis indleveringsbevis til print
        </label>
        {p.error && (
          <div role="alert" className="rounded-lg border border-[#F0B4AE] bg-[#FDECEC] px-3 py-2 text-[13px] text-[#B42318]">
            {p.error}
          </div>
        )}
        <button
          type="button"
          disabled={!p.canSubmit || p.submitting}
          onClick={p.onSubmit}
          className={`h-14 rounded-xl bg-[#1A3D2E] text-lg font-bold text-white hover:bg-[#2D6B45] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          {p.submitting ? (multi ? "Opretter sager..." : "Opretter sag...") : multi ? `Opret ${p.devices.length} sager` : "Opret sag"}
        </button>
        {p.missing.length > 0 ? (
          <span role="status" className="text-center text-xs text-[#5E6A63]">
            Mangler: {p.missing.join(", ")}
          </span>
        ) : (
          <span className="text-center text-xs text-[#5E6A63]">Ctrl + Enter</span>
        )}
      </div>
    </aside>
  );
}
