"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function VejleEmailSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/vejle-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/20 bg-white/10 px-6 py-5 text-center backdrop-blur-sm">
        <p className="font-display text-base font-bold text-white">
          Tak — vi giver dig besked!
        </p>
        <p className="mt-1 text-sm text-white/70">
          Vi sender dig en email, når PhoneSpot Vejle åbner dørene.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
      noValidate
    >
      <label htmlFor="vejle-email" className="sr-only">
        Din e-mailadresse
      </label>
      <input
        id="vejle-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="din@email.dk"
        required
        autoComplete="email"
        disabled={status === "loading"}
        className="flex-1 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/40 backdrop-blur-sm outline-none focus:border-white/60 focus:ring-2 focus:ring-white/20 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={status === "loading" || !email.trim()}
        className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? "Sender…" : "Tilmeld mig"}
      </button>

      {status === "error" && (
        <p className="w-full text-center text-xs text-red-300">
          Noget gik galt. Prøv igen eller skriv til info@phonespot.dk.
        </p>
      )}
    </form>
  );
}
