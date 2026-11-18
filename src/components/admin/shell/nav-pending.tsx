"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLinkStatus } from "next/link";

/**
 * Navigation i gang i admin: når et link i sidemenuen eller topbjælken er klikket,
 * og siden endnu ikke er skiftet, vises en 2 px streg øverst i indholdet
 * (.m-pending-bar i app/admin-motion.css). Hvert link melder sin status med
 * <NavPendingSignal /> (Nexts useLinkStatus); rammen tegner stregen ét sted.
 * components/ui/link-pending-bar.tsx tegner stregen inde i selve linket og passer
 * derfor ikke her.
 */

type Report = (delta: 1 | -1) => void;

const Ctx = createContext<{ pending: boolean; report: Report } | null>(null);

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const report = useCallback<Report>((delta) => setCount((c) => Math.max(0, c + delta)), []);
  const value = useMemo(() => ({ pending: count > 0, report }), [count, report]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Placeres inde i et <Link>. Tegner intet selv. Uden NavPendingProvider gør den ingenting. */
export function NavPendingSignal() {
  const { pending } = useLinkStatus();
  const report = useContext(Ctx)?.report;
  useEffect(() => {
    if (!pending || !report) return;
    report(1);
    return () => report(-1);
  }, [pending, report]);
  return null;
}

/**
 * Stregen; skal ligge i et element med position: relative. Fylder intet i layoutet.
 * `className` giver den vandrette placering (standard: hele bredden).
 */
export function NavPendingBar({ className = "inset-x-0" }: { className?: string }) {
  const pending = useContext(Ctx)?.pending ?? false;
  if (!pending) return null;
  return <div aria-hidden="true" data-testid="nav-pending-bar" className={`m-pending-bar ${className}`} />;
}
