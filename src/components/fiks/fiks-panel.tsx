"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatKroner, type FiksSellAction } from "@/lib/fiks/quote-shared";
import { FiksFigure } from "./fiks-figure";
import { FIKS_ENDPOINT, FIKS_MAX_CHARS, PANEL_CLASS, STARTERS, readToken, writeToken } from "./fiks-shared";
import styles from "./fiks.module.css";

export { STARTERS };

type From = "visitor" | "fiks" | "staff";
interface ChatMessage {
  id: string;
  from: From;
  body: string;
  /** Shown but not part of the stored conversation (network errors). */
  error?: boolean;
  /** Added in this page view (animates in); restored messages do not. */
  fresh?: boolean;
  /** One-tap handoff to the sell form, under the reply that gave the price. */
  action?: FiksSellAction;
}

export const GREETING =
  "Hej, jeg er Fiks, PhoneSpots digitale assistent. Spørg mig om priser på reparation, hvad din enhed er værd, levering eller garanti.";

const NETWORK_ERROR = "Beskeden blev ikke sendt. Tjek din forbindelse, og prøv igen.";
const CLOSE_MS = 160;

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

/** Only an internal sell-form link with a well-formed amount becomes a card. */
function validAction(raw: unknown): FiksSellAction | undefined {
  const a = raw as Partial<FiksSellAction> | null | undefined;
  if (!a || a.type !== "sell" || typeof a.href !== "string" || !a.href.startsWith("/saelg-din-enhed")) return undefined;
  if (typeof a.model !== "string" || typeof a.amount !== "number" || !Number.isFinite(a.amount) || a.amount <= 0) return undefined;
  return { type: "sell", label: typeof a.label === "string" ? a.label : "Fortsæt til formularen", href: a.href, model: a.model, amount: a.amount };
}

let idSeq = 0;
const nextId = () => `m${++idSeq}`;

export function FiksPanel({
  open,
  onClose,
  onDisabled,
  starter,
}: {
  open: boolean;
  onClose: () => void;
  onDisabled: () => void;
  /** A message to send once, e.g. from the teaser. A new id sends again. */
  starter?: { id: number; text: string } | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const restored = useRef(false);
  const sentStarter = useRef<number | null>(null);

  // Closing plays a short exit before the panel is hidden.
  const [prevOpen, setPrevOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setClosing(!open);
  }
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setClosing(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [closing]);
  const hidden = !open && !closing;

  // Restore an earlier conversation from this tab once, by token.
  useEffect(() => {
    // Markeres først, når beskederne er lagt ind: en afbrudt første kørsel (Reacts dobbelte effekt) må gerne prøve igen.
    if (restored.current) return;
    const token = readToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${FIKS_ENDPOINT}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.status === 503) return onDisabled();
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: { from: From; body: string }[]; action?: unknown };
        if (cancelled || !data.messages?.length) return;
        const restoredMessages: ChatMessage[] = data.messages.map((m) => ({ id: nextId(), from: m.from, body: m.body }));
        // The sell button belongs under Fiks' latest reply.
        const action = validAction(data.action);
        const lastFiks = restoredMessages.findLastIndex((m) => m.from === "fiks");
        if (action && lastFiks >= 0) restoredMessages[lastFiks] = { ...restoredMessages[lastFiks], action };
        if (cancelled || restored.current) return;
        restored.current = true;
        setMessages((current) => [...restoredMessages, ...current]);
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
      setMessages((m) => [...m, { id: nextId(), from: "visitor", body: message, fresh: true }]);
      setDraft("");
      setPending(true);
      try {
        const res = await fetch(FIKS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: readToken() ?? undefined, message, website: honeypotRef.current?.value ?? "" }),
        });
        if (res.status === 503) return onDisabled();
        const data = (await res.json().catch(() => ({}))) as { token?: string | null; reply?: string; error?: string; action?: unknown };
        if (!res.ok || !data.reply) {
          setMessages((m) => [...m, { id: nextId(), from: "fiks", body: data.error || NETWORK_ERROR, error: true, fresh: true }]);
          return;
        }
        if (data.token) writeToken(data.token);
        const action = validAction(data.action);
        setMessages((m) => [...m, { id: nextId(), from: "fiks", body: data.reply!, fresh: true, ...(action ? { action } : {}) }]);
      } catch {
        setMessages((m) => [...m, { id: nextId(), from: "fiks", body: NETWORK_ERROR, error: true, fresh: true }]);
      } finally {
        setPending(false);
      }
    },
    [pending, onDisabled],
  );

  // A starter from outside the panel (the teaser) is sent once.
  useEffect(() => {
    if (!starter || sentStarter.current === starter.id) return;
    sentStarter.current = starter.id;
    void send(starter.text);
  }, [starter, send]);

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <section
      aria-label="Chat med Fiks"
      hidden={hidden}
      style={hidden ? { display: "none" } : undefined}
      data-state={open ? "open" : "closing"}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      className={`${PANEL_CLASS} ${styles.panel}`}
    >
      <header className="flex items-center justify-between gap-3 bg-green-pale px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
            <FiksFigure size={30} />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-tight text-charcoal">Fiks</p>
            <p className="text-[13px] leading-tight text-green-eco/80">PhoneSpots digitale assistent</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Luk chat"
          className={`${styles.press} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-green-eco hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-green-eco`}
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        <Bubble from="fiks">{GREETING}</Bubble>
        {messages.length === 0 && !pending && (
          <div className="flex flex-wrap gap-2 pl-8">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className={`${styles.press} rounded-full border border-green-eco/20 bg-white px-3.5 py-2 text-left text-[14px] text-green-eco hover:border-green-eco/40 hover:bg-green-pale focus-visible:outline-2 focus-visible:outline-green-eco`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <Fragment key={m.id}>
            <Bubble from={m.from} error={m.error} fresh={m.fresh}>
              {m.from === "visitor" ? m.body : linkify(m.body)}
            </Bubble>
            {m.action && <SellCard action={m.action} />}
          </Fragment>
        ))}
        {pending && (
          <div className={`${styles.messageIn} flex items-end gap-2 self-start`}>
            <FiksFigure size={22} />
            <p className="flex h-9 items-center gap-1 rounded-[12px] rounded-bl-[4px] bg-cream px-3.5 text-gray">
              <span className="sr-only">Fiks skriver…</span>
              <span aria-hidden="true" className={styles.dot} />
              <span aria-hidden="true" className={styles.dot} />
              <span aria-hidden="true" className={styles.dot} />
            </p>
          </div>
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
            enterKeyHint="send"
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
            className="max-h-[120px] min-h-[42px] flex-1 resize-none rounded-[12px] border border-soft-grey bg-cream px-3.5 py-2 text-[16px] leading-snug text-charcoal transition-colors placeholder:text-gray focus:border-green-eco/40 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label="Send besked"
            className={`${styles.press} flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-green-eco text-white hover:bg-green-light disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-eco`}
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

function Bubble({ from, error, fresh, children }: { from: From; error?: boolean; fresh?: boolean; children: ReactNode }) {
  const visitor = from === "visitor";
  const fiks = from === "fiks";
  return (
    <div
      className={`flex max-w-[88%] items-end gap-2 ${visitor ? "self-end" : "self-start"} ${fresh ? styles.messageIn : ""}`}
    >
      {fiks && <FiksFigure size={22} className="mb-0.5" />}
      <div className={`flex min-w-0 flex-col ${visitor ? "items-end" : "items-start"}`}>
        {from === "staff" && <span className="mb-0.5 text-[11px] text-gray">PhoneSpot</span>}
        <p
          className={`whitespace-pre-wrap break-words rounded-[12px] px-3.5 py-2.5 text-[15px] leading-relaxed sm:text-[14px] ${
            visitor
              ? "rounded-br-[4px] bg-green-eco text-white"
              : error
                ? "rounded-bl-[4px] border border-soft-grey bg-white text-gray"
                : "rounded-bl-[4px] bg-cream text-charcoal"
          }`}
        >
          <span className="sr-only">{visitor ? "Du: " : fiks ? "Fiks: " : "PhoneSpot: "}</span>
          {children}
        </p>
      </div>
    </div>
  );
}

/** The price from quote_buyback and a real link to the prefilled sell form. */
function SellCard({ action }: { action: FiksSellAction }) {
  return (
    <div className={`${styles.cardIn} ml-8 max-w-[calc(88%-2rem)] self-start rounded-[12px] border border-green-eco/15 bg-green-pale p-3.5`}>
      <p className="text-[14px] font-semibold leading-snug text-charcoal">{action.model}</p>
      <p className="mt-2 text-[12px] leading-none text-green-eco/80">Vejledende pris</p>
      <p className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-charcoal">{formatKroner(action.amount)}</p>
      <p className="mt-1.5 text-[13px] leading-snug text-gray">Den endelige pris afhænger af vores tjek af enheden.</p>
      <a
        href={action.href}
        className={`${styles.press} mt-3 flex h-10 items-center justify-center rounded-[8px] bg-green-eco px-4 text-[15px] font-semibold text-white hover:bg-green-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-eco`}
      >
        {action.label}
      </a>
    </div>
  );
}
