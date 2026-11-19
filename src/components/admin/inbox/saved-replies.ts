"use client";

import { useEffect, useState } from "react";

/** Gemte svar (reply_templates med channel quick-reply). */
export interface SavedReply {
  id: string;
  name: string;
  body: string;
}

/** Fornavnet fra et navn, men aldrig en mail eller et telefonnummer. */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first.includes("@") || !/\p{L}/u.test(first)) return "";
  return first;
}

export function storeName(store: string | null | undefined): string | null {
  if (store === "vejle") return "Vejle";
  if (store === "slagelse") return "Slagelse";
  return null;
}

/**
 * Udfylder {fornavn} og {butik}. Uden fornavn forsvinder pladsholderen og
 * mellemrummet før den ("Hej {fornavn}," bliver "Hej,"); uden butik står der PhoneSpot.
 */
export function fillTemplate(text: string, vars: { fornavn: string | null; butik: string | null }): string {
  const name = (vars.fornavn ?? "").trim();
  const out = name ? text.replace(/\{fornavn\}/g, name) : text.replace(/[ \t]*\{fornavn\}/g, "");
  return out.replace(/\{butik\}/g, vars.butik?.trim() || "PhoneSpot");
}

/** Henter de gemte svar én gang. Fejl eller ingen svar giver en tom liste (kontrollen skjules). */
export function useSavedReplies(): SavedReply[] {
  const [replies, setReplies] = useState<SavedReply[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/admin/templates?channel=quick-reply", { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        setReplies(
          data
            .filter((t): t is SavedReply => !!t && typeof t.id === "string" && typeof t.name === "string" && typeof t.body === "string")
            .filter((t) => (t as { active?: unknown }).active !== false)
            .map((t) => ({ id: t.id, name: t.name, body: t.body })),
        );
      })
      .catch(() => {
        // Gemte svar er en bekvemmelighed: uden dem skjules kontrollen bare.
      });
    return () => ctrl.abort();
  }, []);
  return replies;
}
