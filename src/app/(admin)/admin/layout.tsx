"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Sidebar, type NavCounts } from "@/components/admin/shell/sidebar";
import { Topbar } from "@/components/admin/shell/topbar";
import { SaveBarProvider } from "@/components/admin/shell/save-bar";
import NewOrdersWatcher from "@/components/admin/new-orders-watcher";
import { StoreScopeProvider, useStoreScope } from "@/components/admin/shell/store-scope-context";

const EMPTY_COUNTS: NavCounts = { orders: 0, repairs: 0, newRepairs: 0, inquiries: 0, buyback: 0 };

/* ------------------------------------------------------------------ */
/*  Layout Component                                                   */
/* ------------------------------------------------------------------ */

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const pathname = usePathname();
  const supabase = createBrowserClient();

  useEffect(() => {
    // Den lokale session viser rammen med det samme; getUser() (et netværkskald)
    // bekræfter den bagefter. Data er alligevel beskyttet af middleware på API'erne,
    // så en udløbet session kan højst se en tom ramme, indtil tjekket logger den ud.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        setLoading(false);
      }
      supabase.auth.getUser().then(({ data: verified }) => {
        setUser(verified.user);
        setLoading(false);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message);
      setLoggingIn(false);
      return;
    }
    setUser(data.user);
    setLoggingIn(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <img src="/brand/logos/phonespot-wordmark-dark.png" alt="PhoneSpot" className="h-auto w-[180px] max-h-10 animate-pulse" />
          <p className="text-sm tracking-wide text-charcoal/40">Indlæser</p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Login                                                            */
  /* ---------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-green-eco px-4">
        {/* Subtle pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10 w-full max-w-[380px]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/20">
            <div className="p-8">
              {/* Logo */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 items-center justify-center rounded-2xl bg-green-eco px-6 shadow-lg shadow-green-eco/30">
                  <img src="/brand/logos/phonespot-wordmark-white.png" alt="PhoneSpot" className="h-auto w-[160px] max-h-8" />
                </div>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray">
                  Admin Panel
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="admin-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray">
                    Email
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-cream px-4 py-3 text-sm text-charcoal placeholder:text-gray/50 transition-all focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                    placeholder="admin@phonespot.dk"
                  />
                </div>
                <div>
                  <label htmlFor="admin-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray">
                    Adgangskode
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-cream px-4 py-3 text-sm text-charcoal placeholder:text-gray/50 transition-all focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                    placeholder="Din adgangskode"
                  />
                </div>

                {loginError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loggingIn}
                  className="mt-2 rounded-full bg-green-eco px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-green-eco/20 transition-all hover:bg-green-light hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                >
                  {loggingIn ? "Logger ind..." : "Log ind"}
                </button>
              </form>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] tracking-[0.2em] text-white/40">
            PHONESPOT ADMIN v2.0
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Authenticated Layout                                             */
  /*  Hvid topbjælke (butik, søgning / gem-bjælke), hvid sidemenu med   */
  /*  få områder, indhold på cream. Se components/admin/shell.          */
  /* ---------------------------------------------------------------- */
  return (
    <StoreScopeProvider>
      <AuthedShell email={user.email ?? null} pathname={pathname} onLogout={handleLogout}>
        {children}
      </AuthedShell>
    </StoreScopeProvider>
  );
}

/**
 * Den indloggede ramme. Ligger inde i StoreScopeProvider, så topbjælken, menu-tal og
 * sidens indhold alle følger butiksvalget. `key={scope}` genmonterer siden ved skift,
 * så alle lister henter data igen for den nye butik.
 */
function AuthedShell({
  email,
  pathname,
  onLogout,
  children,
}: {
  email: string | null;
  pathname: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const { scope, loading: scopeLoading } = useStoreScope();
  const settledScope = useRef<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navCounts, setNavCounts] = useState<NavCounts>(EMPTY_COUNTS);

  useEffect(() => {
    // Lukker menuen når man navigerer (mobil).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [pathname]);

  // Når ejeren skifter butik, hentes serverrenderede sider (Overblik m.fl.) igen med den nye cookie.
  useEffect(() => {
    if (scopeLoading) return;
    if (settledScope.current !== null && settledScope.current !== scope) router.refresh();
    settledScope.current = scope;
  }, [scope, scopeLoading, router]);

  useEffect(() => {
    if (scopeLoading) return;
    let cancelled = false;
    fetch("/api/admin/nav-counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((counts: NavCounts | null) => {
        if (!cancelled && counts) setNavCounts({ ...EMPTY_COUNTS, ...counts });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, scope, scopeLoading]);

  return (
    <SaveBarProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-[#F5F6F4] font-body text-[#15211B]">
        <Topbar email={email} counts={navCounts} onMenu={() => setSidebarOpen((v) => !v)} onLogout={onLogout} />

        <div className="relative flex min-h-0 flex-1">
          {sidebarOpen && (
            <div className="fixed inset-0 top-14 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <Sidebar pathname={pathname} counts={navCounts} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

          <main key={scope} className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            {scopeLoading ? null : children}
          </main>
        </div>

        {/* Real-time new-order toast watcher */}
        <NewOrdersWatcher />
      </div>
    </SaveBarProvider>
  );
}
