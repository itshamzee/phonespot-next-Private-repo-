"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export function LoginLinkForm() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenHash = params.get("token_hash");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "verifying" | "invalid">(
    tokenHash ? "verifying" : "idle",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tokenHash) return;
    const supabase = createBrowserClient();
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" }).then(({ error }) => {
      if (error) setState("invalid");
      else router.replace("/konto");
    });
  }, [tokenHash, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const res = await fetch("/api/konto/login-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setState("sent");
    } else {
      setState("idle");
      setError("Tjek e-mailadressen og prøv igen.");
    }
  }

  return (
    <div className="rounded-2xl border border-[#E5E5EA] bg-white p-8 shadow-sm">
      {state === "verifying" ? (
        <p className="text-center text-sm text-[#6E6E73]">Logger dig ind...</p>
      ) : state === "sent" ? (
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#111111]">Tjek din indbakke</h1>
          <p className="mt-2 text-sm text-[#6E6E73]">
            Har du handlet hos os med {email}, har vi sendt et login-link. Det virker i 1 time. Kig også i spam.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-[#111111]">Glemt adgangskode?</h1>
            <p className="mt-1 text-sm text-[#6E6E73]">
              {state === "invalid"
                ? "Linket er udløbet eller allerede brugt. Få et nyt herunder."
                : "Skriv den e-mail, du handlede med, så sender vi et link, der logger dig ind."}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="link-email" className="block text-sm font-medium text-[#111111]">
                E-mail
              </label>
              <input
                id="link-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] transition focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
                placeholder="din@email.dk"
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={state === "sending"}
              className="w-full rounded-lg bg-[#1A3D2E] py-2.5 text-sm font-semibold text-white transition hover:bg-[#143324] disabled:opacity-50"
            >
              {state === "sending" ? "Sender..." : "Send login-link"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-[#6E6E73]">
            <a href="/konto" className="text-[#1A3D2E] hover:underline">Tilbage til log ind</a>
          </p>
        </>
      )}
    </div>
  );
}
