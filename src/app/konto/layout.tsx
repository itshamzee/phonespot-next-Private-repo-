"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const NAV_ITEMS = [
  { href: "/konto", label: "Oversigt", icon: "grid" },
  { href: "/konto/ordrer", label: "Mine ordrer", icon: "package" },
  { href: "/konto/garantier", label: "Garantibeviser", icon: "shield" },
  { href: "/konto/adresser", label: "Adresser", icon: "map-pin" },
  { href: "/konto/reklamation", label: "Reklamation", icon: "alert-circle" },
  { href: "/konto/indstillinger", label: "Indstillinger", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  const cls = "h-4 w-4 shrink-0";
  switch (name) {
    case "grid":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "package":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path d="M21 10V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10" />
          <path d="M23 3H1l2 7h18l2-7z" /><path d="M12 3v18" />
        </svg>
      );
    case "shield":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "map-pin":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "alert-circle":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        // Fetch display name from customer record
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch("/api/customer", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const d = await res.json();
            setCustomerName(d.customer?.name ?? null);
          }
        }
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError("Forkert email eller adgangskode");
      setLoggingIn(false);
      return;
    }
    setUser(data.user);
    setLoggingIn(false);
    router.refresh();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setCustomerName(null);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#1A3D2E]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <div className="rounded-2xl border border-[#E5E5EA] bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F2EC]">
              <svg className="h-6 w-6 text-[#1A3D2E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[#111111]">Log ind</h1>
            <p className="mt-1 text-sm text-[#6E6E73]">Adgang til din PhoneSpot-konto</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#111111]">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] transition focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                placeholder="din@email.dk"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-sm font-medium text-[#111111]">
                  Adgangskode
                </label>
                <a href="/glemt-adgangskode" className="text-xs text-[#1A3D2E] hover:underline">
                  Glemt adgangskode?
                </a>
              </div>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] transition focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                placeholder="••••••••"
              />
            </div>
            {loginError && (
              <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-lg bg-[#1A3D2E] py-2.5 text-sm font-semibold text-white transition hover:bg-[#143324] disabled:opacity-50"
            >
              {loggingIn ? "Logger ind..." : "Log ind"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeLabel = NAV_ITEMS.find((item) => pathname === item.href)?.label ?? "Min konto";

  return (
    <div className="min-h-screen bg-[#F5F2EC]">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#E5E5EA] bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[#111111] hover:bg-[#F5F2EC]"
          aria-label="Abn navigation"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="text-sm font-medium">{activeLabel}</span>
        </button>
        <span className="text-sm font-semibold text-[#1A3D2E]">PhoneSpot</span>
      </div>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-4">
              <span className="font-semibold text-[#1A3D2E]">Min konto</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-md p-1 text-[#6E6E73] hover:bg-[#F5F2EC]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="border-b border-[#E5E5EA] px-5 py-4">
              <p className="text-sm font-medium text-[#111111]">{customerName ?? user.email?.split("@")[0]}</p>
              <p className="mt-0.5 text-xs text-[#6E6E73]">{user.email}</p>
            </div>
            <nav className="flex-1 space-y-0.5 px-3 py-3">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#1A3D2E] text-white"
                        : "text-[#6E6E73] hover:bg-[#F5F2EC] hover:text-[#111111]"
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-[#E5E5EA] px-3 py-3">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#6E6E73] hover:bg-[#F5F2EC] hover:text-[#111111]"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log ud
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 lg:flex lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-8 rounded-2xl border border-[#E5E5EA] bg-white shadow-sm">
            {/* User info */}
            <div className="border-b border-[#E5E5EA] px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A3D2E]">
                <span className="text-sm font-semibold text-white">
                  {(customerName ?? user.email ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#111111] leading-tight">
                {customerName ?? user.email?.split("@")[0]}
              </p>
              <p className="mt-0.5 text-xs text-[#6E6E73] leading-tight break-all">{user.email}</p>
            </div>

            {/* Nav */}
            <nav className="space-y-0.5 px-3 py-3">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#1A3D2E] text-white"
                        : "text-[#6E6E73] hover:bg-[#F5F2EC] hover:text-[#111111]"
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Sign out */}
            <div className="border-t border-[#E5E5EA] px-3 py-3">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#6E6E73] hover:bg-[#F5F2EC] hover:text-[#111111] transition-colors"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log ud
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
