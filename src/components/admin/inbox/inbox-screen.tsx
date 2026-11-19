"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Dialog } from "@/components/admin/ui";
import { ConversationList } from "./conversation-list";
import { Composer, type ComposerState } from "./composer";
import { CustomerPanel } from "./customer-panel";
import { availableChannels, basedOnLine, pendingDraft, snoozePresets, unreviewedAutoReply, type InboxDetail } from "./inbox-helpers";
import { useInboxKeys, type InboxKeyAction } from "./inbox-keys";
import { firstName, storeName, useSavedReplies } from "./saved-replies";
import { Thread } from "./thread";
import { UndoToast, type UndoItem } from "./undo-toast";
import { useInbox } from "./use-inbox";
import { useInboxActions } from "./use-inbox-actions";
import { ViewList } from "./view-list";

const PATH = "/admin/kundecenter";

/** Svarfeltets udgangspunkt: forudfyldt med Fiks' ventende udkast, hvis der er et. */
function freshComposer(detail: InboxDetail): ComposerState {
  const pending = pendingDraft(detail.drafts);
  return {
    mode: "reply",
    replyText: pending?.draft_body ?? "",
    noteText: "",
    draftId: pending?.id ?? null,
    channel: availableChannels(detail.inquiry)[0] ?? null,
    error: null,
  };
}

const SHORTCUTS: [string, string][] = [
  ["J / K", "Næste og forrige samtale"],
  ["T", "Tag den"],
  ["E", "Færdig"],
  ["H", "Udsæt til i morgen kl. 9"],
  ["R", "Skriv svar"],
  ["N", "Intern note"],
  ["?", "Vis genveje"],
];

/**
 * Kundecenteret: visninger | samtaler | tråd | kundekort. Under 1240 px bliver
 * kundekortet en skuffe, under 900 px vises én rude ad gangen. Siden fylder
 * præcis fladen under topbjælken; kun ruderne ruller.
 */
export function InboxScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");
  const inbox = useInbox(urlId);
  const savedReplies = useSavedReplies();

  const [pane, setPane] = useState<"list" | "thread">(urlId ? "thread" : "list");
  const [custOpen, setCustOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [undo, setUndo] = useState<UndoItem | null>(null);
  const [composers, setComposers] = useState<Record<string, ComposerState>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const focusHeading = useRef(false);

  const { detail, selectedId, select } = inbox;
  const current = detail && detail.inquiry.id === selectedId ? detail : null;
  const composer = current ? (composers[current.inquiry.id] ?? freshComposer(current)) : null;

  const patchComposer = useCallback(
    (id: string, patch: Partial<ComposerState>) => {
      setComposers((all) => {
        const base = all[id] ?? (current && current.inquiry.id === id ? freshComposer(current) : null);
        return base ? { ...all, [id]: { ...base, ...patch } } : all;
      });
    },
    [current],
  );

  const open = useCallback(
    (id: string, viaKeyboard: boolean) => {
      select(id);
      setPane("thread");
      setCustOpen(false);
      focusHeading.current = viaKeyboard;
      if (viaKeyboard) document.querySelector(`[data-row-id="${id.replace(/["\\]/g, "")}"]`)?.scrollIntoView?.({ block: "nearest" });
    },
    [select],
  );

  const openNext = useCallback(
    (id: string | null) => {
      if (id) open(id, false);
      else {
        select(null);
        setPane("list");
      }
    },
    [open, select],
  );

  const showUndo = useCallback((item: Omit<UndoItem, "key">) => setUndo({ ...item, key: Date.now() }), []);
  const actions = useInboxActions({ inbox, composer, patchComposer, openNext, showUndo, textareaRef });

  // Fokus til trådens overskrift, når en samtale er åbnet fra tastaturet.
  useEffect(() => {
    if (current && focusHeading.current) {
      focusHeading.current = false;
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [current]);

  // Adressen følger den valgte samtale (?id=), uden at siden ruller.
  useEffect(() => {
    const inUrl = new URLSearchParams(window.location.search).get("id");
    if (inUrl === selectedId) return;
    router.replace(selectedId ? `${PATH}?id=${encodeURIComponent(selectedId)}` : PATH, { scroll: false });
  }, [selectedId, router]);

  // Et link til en anden samtale, mens siden er åben (fx fra kundekortet eller en notifikation).
  const lastUrlId = useRef(urlId);
  useEffect(() => {
    if (urlId === lastUrlId.current) return;
    lastUrlId.current = urlId;
    // Adressen er en ekstern kilde her; samme greb som ?fane= i case-list-page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (urlId && urlId !== selectedId) open(urlId, false);
  }, [urlId, selectedId, open]);

  // Skuffen: fokus ind, Escape lukker.
  useEffect(() => {
    if (!custOpen) return;
    drawerRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCustOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [custOpen]);

  const focusComposer = useCallback(
    (mode: "reply" | "note") => {
      if (!current) return;
      patchComposer(current.inquiry.id, { mode });
      setPane("thread");
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    [current, patchComposer],
  );

  const onKey = useCallback(
    (a: InboxKeyAction) => {
      if (a.type === "open") open(a.id, true);
      else if (a.type === "help") setHelpOpen(true);
      else if (a.type === "take") void actions.take();
      else if (a.type === "done") void actions.done();
      else if (a.type === "snooze") {
        const first = snoozePresets(new Date())[0];
        void actions.snooze(first.until, first.label);
      } else if (a.type === "reply") focusComposer("reply");
      else if (a.type === "note") focusComposer("note");
    },
    [open, actions, focusComposer],
  );

  useInboxKeys({ enabled: !helpOpen && !custOpen, ids: inbox.rows.map((r) => r.id), selectedId, onAction: onKey });

  const inq = current?.inquiry ?? null;
  const pending = current ? pendingDraft(current.drafts) : null;
  const publicChannel = inq?.channel === "google_review" ? "Google" : inq?.channel === "trustpilot_review" ? "Trustpilot" : null;
  const customer = (
    <CustomerPanel
      detail={current}
      customer={inbox.customer}
      error={inbox.customerError}
      onOpenConversation={(id) => open(id, false)}
    />
  );

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-[#F5F6F4] text-[#15211B] sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-7">
      <h1 className="sr-only">Kundecenter</h1>
      <div className="grid min-h-0 flex-1 grid-cols-1 min-[900px]:grid-cols-[204px_320px_minmax(0,1fr)] min-[1240px]:grid-cols-[204px_340px_minmax(0,1fr)_296px]">
        <div className="hidden min-h-0 flex-col overflow-y-auto border-r border-[#E2E5E0] bg-[#F5F6F4] min-[900px]:flex">
          <ViewList view={inbox.view} counts={inbox.counts} onChange={(v) => { inbox.setView(v); setPane("list"); }} />
          <div className="mt-auto px-5 pb-4">
            <Button size="sm" variant="quiet" onClick={() => setHelpOpen(true)}>
              Genveje
            </Button>
          </div>
        </div>

        <section aria-label="Samtaler" className={`min-h-0 min-w-0 flex-col border-r border-[#E2E5E0] bg-white min-[900px]:flex ${pane === "list" ? "flex" : "hidden"}`}>
          <ConversationList
            rows={inbox.rows}
            truncated={inbox.truncated}
            view={inbox.view}
            counts={inbox.counts}
            onViewChange={inbox.setView}
            query={inbox.query}
            onQuery={inbox.setQuery}
            searching={inbox.searching}
            showStoreFilter={inbox.showStoreFilter}
            store={inbox.store}
            onStore={inbox.setStore}
            loading={inbox.listLoading}
            loaded={inbox.listLoaded}
            error={inbox.listError}
            onRetry={inbox.reloadList}
            selectedId={selectedId}
            meId={inbox.meId}
            readSet={inbox.readSet}
            onOpen={open}
          />
        </section>

        <section aria-label="Samtale" className={`min-h-0 min-w-0 flex-col bg-white min-[900px]:flex ${pane === "thread" ? "flex" : "hidden"}`}>
          {selectedId ? (
            <Thread
              detail={current}
              error={inbox.detailError}
              onRetry={inbox.reloadDetail}
              meId={inbox.meId}
              headingRef={headingRef}
              busy={actions.busy}
              auditDraft={current ? unreviewedAutoReply(current) : null}
              onBack={() => setPane("list")}
              onCustomer={() => setCustOpen(true)}
              onTake={actions.take}
              onRelease={actions.release}
              onWake={actions.wake}
              onSnooze={actions.snooze}
              onDone={actions.done}
              onReopen={actions.reopen}
              onVerdict={actions.verdict}
              composer={
                current && composer && inq ? (
                  <Composer
                    state={composer}
                    onChange={(patch) => patchComposer(inq.id, patch)}
                    channels={availableChannels(inq)}
                    mailbox={inq.mailbox ?? null}
                    publicChannel={publicChannel}
                    draft={pending?.draft_body ? { body: pending.draft_body, basedOn: basedOnLine(pending.lookups) } : null}
                    savedReplies={savedReplies}
                    fillVars={{ fornavn: firstName(inq.name), butik: storeName(inq.store_id) }}
                    sending={actions.sending}
                    textareaRef={textareaRef}
                    onSend={actions.send}
                    onNote={actions.note}
                    onReview={actions.review}
                  />
                ) : null
              }
            />
          ) : (
            <div className="m-auto max-w-xs p-6 text-center text-[14px] text-[#5E6A63]">
              <p className="m-0 mb-1 text-[15px] font-semibold text-[#15211B]">Vælg en samtale</p>
              <p className="m-0">J og K flytter op og ned i listen.</p>
            </div>
          )}
        </section>

        <aside aria-label="Kunde" className="hidden min-h-0 overflow-y-auto border-l border-[#E2E5E0] bg-white min-[1240px]:block">
          {customer}
        </aside>
      </div>

      {/* Under 1240 px: kundekortet som skuffe (.m-sheet), baggrunden altid monteret (.m-backdrop). */}
      <button
        type="button"
        aria-label="Luk kundekortet"
        aria-hidden={custOpen ? undefined : true}
        tabIndex={-1}
        data-open={custOpen}
        onClick={() => setCustOpen(false)}
        className="m-backdrop fixed inset-0 z-30 bg-black/20 min-[1240px]:hidden"
      />
      {custOpen && (
        <div
          ref={drawerRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Kunde"
          className="m-sheet fixed inset-y-0 right-0 z-40 w-full max-w-[360px] overflow-y-auto border-l border-[#E2E5E0] bg-white outline-none min-[1240px]:hidden"
        >
          <CustomerPanel
            detail={current}
            customer={inbox.customer}
            error={inbox.customerError}
            onOpenConversation={(id) => open(id, false)}
            onClose={() => setCustOpen(false)}
          />
        </div>
      )}

      <UndoToast item={undo} onDismiss={() => setUndo(null)} />

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="Genveje" size="sm" description="Virker, når du ikke står i et felt.">
        <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-3.5 gap-y-2 text-[14px]">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="contents">
              <dt className="rounded-md border border-[#C9D0C7] px-[7px] py-px text-center font-mono text-[12px]">{key}</dt>
              <dd className="m-0">{label}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </div>
  );
}
