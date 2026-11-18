"use client";

import type { ReactNode } from "react";
import { NavPendingProvider, useNavPending } from "@/components/admin/shell/nav-pending";

/**
 * Periodeskift på Overblik, Alle butikker og Økonomi: periodelinkene (PeriodToggle)
 * melder deres status med NavPendingSignal til denne udbyder, og indholdet under
 * overskriften dæmpes (.m-busy) med det gamle tal stående, til den nye periode er hentet.
 * Udbyderen er lokal, så rammens streg øverst ikke også tændes.
 */
export function PeriodPendingScope({ children }: { children: ReactNode }) {
  return <NavPendingProvider>{children}</NavPendingProvider>;
}

export function PeriodBusyArea({ className = "", children }: { className?: string; children: ReactNode }) {
  const pending = useNavPending();
  return (
    <div aria-busy={pending ? "true" : undefined} data-testid="period-content" className={`m-busy ${className}`}>
      {children}
    </div>
  );
}
