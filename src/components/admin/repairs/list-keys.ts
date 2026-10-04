"use client";

import { useEffect, useRef } from "react";

export type ListKeyAction =
  | { type: "select"; id: string }
  | { type: "open"; id: string }
  | { type: "ready"; id: string }
  | { type: "close" };

type KeyInfo = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  targetTag?: string;
  targetEditable?: boolean;
};

const TYPING = ["INPUT", "TEXTAREA", "SELECT"];
const INTERACTIVE = [...TYPING, "BUTTON", "A", "SUMMARY"];

/**
 * Ren tastaturlogik til sagslisten: piletaster flytter markeringen, Enter åbner
 * hele sagen, K melder klar, Escape lukker panelet. Tegn i felter og
 * Enter på knapper/links overlades til browseren.
 */
export function caseListKeyAction(e: KeyInfo, ids: string[], selectedId: string | null): ListKeyAction | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  const tag = (e.targetTag ?? "").toUpperCase();
  if (e.targetEditable || TYPING.includes(tag)) return null;

  const index = selectedId ? ids.indexOf(selectedId) : -1;
  switch (e.key) {
    case "ArrowDown":
      if (ids.length === 0) return null;
      return { type: "select", id: ids[Math.min(index + 1, ids.length - 1)] };
    case "ArrowUp":
      if (ids.length === 0) return null;
      return { type: "select", id: ids[index <= 0 ? 0 : index - 1] };
    case "Enter":
      if (INTERACTIVE.includes(tag) || !selectedId) return null;
      return { type: "open", id: selectedId };
    case "k":
    case "K":
      return selectedId ? { type: "ready", id: selectedId } : null;
    case "Escape":
      return selectedId ? { type: "close" } : null;
    default:
      return null;
  }
}

export function useCaseListKeys({
  enabled,
  ids,
  selectedId,
  onAction,
}: {
  enabled: boolean;
  ids: string[];
  selectedId: string | null;
  onAction: (action: ListKeyAction) => void;
}) {
  const latest = useRef({ ids, selectedId, onAction });
  useEffect(() => {
    latest.current = { ids, selectedId, onAction };
  });

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(ev: KeyboardEvent) {
      const target = ev.target as HTMLElement | null;
      const action = caseListKeyAction(
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
