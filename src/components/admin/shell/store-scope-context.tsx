"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  STORE_SCOPE_COOKIE,
  SCOPE_LABELS,
  parseRequestedScope,
  type ScopeSlug,
  type StoreScope,
} from "@/lib/auth/store-scope";

/**
 * Klient-siden af butiksvalget. Sandheden om hvem man er og hvad man må se
 * kommer fra serveren (/api/admin/me); ejerens valg huskes i cookien `ps_store`,
 * så server components og API-ruter kan læse det.
 */

export type AdminMe = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  isOwner: boolean;
  /** Medarbejderens egen butik; null for ejeren eller en medarbejder uden tildeling. */
  ownSlug: ScopeSlug | null;
  scope: StoreScope;
};

export type StoreScopeValue = {
  loading: boolean;
  me: AdminMe | null;
  scope: StoreScope;
  isOwner: boolean;
  ownSlug: ScopeSlug | null;
  /** Kun ejeren kan skifte; for andre er kaldet en no-op. */
  setScope: (next: ScopeSlug | "alle") => void;
  label: string;
};

const DEFAULT_VALUE: StoreScopeValue = {
  loading: false,
  me: null,
  scope: "alle",
  isOwner: false,
  ownSlug: null,
  setScope: () => {},
  label: SCOPE_LABELS.alle,
};

const StoreScopeContext = createContext<StoreScopeValue>(DEFAULT_VALUE);

export function writeScopeCookie(scope: ScopeSlug | "alle") {
  if (typeof document === "undefined") return;
  document.cookie = `${STORE_SCOPE_COOKIE}=${scope}; path=/; max-age=31536000; samesite=lax`;
}

export function readScopeCookie(): ScopeSlug | "alle" | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${STORE_SCOPE_COOKIE}=`));
  return match ? parseRequestedScope(match.slice(STORE_SCOPE_COOKIE.length + 1)) : null;
}

export function StoreScopeProvider({
  children,
  initialMe = null,
}: {
  children: ReactNode;
  /** Til tests og server-forhåndsudfyldning; ellers hentes /api/admin/me. */
  initialMe?: AdminMe | null;
}) {
  const [me, setMe] = useState<AdminMe | null>(initialMe);
  const [loading, setLoading] = useState(initialMe === null);

  useEffect(() => {
    if (initialMe) return;
    let cancelled = false;
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AdminMe | null) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialMe]);

  const setScope = useCallback((next: ScopeSlug | "alle") => {
    setMe((current) => {
      if (!current?.isOwner) return current;
      writeScopeCookie(next);
      return { ...current, scope: next };
    });
  }, []);

  const value = useMemo<StoreScopeValue>(() => {
    const scope: StoreScope = me?.scope ?? "alle";
    return {
      loading,
      me,
      scope,
      isOwner: Boolean(me?.isOwner),
      ownSlug: me?.ownSlug ?? null,
      setScope,
      label: SCOPE_LABELS[scope],
    };
  }, [loading, me, setScope]);

  return <StoreScopeContext.Provider value={value}>{children}</StoreScopeContext.Provider>;
}

export function useStoreScope(): StoreScopeValue {
  return useContext(StoreScopeContext);
}
