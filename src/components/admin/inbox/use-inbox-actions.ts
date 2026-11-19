"use client";

import { useCallback, useState, type RefObject } from "react";
import { useToast } from "@/components/admin/ui";
import { approveDraft, discardDraft, postAction, postReply, smsSentButNotSaved } from "./inbox-api";
import { availableChannels, nextAfter, pendingDraft, reviewLink, type ThreadDraft } from "./inbox-helpers";
import type { ComposerState, Sending } from "./composer";
import type { UndoItem } from "./undo-toast";
import type { Inbox } from "./use-inbox";

/**
 * Handlingerne på den åbne samtale: tag, udsæt, færdig, genåbn, note, dom over
 * Fiks og afsendelse. Færdig og Udsæt kan fortrydes i 10 sekunder; afsendelse kan ikke.
 */
export function useInboxActions({
  inbox,
  composer,
  patchComposer,
  openNext,
  showUndo,
  textareaRef,
}: {
  inbox: Inbox;
  composer: ComposerState | null;
  patchComposer: (id: string, patch: Partial<ComposerState>) => void;
  /** Vælg næste sag (eller tilbage til listen, når der ikke er flere). */
  openNext: (id: string | null) => void;
  showUndo: (item: Omit<UndoItem, "key">) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [sending, setSending] = useState<Sending>(null);
  const { detail, selectedId, rows, meId, meName, runAction, patchRow, reloadList, reloadDetail, withBusy } = inbox;
  const inq = detail && detail.inquiry.id === selectedId ? detail.inquiry : null;

  const take = useCallback(async () => {
    if (!inq || !meId || inq.assigned_to === meId || inq.status === "lukket") return;
    const id = inq.id;
    const expect = rows.find((r) => r.id === id)?.assignedTo ?? inq.assigned_to ?? null;
    setBusy("take");
    const r = await runAction(id, { type: "take", expectAssignedTo: expect }, { assignedTo: meId, assignedName: meName });
    setBusy(null);
    if (r.ok) toast("Sagen er din.");
    else {
      toast(r.error, { tone: "error" });
      if (r.status === 409) reloadDetail();
    }
  }, [inq, meId, meName, rows, runAction, toast, reloadDetail]);

  /** Fælles for Færdig og Udsæt: næste sag med det samme, fortryd når serveren har sagt ja. */
  const leave = useCallback(
    async (kind: "done" | "snooze", until?: string, label?: string) => {
      if (!inq || inq.status === "lukket") return;
      const id = inq.id;
      const next = nextAfter(rows, id);
      setBusy(kind);
      const r =
        kind === "done"
          ? await runAction(id, { type: "done" }, { status: "lukket", snoozedUntil: null })
          : await runAction(id, { type: "snooze", until: until! }, { snoozedUntil: until! });
      setBusy(null);
      if (!r.ok) {
        toast(r.error, { tone: "error" });
        return;
      }
      openNext(next);
      showUndo({
        message: kind === "done" ? "Sagen er færdig." : `Udsat til ${(label ?? "senere").toLowerCase()}.`,
        onUndo: async () => {
          const back = await runAction(id, kind === "done" ? { type: "reopen" } : { type: "unsnooze" });
          if (!back.ok) toast(back.error, { tone: "error" });
          else openNext(id);
        },
      });
    },
    [inq, rows, runAction, toast, openNext, showUndo],
  );

  const done = useCallback(() => leave("done"), [leave]);
  const snooze = useCallback((until: string, label: string) => leave("snooze", until, label), [leave]);

  const reopen = useCallback(async () => {
    if (!inq) return;
    setBusy("reopen");
    const r = await runAction(inq.id, { type: "reopen" }, { status: "ny" });
    setBusy(null);
    if (!r.ok) toast(r.error, { tone: "error" });
  }, [inq, runAction, toast]);

  const note = useCallback(async () => {
    if (!inq || !composer) return;
    const id = inq.id;
    const text = composer.text.trim();
    if (!text) return;
    setSending("note");
    const r = await runAction(id, { type: "note", body: text });
    setSending(null);
    if (!r.ok) return patchComposer(id, { error: r.error });
    patchComposer(id, { text: "", mode: "reply", error: null, draftId: null });
    reloadDetail();
    toast("Noten er gemt.");
  }, [inq, composer, runAction, patchComposer, reloadDetail, toast]);

  const verdict = useCallback(
    async (draft: ThreadDraft, v: "correct" | "wrong", text: string): Promise<boolean> => {
      if (!inq) return false;
      const id = inq.id;
      const r = await runAction(
        id,
        { type: "verdict", draftId: draft.id, verdict: v, ...(v === "wrong" ? { note: text } : {}) },
        v === "wrong" ? { status: "ny", assignedTo: meId, assignedName: meName, snoozedUntil: null, fiksAnswered: false } : undefined,
      );
      if (!r.ok) {
        toast(r.error, { tone: "error" });
        return false;
      }
      reloadDetail();
      if (v === "wrong") {
        toast("Rettelsen er gemt, og sagen er din.");
        return true;
      }
      await leave("done");
      return true;
    },
    [inq, meId, meName, runAction, reloadDetail, toast, leave],
  );

  const send = useCallback(
    async (after: "waiting" | "done") => {
      if (!inq || !detail || !composer) return;
      const id = inq.id;
      const text = composer.text.trim();
      const channel = composer.channel ?? availableChannels(inq)[0] ?? null;
      if (!text || !channel) return;
      const pending = pendingDraft(detail.drafts);
      const viaDraft = !!pending && composer.draftId === pending.id && channel === "email";
      const next = nextAfter(rows, id);
      const name = inq.name || "kunden";
      setSending(after);

      const finish = (warning?: string) => {
        patchComposer(id, { text: "", draftId: null, error: null, mode: "reply" });
        patchRow(id, { status: after === "done" ? "lukket" : "besvaret", hasDraft: false, needsHuman: false, snoozedUntil: null });
        toast(`Sendt til ${name}.`);
        // Svaret ER sendt; advarslen er en besked, ikke en fejl (rød er kun til fejl).
        if (warning) toast(warning);
        openNext(next);
        reloadList();
      };

      await withBusy(async () => {
        if (viaDraft && pending) {
          const r = await approveDraft(pending.id, text);
          if (!r.ok) {
            patchComposer(id, { error: r.error });
            if (r.status === 409) reloadDetail();
            return;
          }
          // Godkend-ruten sætter kun "besvaret"; resten af efterbehandlingen sker her.
          let warning: string | undefined;
          if (after === "done") {
            const d = await postAction(id, { type: "done" });
            if (!d.ok) warning = "Svaret er sendt, men sagen blev ikke lukket. Tryk Færdig.";
          } else {
            if (!inq.assigned_to) await postAction(id, { type: "take", expectAssignedTo: null });
            if (inq.snoozed_until && Date.parse(inq.snoozed_until) > Date.now()) await postAction(id, { type: "unsnooze" });
          }
          finish(warning);
          return;
        }

        const r = await postReply(id, { body: text, channel, after });
        if (smsSentButNotSaved(r)) {
          // SMS'en er gået ud: tøm feltet, så den ikke sendes igen, og hent tråden.
          patchComposer(id, { text: "", draftId: null, error: null });
          reloadDetail();
          reloadList();
          toast(r.ok ? "" : r.error, { tone: "error" });
          return;
        }
        if (!r.ok) {
          patchComposer(id, { error: r.error });
          return;
        }
        // Ventende udkast er besvaret af en person nu; læg dem væk, så sagen ikke står med "Udkast klar".
        for (const d of detail.drafts) if (d.status === "pending") await discardDraft(d.id).catch(() => null);
        finish(typeof r.data.warning === "string" && r.data.warning ? r.data.warning : undefined);
      });
      setSending(null);
    },
    [inq, detail, composer, rows, patchComposer, patchRow, toast, openNext, reloadList, reloadDetail, withBusy],
  );

  /** Anmeldelse: kopier svaret, åbn anmeldelsen og tag sagen. Der sendes intet. */
  const review = useCallback(async () => {
    if (!inq || !detail || !composer) return;
    const text = composer.text.trim();
    if (!text) return;
    const link = reviewLink(detail.messages);
    // Kopieringen startes, før linket åbnes, mens siden stadig har fokus.
    const copy = navigator.clipboard?.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error("no clipboard"));
    if (link) window.open(link, "_blank", "noopener,noreferrer");
    let copied = false;
    try {
      await copy;
      copied = true;
    } catch {
      const el = textareaRef.current;
      el?.focus();
      el?.select();
    }
    setSending("review");
    if (!inq.assigned_to && meId) await runAction(inq.id, { type: "take", expectAssignedTo: null }, { assignedTo: meId, assignedName: meName });
    setSending(null);
    if (!copied) toast("Teksten er markeret. Kopiér den med Ctrl+C, og sæt den ind under anmeldelsen.");
    else if (link) toast("Svaret er kopieret. Sæt det ind under anmeldelsen, og tryk Færdig, når det er lagt ud.");
    else toast("Svaret er kopieret. Der er intet link til anmeldelsen i tråden, så åbn den selv.");
  }, [inq, detail, composer, meId, meName, runAction, toast, textareaRef]);

  return { busy, sending, take, done, snooze, reopen, note, verdict, send, review };
}
