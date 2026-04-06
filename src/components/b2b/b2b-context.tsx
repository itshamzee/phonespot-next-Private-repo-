"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface B2BUser {
  id: string;
  companyName: string;
  cvrNummer: string;
  approved: boolean;
  contactEmail: string;
  contactName: string;
  priceGroup: string;
}

interface B2BContextType {
  isLoggedIn: boolean;
  isApproved: boolean;
  user: B2BUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const B2BContext = createContext<B2BContextType>({
  isLoggedIn: false,
  isApproved: false,
  user: null,
  loading: true,
  login: async () => ({ ok: false }),
  logout: () => {},
});

export function useB2B() {
  return useContext(B2BContext);
}

export function B2BProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<B2BUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem("phonespot_b2b_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as B2BUser;
        setUser(parsed);
      } catch {
        // Ignore malformed session data
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await fetch("/api/b2b/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { user?: B2BUser; token?: string; error?: string };
      if (!res.ok) return { ok: false, error: data.error ?? "Login fejlede" };

      if (data.user) {
        setUser(data.user);
        localStorage.setItem("phonespot_b2b_session", JSON.stringify(data.user));
      }
      if (data.token) {
        localStorage.setItem("phonespot_b2b_token", data.token);
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Netværksfejl" };
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("phonespot_b2b_session");
    localStorage.removeItem("phonespot_b2b_token");
  }

  return (
    <B2BContext.Provider
      value={{
        isLoggedIn: !!user,
        isApproved: user?.approved ?? false,
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </B2BContext.Provider>
  );
}
