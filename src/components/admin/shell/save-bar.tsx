"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Gem-bjælken: når en formular har ændringer, der ikke er gemt, overtager den
 * topbjælken med "Kassér" og "Gem" — ét fast sted at gemme, uanset hvor langt
 * man er scrollet. Formularen melder sig med useSaveBar; rammen tegner bjælken.
 */
export interface SaveBarState {
  dirty: boolean;
  saving: boolean;
  /** Hvorfor der ikke kan gemmes lige nu, fx "Salgspris mangler". */
  blocked?: string | null;
  onSave: () => void;
  onDiscard: () => void;
}

const Ctx = createContext<{ state: SaveBarState | null; set: (s: SaveBarState | null) => void } | null>(null);

export function SaveBarProvider({ children }: { children: ReactNode }) {
  const [state, set] = useState<SaveBarState | null>(null);
  const value = useMemo(() => ({ state, set }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSaveBarState(): SaveBarState | null {
  return useContext(Ctx)?.state ?? null;
}

export function useSaveBar(next: SaveBarState) {
  const ctx = useContext(Ctx);
  const set = ctx?.set;
  // Handlerne skifter identitet ved hver rendering; bjælken skal altid kalde de nyeste.
  const handlers = useRef(next);
  useEffect(() => {
    handlers.current = next;
  });

  useEffect(() => {
    if (!set) return;
    set({
      dirty: next.dirty,
      saving: next.saving,
      blocked: next.blocked ?? null,
      onSave: () => handlers.current.onSave(),
      onDiscard: () => handlers.current.onDiscard(),
    });
  }, [set, next.dirty, next.saving, next.blocked]);

  useEffect(() => {
    if (!set) return;
    return () => set(null);
  }, [set]);

  // Luk/genindlæs af fanen med ændringer, der ikke er gemt
  useEffect(() => {
    if (!next.dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [next.dirty]);
}
