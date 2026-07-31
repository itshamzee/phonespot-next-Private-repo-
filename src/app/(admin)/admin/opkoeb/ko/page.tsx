"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ContactInquiry } from "@/lib/supabase/types";
import { deriveTradeInStatus } from "@/lib/supabase/trade-in-types";
import { readLeadDevices } from "@/lib/buyback/lead-devices";
import { DECLINE_REASONS, type DeclineReasonCode } from "@/lib/buyback/decline-reasons";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import {
  LeadCard,
  type LeadDraft,
  type QueueLead,
  type SuggestionResponse,
} from "@/components/admin/buyback/LeadCard";

/**
 * Queue mode: one lead at a time, driven from the keyboard.
 *
 *   Enter      send the offer with the amounts shown
 *   A          open the decline reasons for the whole lead
 *   1-6        pick a reason, either for the lead or for the device being excluded
 *   Alt+← →    move between leads
 *   Esc        close the list, or leave the queue
 *
 * The queue is loaded once and does not reshuffle under you while you work.
 * Every lead's draft — amounts, exclusions, the fetched suggestion, what you
 * already did to it — lives here rather than in the card, so stepping back to a
 * lead shows it exactly as you left it instead of a blank form.
 */

function emptyDraft(lead: QueueLead): LeadDraft {
  return {
    lines: lead.devices.map(() => ({ amountKr: "", excluded: false, reasonCode: null })),
    suggestion: null,
    suggestionLoaded: false,
    outcome: null,
  };
}

/** The first lead at or after `from` that has not been acted on, wrapping once. */
function findNextUnhandled(
  from: number,
  queue: QueueLead[],
  drafts: Record<string, LeadDraft>,
): number {
  for (let step = 1; step <= queue.length; step++) {
    const i = (from + step) % queue.length;
    if (!drafts[queue[i].inquiry.id]?.outcome) return i;
  }
  return queue.length; // everything is done
}

export default function OpkoebQueuePage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const router = useRouter();

  const [queue, setQueue] = useState<QueueLead[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LeadDraft>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [reasonPickerFor, setReasonPickerFor] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const current: QueueLead | undefined = queue[index];
  const currentId = current?.inquiry.id;
  const draft = currentId ? drafts[currentId] : undefined;

  /* ---------------------------------------------------------------- */
  /*  Load the queue once                                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: inquiries } = await supabase
        .from("contact_inquiries")
        .select("*")
        .eq("source", "saelg-enhed")
        .order("created_at", { ascending: true });

      if (!inquiries || inquiries.length === 0) {
        if (!cancelled) {
          setQueue([]);
          setLoading(false);
        }
        return;
      }

      const ids = inquiries.map((i) => i.id);
      const [{ data: offers }, { data: receipts }, { data: declines }] = await Promise.all([
        supabase.from("trade_in_offers").select("inquiry_id, status").in("inquiry_id", ids),
        supabase.from("trade_in_receipts").select("inquiry_id, status").in("inquiry_id", ids),
        supabase.from("buyback_declines").select("id, inquiry_id").in("inquiry_id", ids),
      ]);

      const untouched = (inquiries as ContactInquiry[]).filter((inquiry) => {
        const status = deriveTradeInStatus(
          inquiry.status,
          (offers ?? []).filter((o) => o.inquiry_id === inquiry.id),
          (receipts ?? []).filter((r) => r.inquiry_id === inquiry.id),
          (declines ?? []).filter((d) => d.inquiry_id === inquiry.id),
        );
        return status === "ny";
      });

      if (cancelled) return;

      const leads: QueueLead[] = untouched.map((inquiry) => ({
        inquiry,
        devices: readLeadDevices(inquiry.metadata),
      }));

      const initial: Record<string, LeadDraft> = {};
      for (const lead of leads) initial[lead.inquiry.id] = emptyDraft(lead);

      setQueue(leads);
      setDrafts(initial);
      setLoading(false);
    }

    const timer = setTimeout(load, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [supabase]);

  /* ---------------------------------------------------------------- */
  /*  Price suggestion — fetched once per lead, kept in the draft       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!currentId || !draft || draft.suggestionLoaded) return;
    let cancelled = false;

    async function fetchSuggestion(inquiryId: string) {
      let data: SuggestionResponse | null = null;
      try {
        const res = await staffFetch(`/api/trade-in/suggest?inquiry_id=${inquiryId}`);
        if (res.ok) data = (await res.json()) as SuggestionResponse;
      } catch {
        // No suggestion just means the amounts get typed by hand.
      }
      if (cancelled) return;

      setDrafts((prev) => {
        const existing = prev[inquiryId];
        if (!existing) return prev;
        return {
          ...prev,
          [inquiryId]: {
            ...existing,
            suggestion: data,
            suggestionLoaded: true,
            // Only fill fields still untouched, and only per device that priced
            // cleanly — one device needing a human should not blank its sibling.
            lines: existing.lines.map((line, i) => {
              const device = data?.devices?.[i];
              if (line.amountKr !== "" || !device) return line;
              if (device.manualReason || device.aimKr <= 0) return line;
              return { ...line, amountKr: String(device.aimKr) };
            }),
          },
        };
      });
    }

    void fetchSuggestion(currentId);
    return () => {
      cancelled = true;
    };
  }, [currentId, draft]);

  /* ---------------------------------------------------------------- */
  /*  Draft edits                                                      */
  /* ---------------------------------------------------------------- */

  const patchLine = useCallback(
    (lineIndex: number, patch: Partial<LeadDraft["lines"][number]>) => {
      if (!currentId) return;
      setDrafts((prev) => {
        const existing = prev[currentId];
        if (!existing) return prev;
        return {
          ...prev,
          [currentId]: {
            ...existing,
            lines: existing.lines.map((line, i) => (i === lineIndex ? { ...line, ...patch } : line)),
          },
        };
      });
    },
    [currentId],
  );

  const onAmountChange = useCallback(
    (i: number, value: string) => patchLine(i, { amountKr: value }),
    [patchLine],
  );

  const onToggleExclude = useCallback(
    (i: number) => {
      const line = draft?.lines[i];
      if (!line) return;
      if (line.excluded) {
        patchLine(i, { excluded: false, reasonCode: null });
        setReasonPickerFor(null);
      } else {
        // The amount is kept, so taking the device back in restores it.
        patchLine(i, { excluded: true });
        setDeclineOpen(false);
        setReasonPickerFor(i);
      }
      setError("");
    },
    [draft, patchLine],
  );

  const onPickReason = useCallback(
    (i: number, code: DeclineReasonCode) => {
      patchLine(i, { excluded: true, reasonCode: code });
      setReasonPickerFor(null);
    },
    [patchLine],
  );

  /* ---------------------------------------------------------------- */
  /*  Navigation                                                       */
  /* ---------------------------------------------------------------- */

  const goTo = useCallback((i: number) => {
    setIndex(i);
    setDeclineOpen(false);
    setReasonPickerFor(null);
    setError("");
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
    setDeclineOpen(false);
    setReasonPickerFor(null);
    setError("");
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i < queue.length - 1 ? i + 1 : i));
    setDeclineOpen(false);
    setReasonPickerFor(null);
    setError("");
  }, [queue.length]);

  /** Record what we just did and move on to the next lead that still needs work. */
  const finish = useCallback(
    (outcome: NonNullable<LeadDraft["outcome"]>) => {
      if (!currentId || !draft) return;
      const updated: LeadDraft = { ...draft, outcome };
      const nextDrafts = { ...drafts, [currentId]: updated };
      setDrafts(nextDrafts);
      setWorking(false);
      goTo(findNextUnhandled(index, queue, nextDrafts));
    },
    [currentId, draft, drafts, index, queue, goTo],
  );

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  const declineLead = useCallback(
    async (reasonCode: DeclineReasonCode) => {
      if (!current || !draft || working || draft.outcome) return;
      setWorking(true);
      setError("");
      try {
        const res = await staffFetch("/api/trade-in/decline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inquiry_id: current.inquiry.id,
            reason_code: reasonCode,
            declined_by: "Admin",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Kunne ikke afvise");
          setWorking(false);
          return;
        }
        finish({
          kind: "declined",
          reasonLabel: DECLINE_REASONS.find((r) => r.code === reasonCode)?.label ?? "Afvist",
        });
      } catch {
        setError("Kunne ikke afvise — prøv igen");
        setWorking(false);
      }
    },
    [current, draft, working, finish],
  );

  const sendOffer = useCallback(async () => {
    if (!current || !draft || working || draft.outcome) return;

    if (current.devices.length === 0) {
      setError("Ingen enhedsdata på henvendelsen — åbn leadet");
      return;
    }

    // Every device out is a decline, not a 0 kr offer.
    const firstExcluded = draft.lines.find((line) => line.excluded && line.reasonCode);
    if (draft.lines.every((line) => line.excluded)) {
      if (!firstExcluded?.reasonCode) {
        setError("Vælg en årsag til hver enhed du ikke byder på");
        return;
      }
      await declineLead(firstExcluded.reasonCode);
      return;
    }

    const payload = draft.lines.map((line, i) => {
      const kr = parseFloat(line.amountKr);
      return {
        index: i,
        amount_ore: line.excluded || !Number.isFinite(kr) ? 0 : Math.round(kr * 100),
        excluded: line.excluded,
        reason_code: line.reasonCode,
      };
    });

    // Same rules the server enforces, checked here so the mistake is caught
    // before a request goes out.
    if (payload.some((line) => !line.excluded && line.amount_ore <= 0)) {
      setError("Indtast et beløb på hver enhed du byder på");
      return;
    }
    if (payload.some((line) => line.excluded && !line.reason_code)) {
      setError("Vælg en årsag til hver enhed du ikke byder på");
      return;
    }

    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/trade-in/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_id: current.inquiry.id,
          lines: payload,
          created_by: "Admin",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Kunne ikke sende tilbud");
        setWorking(false);
        return;
      }
      finish({
        kind: "offer",
        amountKr: payload.reduce((sum, line) => sum + line.amount_ore, 0) / 100,
        excluded: payload.filter((line) => line.excluded).length,
      });
    } catch {
      setError("Kunne ikke sende tilbud — prøv igen");
      setWorking(false);
    }
  }, [current, draft, working, declineLead, finish]);

  /* ---------------------------------------------------------------- */
  /*  Keyboard                                                         */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Alt, not the bare arrows: the amount field is focused and there the
      // arrow keys belong to the caret.
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }

      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (e.key === "Enter") {
        // Enter works everywhere, including from inside an amount field.
        e.preventDefault();
        if (!declineOpen && reasonPickerFor === null) void sendOffer();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (reasonPickerFor !== null) setReasonPickerFor(null);
        else if (declineOpen) setDeclineOpen(false);
        else router.push("/admin/opkoeb");
        return;
      }
      if (inField) return; // the shortcuts below must not fire while typing

      if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (!draft?.outcome) {
          setDeclineOpen(true);
          setReasonPickerFor(null);
        }
        return;
      }
      if (/^[1-6]$/.test(e.key)) {
        const reason = DECLINE_REASONS[Number(e.key) - 1];
        if (!reason) return;
        if (reasonPickerFor !== null) {
          e.preventDefault();
          onPickReason(reasonPickerFor, reason.code);
        } else if (declineOpen) {
          e.preventDefault();
          void declineLead(reason.code);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [declineOpen, reasonPickerFor, draft, sendOffer, declineLead, onPickReason, goPrev, goNext, router]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
      </div>
    );
  }

  const handled = Object.values(drafts).filter((d) => d.outcome).length;

  if (!current || !draft) {
    return (
      <div className="mx-auto max-w-3xl py-24 text-center">
        <p className="text-lg font-semibold text-charcoal">
          {queue.length === 0 ? "Køen er tom" : "Du er igennem køen"}
        </p>
        <p className="mt-1 text-sm text-charcoal/40">
          {queue.length === 0
            ? "Der er ingen ubehandlede henvendelser."
            : `${handled} ${handled === 1 ? "lead" : "leads"} behandlet.`}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {queue.length > 0 && (
            <button
              type="button"
              onClick={() => goTo(queue.length - 1)}
              className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-400"
            >
              ‹ Se sidste lead
            </button>
          )}
          <Link
            href="/admin/opkoeb"
            className="rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white"
          >
            Tilbage til opkøb
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LeadCard
      lead={current}
      draft={draft}
      position={index + 1}
      total={queue.length}
      handled={handled}
      working={working}
      error={error}
      declineOpen={declineOpen}
      reasonPickerFor={reasonPickerFor}
      canPrev={index > 0}
      canNext={index < queue.length - 1}
      onPrev={goPrev}
      onNext={goNext}
      onAmountChange={onAmountChange}
      onToggleExclude={onToggleExclude}
      onPickReason={onPickReason}
      onClosePicker={() => setReasonPickerFor(null)}
      onSend={() => void sendOffer()}
      onOpenDecline={() => {
        setDeclineOpen(true);
        setReasonPickerFor(null);
      }}
      onCloseDecline={() => setDeclineOpen(false)}
      onDecline={(code) => void declineLead(code)}
    />
  );
}
