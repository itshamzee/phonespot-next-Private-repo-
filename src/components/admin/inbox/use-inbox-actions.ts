"use client";

import { useCallback, useState, type RefObject } from "react";
import { useToast } from "@/components/admin/ui";
import { approveDraft, postReply, smsSentButNotSaved } from "./inbox-api";
import { availableChannels, nextAfter, pendingDraft, reviewLink, type ThreadDraft } from "./inbox-helpers";
import type { ComposerState, Sending } from "./composer";
import type { UndoItem } from "./undo-toast";
import type { InboxRow } from "@/lib/inquiries/inbox";
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

  /** Slip sagen: den bliver ledig igen. Den ansvarlige, vi så, sendes med (409 hvis den er skiftet). */
  const release = useCallback(async () => {
    if (!inq || !meId || inq.assigned_to !== meId) return;
    setBusy("release");
    const r = await runAction(inq.id, { type: "release", expectAssignedTo: inq.assigned_to }, { assignedTo: null, assignedName: null });
    setBusy(null);
    if (r.ok) toast("Sagen er sluppet.");
    else toast(r.error, { tone: "error" });
  }, [inq, meId, runAction, toast]);

  /** Væk nu: udsættelsen fjernes, og sagen er tilbage i de åbne visninger. */
  const wake = useCallback(async () => {
    if (!inq) return;
    setBusy("wake");
    const r = await runAction(inq.id, { type: "unsnooze" }, { snoozedUntil: null });
    setBusy(null);
    if (!r.ok) toast(r.error, { tone: "error" });
  }, [inq, runAction, toast]);

  /** Fælles for Færdig og Udsæt: næste sag med det samme, fortryd når serveren har sagt ja. */
  const leave = useCallback(
    async (kind: "done" | "snooze", until?: string, label?: string) => {
      if (!inq || inq.status === "lukket") return;
      const id = inq.id;
      const next = nextAfter(rows, id);
      // Til fortryd: status og en evt. aktiv udsættelse fra før "Færdig".
      const prevStatus = inq.status as "ny" | "venter_paa_svar" | "besvaret";
      const prevSnooze = inq.snoozed_until && Date.parse(inq.snoozed_until) > Date.now() ? inq.snoozed_until : null;
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
          const back =
            kind === "done"
              ? await runAction(
                  id,
                  { type: "reopen", to: prevStatus, ...(prevSnooze ? { snoozedUntil: prevSnooze } : {}) },
                  { status: prevStatus, snoozedUntil: prevSnooze },
                )
              : await runAction(id, { type: "unsnooze" }, { snoozedUntil: null });
          if (!back.ok) toast(back.error, { tone: "error" });
          else openNext(id);
        },
      });
    },
    [inq, rows, runAction, toast, openNext, showUndo],
  );

  const done = useCallback(() => leave("done"), [leave]);
  const snooze = useCallback((until: string, label: string) => leave("snooze", until, label), [leave]);

  /** Fluebenet i listen: luk en sag direkte fra rækken, med fortryd. */
  const quickDone = useCallback(
    async (row: InboxRow) => {
      if (row.status === "lukket") return;
      const id = row.id;
      const wasSelected = id === selectedId;
      const next = wasSelected ? nextAfter(rows, id) : null;
      const prevStatus = row.status as "ny" | "venter_paa_svar" | "besvaret";
      const prevSnooze = row.snoozedUntil && Date.parse(row.snoozedUntil) > Date.now() ? row.snoozedUntil : null;
      const r = await runAction(id, { type: "done" }, { status: "lukket", snoozedUntil: null });
      if (!r.ok) {
        toast(r.error, { tone: "error" });
        return;
      }
      if (wasSelected) openNext(next);
      showUndo({
        message: `${row.name || "Sagen"} er færdig.`,
        onUndo: async () => {
          const back = await runAction(id, { type: "reopen", to: prevStatus, ...(prevSnooze ? { snoozedUntil: prevSnooze } : {}) });
          if (!back.ok) toast(back.error, { tone: "error" });
        },
      });
    },
    [selectedId, rows, runAction, toast, openNext, showUndo],
  );

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
    const text = composer.noteText.trim();
    if (!text) return;
    setSending("note");
    const r = await runAction(id, { type: "note", body: text });
    setSending(null);
    if (!r.ok) return patchComposer(id, { error: r.error });
    // Kun noten tømmes; svaret og Fiks' udkast står urørt, når vi går tilbage til "Svar".
    patchComposer(id, { noteText: "", mode: "reply", error: null });
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
      const text = composer.replyText.trim();
      const channel = composer.channel ?? availableChannels(inq)[0] ?? null;
      if (!text || !channel) return;
      const pending = pendingDraft(detail.drafts);
      const viaDraft = !!pending && composer.draftId === pending.id && channel === "email";
      const next = nextAfter(rows, id);
      const name = inq.name || "kunden";
      setSending(after);

      const finish = (warning?: string) => {
        patchComposer(id, { replyText: "", draftId: null, error: null, mode: "reply" });
        patchRow(id, { status: after === "done" ? "lukket" : "besvaret", hasDraft: false, needsHuman: false, snoozedUntil: null });
        toast(`Sendt til ${name}.`);
        // Svaret ER sendt; advarslen er en besked, ikke en fejl (rød er kun til fejl).
        if (warning) toast(warning);
        openNext(next);
        reloadList();
      };

      await withBusy(async () => {
        if (viaDraft && pending) {
          // Godkend-ruten sender og bogfører (status, udsættelse, tildeling) i ét kald.
          const r = await approveDraft(pending.id, text, after);
          if (!r.ok) {
            patchComposer(id, { error: r.error });
            // "Udkastet er allerede behandlet.": hent tråden, så feltet ikke bygger på et gammelt udkast.
            if (r.status === 409) reloadDetail();
            return;
          }
          finish(typeof r.data.warning === "string" && r.data.warning ? r.data.warning : undefined);
          return;
        }

        const r = await postReply(id, { body: text, channel, after });
        if (smsSentButNotSaved(r)) {
          // SMS'en er gået ud: tøm feltet, så den ikke sendes igen, og hent tråden.
          patchComposer(id, { replyText: "", draftId: null, error: null });
          reloadDetail();
          reloadList();
          toast(r.ok ? "" : r.error, { tone: "error" });
          return;
        }
        if (!r.ok) {
          patchComposer(id, { error: r.error });
          return;
        }
        // Svar-ruten kasserer selv ventende udkast på tråden.
        finish(typeof r.data.warning === "string" && r.data.warning ? r.data.warning : undefined);
      });
      setSending(null);
    },
    [inq, detail, composer, rows, patchComposer, patchRow, toast, openNext, reloadList, reloadDetail, withBusy],
  );

  /** Anmeldelse: kopier svaret, åbn anmeldelsen og sæt sagen til at vente. Der sendes intet. */
  const review = useCallback(async () => {
    if (!inq || !detail || !composer) return;
    const text = composer.replyText.trim();
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
    const r = await runAction(
      inq.id,
      { type: "waiting" },
      {
        status: "besvaret",
        snoozedUntil: null,
        ...(!inq.assigned_to && meId ? { assignedTo: meId, assignedName: meName } : {}),
      },
    );
    setSending(null);
    if (!r.ok) {
      toast(r.error, { tone: "error" });
      return;
    }
    if (!copied) toast("Teksten er markeret. Kopiér den med Ctrl+C. Sagen venter nu på, at du har lagt den ud.");
    else if (link) toast("Svaret er kopieret. Sagen venter nu på, at du har lagt det ud.");
    else toast("Svaret er kopieret. Der er intet link til anmeldelsen i tråden, så åbn den selv. Sagen venter nu på, at du har lagt det ud.");
  }, [inq, detail, composer, meId, meName, runAction, toast, textareaRef]);

  return { busy, sending, take, release, wake, done, quickDone, snooze, reopen, note, verdict, send, review };
}
