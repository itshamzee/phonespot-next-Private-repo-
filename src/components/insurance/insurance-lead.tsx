"use client";

import { useState } from "react";
import { INSURANCE } from "@/lib/insurance-config";

/**
 * Reusable elektronikforsikring lead capture.
 *
 * Heading -> "Ja" reveals a short form (navn, telefon eller e-mail, postnummer)
 * -> POSTs to /api/insurance-lead. The insurance is an in-store Storstrøm
 * product, so this captures interest as a lead rather than adding a cart line.
 *
 * variant "product" renders a full panel; "cart" renders a compact card that
 * matches the other "Populære tilvalg" entries in the cart drawer.
 */
export function InsuranceLead({
  source,
  variant = "product",
}: {
  source: "product" | "cart";
  variant?: "product" | "cart";
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [navn, setNavn] = useState("");
  const [kontakt, setKontakt] = useState("");
  const [postnummer, setPostnummer] = useState("");

  const postnummerOk = /^\d{4}$/.test(postnummer.trim());
  const kontaktOk = isEmail(kontakt) || isPhone(kontakt);
  const canSubmit = postnummerOk && kontaktOk && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/insurance-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navn: navn.trim(),
          kontakt: kontakt.trim(),
          postnummer: postnummer.trim(),
          source,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Noget gik galt");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt. Prøv igen.");
    } finally {
      setSubmitting(false);
    }
  }

  const isCart = variant === "cart";
  const shell = isCart
    ? "rounded-xl border border-[#E5E5EA] bg-white p-3"
    : "rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-5";

  if (done) {
    return (
      <div className={shell}>
        <div className="flex items-start gap-3">
          <ShieldIcon />
          <div>
            <p className="text-sm font-semibold text-[#111111]">Tak!</p>
            <p className="text-xs text-[#6E6E73] leading-relaxed">
              Vi kontakter dig og fortæller nærmere.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Collapsed state: an interest card / panel with a "Ja" trigger.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${shell} flex w-full items-center gap-3 text-left transition-all hover:border-[#1A3D2E]/30 hover:shadow-sm`}
      >
        <ShieldIcon />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111111]">
            {isCart ? INSURANCE.name : "Er du interesseret i en elektronikforsikring?"}
          </p>
          <p className="text-xs text-[#6E6E73]">{INSURANCE.shortLine}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-lg bg-[#1A3D2E] px-3 py-1.5 text-xs font-semibold text-white">
          Ja
        </span>
      </button>
    );
  }

  // Expanded state: the short form.
  return (
    <div className={shell}>
      <div className="mb-3 flex items-start gap-3">
        <ShieldIcon />
        <div>
          <p className="text-sm font-semibold text-[#111111]">
            Er du interesseret i en elektronikforsikring?
          </p>
          <p className="text-xs text-[#6E6E73]">
            Skriv dig op, så kontakter vi dig og fortæller nærmere.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          type="text"
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
          placeholder="Navn"
          autoComplete="name"
          className={inputClass}
        />
        <input
          type="text"
          value={kontakt}
          onChange={(e) => setKontakt(e.target.value)}
          placeholder="Telefon eller e-mail"
          autoComplete="email"
          className={inputClass}
        />
        <input
          type="text"
          inputMode="numeric"
          value={postnummer}
          onChange={(e) => setPostnummer(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Postnummer"
          autoComplete="postal-code"
          required
          className={inputClass}
        />

        {error && <p className="text-xs text-[#C0392B]">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-[#1A3D2E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2D6B45] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sender ..." : "Send"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-1 focus:ring-[#1A3D2E]/20";

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function isPhone(v: string): boolean {
  const digits = v.replace(/[^\d]/g, "");
  return digits.length >= 8;
}

function ShieldIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1A3D2E]/10">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-5 w-5 text-[#1A3D2E]"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
        />
      </svg>
    </div>
  );
}
