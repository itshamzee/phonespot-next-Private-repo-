"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useB2B } from "@/components/b2b/b2b-context";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/20 bg-white";

export default function B2BLoginPage() {
  const { login } = useB2B();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPendingApproval(false);
    setSubmitting(true);

    const result = await login(email, password);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Login fejlede. Prov igen.");
      return;
    }

    // login() already stored user + token in context/localStorage.
    // The b2b-context does not expose the user directly on the returned value,
    // so we read from the context after a short re-render tick via a state trick.
    // Instead, fetch the user state from the context by relying on the fact that
    // a non-approved account still gets a successful login response — we handle
    // the pending state by checking the stored session directly.
    const stored = localStorage.getItem("phonespot_b2b_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { approved?: boolean };
        if (!parsed.approved) {
          setPendingApproval(true);
          return;
        }
      } catch {
        // Fallback: just redirect
      }
    }

    router.push("/reservedele");
  }

  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] px-4 py-16">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-[#E5E5EA] bg-white p-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-2 font-display text-xl font-bold text-[#111111]">
              Konto afventer godkendelse
            </h2>
            <p className="mb-6 text-sm text-[#86868B]">
              Din konto afventer godkendelse. Vi kontakter dig inden for 24 timer, nar din virksomhed er verificeret.
            </p>
            <p className="text-sm text-[#86868B]">
              Spoergsmaal?{" "}
              <a href="mailto:b2b@phonespot.dk" className="text-[#1A3D2E] underline underline-offset-2">
                b2b@phonespot.dk
              </a>
            </p>
            <button
              onClick={() => {
                setPendingApproval(false);
                setEmail("");
                setPassword("");
              }}
              className="mt-6 text-sm text-[#86868B] hover:text-[#111111]"
            >
              Tilbage til login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] px-4 py-16">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#1A3D2E]">
            B2B / Forhandler
          </p>
          <h1 className="font-display text-3xl font-bold text-[#111111]">B2B Login</h1>
          <p className="mt-2 text-sm text-[#86868B]">
            Log ind for at se engros-priser pa reservedele
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-[#E5E5EA] bg-white p-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                className={FIELD_CLASS}
                placeholder="kontakt@virksomhed.dk"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-sm font-medium text-[#111111]">
                  Adgangskode
                </label>
                <span className="text-xs text-[#86868B]">
                  {/* Placeholder — implement password reset later */}
                  <button
                    type="button"
                    className="hover:text-[#1A3D2E] hover:underline"
                    onClick={() => alert("Kontakt b2b@phonespot.dk for at nulstille din adgangskode.")}
                  >
                    Glemt adgangskode?
                  </button>
                </span>
              </div>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={FIELD_CLASS}
                placeholder="Din adgangskode"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#1A3D2E] py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Logger ind..." : "Log ind"}
            </button>
          </form>

          <div className="mt-6 border-t border-[#E5E5EA] pt-5 text-center text-sm text-[#86868B]">
            Ny kunde?{" "}
            <Link href="/b2b/registrer" className="font-medium text-[#1A3D2E] hover:underline">
              Registrer dig her
            </Link>
          </div>
        </div>

        {/* Trust note */}
        <p className="mt-6 text-center text-xs text-[#86868B]">
          Adgang til B2B-portalen kraever en godkendt erhvervskonto.
          Spoergsmaal?{" "}
          <a href="mailto:b2b@phonespot.dk" className="text-[#1A3D2E] underline underline-offset-2">
            b2b@phonespot.dk
          </a>
        </p>
      </div>
    </div>
  );
}
