"use client";

import { useId, type RefObject } from "react";
import { Button, Notice, Segmented, Select, Textarea } from "@/components/admin/ui";
import { smsInfo, type ReplyChannel } from "./inbox-helpers";
import { fillTemplate, type SavedReply } from "./saved-replies";

export type ComposerMode = "reply" | "note";
export type Sending = "waiting" | "done" | "note" | "review" | null;

/** Svarfeltets tilstand for én samtale. Lever i skærmen, så den overlever polling og skift af sag. */
export interface ComposerState {
  mode: ComposerMode;
  text: string;
  channel: ReplyChannel | null;
  /** Udkastet fra Fiks, teksten blev forudfyldt med (null når feltet er brugerens eget). */
  draftId: string | null;
  error: string | null;
}

export interface ComposerProps {
  state: ComposerState;
  onChange: (patch: Partial<ComposerState>) => void;
  channels: ReplyChannel[];
  mailbox: string | null;
  /** Anmeldelse: offentligt svar, ingen kanal, kopier i stedet for send. */
  publicChannel: "Google" | "Trustpilot" | null;
  /** Det oprindelige udkast og dets "Bygger på"-linje, hvis feltet er forudfyldt. */
  draft: { body: string; basedOn: string | null } | null;
  savedReplies: SavedReply[];
  fillVars: { fornavn: string | null; butik: string | null };
  sending: Sending;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (after: "waiting" | "done") => void;
  onNote: () => void;
  onReview: () => void;
}

const smallSelect = "!h-9 min-[900px]:!h-8 min-[900px]:!text-[13px]";
const actionBtn = "w-full min-[900px]:w-auto";

export function Composer({ textareaRef, ...p }: ComposerProps) {
  const id = useId();
  const { state } = p;
  const note = state.mode === "note";
  const isPublic = p.publicChannel !== null;
  const cannotReply = !note && !isPublic && p.channels.length === 0;
  const draftActive = !note && !!p.draft && !!state.draftId;
  const sms = !note && !isPublic && state.channel === "sms" ? smsInfo(state.text) : null;
  const empty = !state.text.trim();
  const busy = p.sending !== null;

  function insertSaved(replyId: string) {
    const reply = p.savedReplies.find((r) => r.id === replyId);
    if (!reply) return;
    const filled = fillTemplate(reply.body, p.fillVars);
    const el = textareaRef.current;
    const start = el?.selectionStart ?? state.text.length;
    const end = el?.selectionEnd ?? state.text.length;
    const next = state.text ? `${state.text.slice(0, start)}${filled}${state.text.slice(end)}` : filled;
    p.onChange({ text: next, error: null });
    requestAnimationFrame(() => {
      el?.focus();
      const caret = start + filled.length;
      el?.setSelectionRange(caret, caret);
    });
  }

  return (
    <div
      className={`flex flex-none flex-col gap-2.5 border-t px-4 pb-3.5 pt-3 min-[900px]:px-[18px] ${
        note ? "border-[#EBDD9A] bg-[#FFF8DB]" : "border-[#E2E5E0] bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          label="Svartype"
          value={state.mode}
          onChange={(mode) => p.onChange({ mode, error: null })}
          options={[
            { value: "reply", label: isPublic ? "Svar offentligt" : "Svar" },
            { value: "note", label: "Intern note" },
          ]}
        />
        {!note && !isPublic && p.channels.length > 0 && (
          <Select
            aria-label="Svar via"
            value={state.channel ?? p.channels[0]}
            onChange={(e) => p.onChange({ channel: e.target.value as ReplyChannel, error: null })}
            className={smallSelect}
          >
            {p.channels.map((c) => (
              <option key={c} value={c}>
                {c === "email" ? `Mail fra ${p.mailbox || "info@phonespot.dk"}` : "SMS"}
              </option>
            ))}
          </Select>
        )}
        {!note && !cannotReply && p.savedReplies.length > 0 && (
          <div className="ml-auto">
            <Select aria-label="Gemte svar" value="" onChange={(e) => insertSaved(e.target.value)} className={smallSelect}>
              <option value="">Gemte svar</option>
              {p.savedReplies.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {!note && isPublic && (
        <p className="m-0 rounded-lg bg-[#FFF4E5] px-2.5 py-1.5 text-[12.5px] font-medium text-[#8A4B08]">
          Dette svar bliver offentligt hos {p.publicChannel}. Skriv ikke telefonnumre, ordrenumre eller andet om kunden.
        </p>
      )}
      {draftActive && p.draft && (
        <p className="m-0 rounded-lg border border-[#CFE0D4] bg-green-pale px-2.5 py-1.5 text-[12.5px] text-green-eco">
          Udkast fra Fiks, ikke sendt.{p.draft.basedOn ? ` ${p.draft.basedOn}.` : ""}
        </p>
      )}
      {state.error && <Notice tone="danger">{state.error}</Notice>}

      {cannotReply ? (
        <Notice>Sagen har hverken en mailadresse eller et telefonnummer, så der kan ikke svares herfra. Skriv en intern note, eller kontakt kunden på anden vis.</Notice>
      ) : (
        <>
          <label htmlFor={id} className="sr-only">
            {note ? "Intern note" : isPublic ? "Offentligt svar" : "Svar til kunden"}
          </label>
          <Textarea
            id={id}
            ref={textareaRef}
            rows={4}
            value={state.text}
            onChange={(e) => p.onChange({ text: e.target.value, error: null })}
            placeholder={note ? "Skriv en note til kollegerne. Kunden ser den ikke." : "Skriv et svar"}
            className="min-h-24 resize-y min-[900px]:!text-[15px]"
          />
        </>
      )}

      <div className="flex flex-col gap-2 min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:items-center">
        {draftActive && p.draft && state.text !== p.draft.body && (
          <Button size="sm" variant="quiet" className="self-start" onClick={() => p.onChange({ text: p.draft!.body, error: null })}>
            Oprindeligt udkast
          </Button>
        )}
        {sms && (
          <span className="text-[12px] tabular-nums text-[#5E6A63]" aria-live="polite">
            {sms.chars} tegn, {sms.parts} {sms.parts === 1 ? "sms" : "sms'er"}
          </span>
        )}
        <span className="hidden flex-1 min-[900px]:block" />
        {note ? (
          <Button variant="primary" className={actionBtn} disabled={empty} loading={p.sending === "note"} onClick={p.onNote}>
            Gem note
          </Button>
        ) : isPublic ? (
          <Button variant="primary" className={actionBtn} disabled={empty || busy} loading={p.sending === "review"} onClick={p.onReview}>
            Kopiér svar og åbn anmeldelsen
          </Button>
        ) : cannotReply ? null : (
          <>
            <Button className={actionBtn} disabled={empty || busy} loading={p.sending === "waiting"} onClick={() => p.onSend("waiting")}>
              Send og vent på kunden
            </Button>
            <Button variant="primary" className={actionBtn} disabled={empty || busy} loading={p.sending === "done"} onClick={() => p.onSend("done")}>
              Send og luk
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
