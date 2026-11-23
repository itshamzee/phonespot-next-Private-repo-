"use client";

import { useEffect, useRef } from "react";

export type InboxKeyAction =
  | { type: "open"; id: string }
  | { type: "take" }
  | { type: "done" }
  | { type: "snooze" }
  | { type: "reply" }
  | { type: "note" }
  | { type: "help" };

type KeyInfo = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  targetTag?: string;
  targetEditable?: boolean;
};

const TYPING = ["INPUT", "TEXTAREA", "SELECT"];

/**
 * Kundecenterets genveje: J/K næste og forrige, T tag den, E færdig, H udsæt til
 * i morgen kl. 9, R svar, N intern note, ? hjælp. Aldrig i felter eller med
 * Ctrl/Cmd/Alt, så almindelig tekst og browserens egne genveje er urørte.
 */
export function inboxKeyAction(e: KeyInfo, ids: string[], selectedId: string | null): InboxKeyAction | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.targetEditable || TYPING.includes((e.targetTag ?? "").toUpperCase())) return null;
  if (e.key === "?") return { type: "help" };

  const key = e.key.toLowerCase();
  if (key === "j" || key === "k") {
    if (ids.length === 0) return null;
    const i = selectedId ? ids.indexOf(selectedId) : -1;
    if (i < 0) return { type: "open", id: ids[0] };
    const next = key === "j" ? Math.min(i + 1, ids.length - 1) : Math.max(i - 1, 0);
    return { type: "open", id: ids[next] };
  }
  if (!selectedId) return null;
  switch (key) {
    case "t":
      return { type: "take" };
    case "e":
      return { type: "done" };
    case "h":
      return { type: "snooze" };
    case "r":
      return { type: "reply" };
    case "n":
      return { type: "note" };
    default:
      return null;
  }
}

export function useInboxKeys({
  enabled,
  ids,
  selectedId,
  onAction,
}: {
  enabled: boolean;
  ids: string[];
  selectedId: string | null;
  onAction: (action: InboxKeyAction) => void;
}) {
  const latest = useRef({ ids, selectedId, onAction });
  useEffect(() => {
    latest.current = { ids, selectedId, onAction };
  });

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.defaultPrevented || ev.isComposing) return;
      // Ingen genveje bag en åben dialog (hjælpen, "Nyt i admin" og andre).
      if (document.querySelector("dialog[open]")) return;
      const target = ev.target as HTMLElement | null;
      const action = inboxKeyAction(
        {
          key: ev.key,
          metaKey: ev.metaKey,
          ctrlKey: ev.ctrlKey,
          altKey: ev.altKey,
          targetTag: target?.tagName,
          targetEditable: Boolean(target?.isContentEditable),
        },
        latest.current.ids,
        latest.current.selectedId,
      );
      if (!action) return;
      ev.preventDefault();
      latest.current.onAction(action);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
