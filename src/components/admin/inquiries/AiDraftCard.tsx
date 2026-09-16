"use client";

import { useState } from "react";
import { CATEGORY_LABELS, type AiDraftRow } from "@/lib/mail-agent/types";

interface Props {
  draft: AiDraftRow;
  busy: boolean;
  onApprove: (body: string) => Promise<void>;
  onDiscard: () => Promise<void>;
}

/** The assistant's pending proposal for one customer message, editable before sending. */
export default function AiDraftCard({ draft, busy, onApprove, onDiscard }: Props) {
  const [body, setBody] = useState(draft.draft_body ?? "");
  const [showLookups, setShowLookups] = useState(false);
  const lookups = Array.isArray(draft.lookups) ? draft.lookups : [];

  return (
    <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-50/40 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/40">
          Forslag fra assistenten
        </p>
        <span className="rounded-md bg-charcoal/[0.05] px-2 py-0.5 text-[10px] font-semibold text-charcoal/60">
          {CATEGORY_LABELS[draft.category] ?? draft.category}
        </span>
        {draft.needs_human && (
          <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600">
            Kræver dig
          </span>
        )}
        <span className="ml-auto text-[10px] text-charcoal/30">
          Sikkerhed {Math.round(Number(draft.confidence) * 100)} %
        </span>
      </div>

      <p className="text-sm font-medium text-charcoal/80">{draft.summary}</p>
      <p className="mt-1 text-xs text-charcoal/45">{draft.reason}</p>

      {lookups.length > 0 && (
        <button
          type="button"
          onClick={() => setShowLookups((v) => !v)}
          className="mt-2 text-[11px] font-semibold text-charcoal/40 underline-offset-2 hover:underline"
        >
          {showLookups ? "Skjul hvad den kiggede på" : `Hvad den kiggede på (${lookups.length})`}
        </button>
      )}
      {showLookups && (
        <ul className="mt-1 space-y-0.5 text-[11px] text-charcoal/45">
          {lookups.map((l, i) => (
            <li key={i}>
              {l.tool}
              {Object.keys(l.input ?? {}).length ? ` (${JSON.stringify(l.input)})` : ""}: {l.hits}{" "}
              {l.hits === 1 ? "resultat" : "resultater"}
            </li>
          ))}
        </ul>
      )}

      {draft.draft_body !== null ? (
        <>
          {draft.draft_subject && (
            <p className="mt-3 text-xs text-charcoal/50">Emne: {draft.draft_subject}</p>
          )}
          <textarea
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-2 w-full rounded-lg border border-black/[0.06] bg-white px-4 py-3 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !body.trim()}
              onClick={() => onApprove(body.trim())}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? "Sender..." : "Godkend og send"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDiscard}
              className="rounded-lg border border-black/[0.06] bg-white px-4 py-2 text-[12px] font-semibold text-charcoal/50 transition-colors hover:text-charcoal/70 disabled:opacity-40"
            >
              Afvis
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <p className="text-xs text-charcoal/45">Intet udkast. Skriv svaret selv nedenfor.</p>
          <button
            type="button"
            disabled={busy}
            onClick={onDiscard}
            className="ml-auto rounded-lg border border-black/[0.06] bg-white px-3 py-1.5 text-[11px] font-semibold text-charcoal/50 transition-colors hover:text-charcoal/70 disabled:opacity-40"
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}
