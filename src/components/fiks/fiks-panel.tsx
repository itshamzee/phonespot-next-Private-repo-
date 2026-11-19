"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { FIKS_ENDPOINT, FIKS_MAX_CHARS, PANEL_CLASS, readToken, writeToken } from "./fiks-shared";

type From = "visitor" | "fiks" | "staff";
interface ChatMessage {
  id: string;
  from: From;
  body: string;
  /** Shown but not part of the stored conversation (network errors). */
  error?: boolean;
}

export const GREETING =
  "Hej, jeg er Fiks, PhoneSpots digitale assistent. Spørg mig om priser på reparation, hvad din enhed er værd, levering eller garanti.";

export const STARTERS = ["Hvad koster en ny skærm?", "Hvad er min iPhone værd?", "Hvornår har I åbent?"];

const NETWORK_ERROR = "Beskeden blev ikke sendt. Tjek din forbindelse, og prøv igen.";

// Only our own pages become links; trailing punctuation stays text.
const LINK_RE = /(https:\/\/phonespot\.dk\/[^\s<>"'()[\]{}]*[^\s<>"'()[\]{}.,;:!?])/g;

/** Plain text with https://phonespot.dk/... turned into same-tab links. Never renders HTML. */
export function linkify(text: string): ReactNode[] {
  return text.split(LINK_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} className="break-all underline underline-offset-2">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

let idSeq = 0;
const nextId = () => `m${++idSeq}`;

export function FiksPanel({
  open,
  onClose,
  onDisabled,
}: {
  open: boolean;
  onClose: () => void;
  onDisabled: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const restored = useRef(false);

  // Restore an earlier conversation from this tab once, by token.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const token = readToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${FIKS_ENDPOINT}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.status === 503) return onDisabled();
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: { from: From; body: string }[] };
        if (cancelled || !data.messages?.length) return;
        setMessages((current) => [
          ...data.messages!.map((m) => ({ id: nextId(), from: m.from, body: m.body })),
          ...current,
        ]);
      } catch {
        // Nothing to restore; the chat starts fresh.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onDisabled]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending]);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || pending) return;
      setMessages((m) => [...m, { id: nextId(), from: "visitor", body: message }]);
      setDraft("");
      setPending(true);
      try {
        const res = await fetch(FIKS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: readToken() ?? undefined, message, website: honeypotRef.current?.value ?? "" }),
        });
        if (res.status === 503) return onDisabled();
        const data = (await res.json().catch(() => ({}))) as { token?: string | null; reply?: string; error?: string };
        if (!res.ok || !data.reply) {
          setMessages((m) => [...m, { id: nextId(), from: "fiks", body: data.error || NETWORK_ERROR, error: true }]);
          return;
        }
        if (data.token) writeToken(data.token);
        setMessages((m) => [...m, { id: nextId(), from: "fiks", body: data.reply! }]);
      } catch {
        setMessages((m) => [...m, { id: nextId(), from: "fiks", body: NETWORK_ERROR, error: true }]);
      } finally {
        setPending(false);
      }
    },
    [pending, onDisabled],
  );

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <section
      aria-label="Chat med Fiks"
      hidden={!open}
      style={open ? undefined : { display: "none" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      className={`${PANEL_CLASS} motion-safe:animate-[fiks-in_160ms_ease-out]`}
    >
      <style>{"@keyframes fiks-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"}</style>
      <header className="flex items-center justify-between gap-3 border-b border-soft-grey px-4 py-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight">Fiks</p>
          <p className="text-xs leading-tight text-gray">PhoneSpots digitale assistent</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Luk chat"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray transition-colors hover:bg-cream hover:text-charcoal focus-visible:outline-2 focus-visible:outline-green-eco"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div ref={logRef} role="log" aria-live="polite" className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-4">
        <Bubble from="fiks">{GREETING}</Bubble>
        {messages.length === 0 && !pending && (
          <div className="mt-1 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-soft-grey px-3 py-1.5 text-left text-[13px] text-charcoal transition-colors hover:border-charcoal/30 hover:bg-cream focus-visible:outline-2 focus-visible:outline-green-eco"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} from={m.from} error={m.error}>
            {m.from === "visitor" ? m.body : linkify(m.body)}
          </Bubble>
        ))}
        {pending && (
          <p className="self-start text-[13px] text-gray motion-safe:animate-pulse">
            Fiks skriver…
          </p>
        )}
      </div>

      <form
        className="border-t border-soft-grey px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        {/* Honeypot: hidden from people and assistive tech; bots that fill every field get a decoy answer. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
        <div className="flex items-end gap-2">
          <label htmlFor="fiks-input" className="sr-only">
            Skriv til Fiks
          </label>
          <textarea
            id="fiks-input"
            ref={textareaRef}
            rows={1}
            maxLength={FIKS_MAX_CHARS}
            value={draft}
            placeholder="Skriv din besked"
            onChange={(e) => {
              setDraft(e.target.value);
              autosize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(draft);
              }
            }}
            className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-[10px] border border-soft-grey bg-white px-3 py-2 text-[16px] leading-snug text-charcoal placeholder:text-gray focus:border-charcoal/40 focus:outline-none sm:text-sm"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label="Send besked"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-eco text-white transition-colors hover:bg-green-light disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-eco"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-gray">
          Fiks er en AI og kan tage fejl. Skriv ikke CPR-nummer eller kortoplysninger.{" "}
          <Link href="/privatlivspolitik#chat" className="underline underline-offset-2 hover:text-charcoal">
            Privatlivspolitik
          </Link>
        </p>
      </form>
    </section>
  );
}

function Bubble({ from, error, children }: { from: From; error?: boolean; children: ReactNode }) {
  const visitor = from === "visitor";
  return (
    <div className={`flex max-w-[85%] flex-col ${visitor ? "self-end items-end" : "self-start items-start"}`}>
      {from === "staff" && <span className="mb-0.5 text-[11px] text-gray">PhoneSpot</span>}
      <p
        className={`whitespace-pre-wrap break-words rounded-[12px] px-3 py-2 text-sm leading-relaxed ${
          visitor
            ? "rounded-br-[4px] bg-green-eco text-white"
            : error
              ? "rounded-bl-[4px] border border-soft-grey bg-white text-gray"
              : "rounded-bl-[4px] bg-cream text-charcoal"
        }`}
      >
        <span className="sr-only">{visitor ? "Du: " : from === "fiks" ? "Fiks: " : "PhoneSpot: "}</span>
        {children}
      </p>
    </div>
  );
}
