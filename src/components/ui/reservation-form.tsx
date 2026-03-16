"use client";

import { useState, useEffect } from "react";

interface ReservationFormProps {
  productId: string;
  productName: string;
  productType: "accessory" | "device";
  storeId?: string;
  onSuccess?: () => void;
  onClose: () => void;
}

export function ReservationForm({
  productId,
  productName,
  productType,
  storeId = "slagelse",
  onSuccess,
  onClose,
}: ReservationFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: productType,
          product_id: productId,
          product_name: productName,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || undefined,
          store_id: storeId,
        }),
      });
      if (res.ok) {
        setResult({ success: true });
        onSuccess?.();
      } else {
        const data = await res.json();
        setResult({ success: false, error: data.error || "Noget gik galt" });
      }
    } catch {
      setResult({ success: false, error: "Netværksfejl" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Top accent bar */}
        <div className="h-[3px] bg-gradient-to-r from-emerald-400 to-emerald-600" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.04] px-6 py-4">
          <div>
            <h2 className="font-display text-[17px] font-bold text-charcoal">
              Reserver til afhentning
            </h2>
            <p className="mt-0.5 text-xs text-charcoal/40">PhoneSpot Slagelse</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal/30 transition-colors hover:bg-black/[0.04] hover:text-charcoal/60"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {result?.success ? (
            /* ---- Success state ---- */
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-charcoal">
                Reservation bekræftet!
              </h3>
              <p className="mt-2 text-sm text-charcoal/50">
                <span className="font-semibold text-charcoal/70">{productName}</span> er reserveret
                til dig i op til 24 timer.
              </p>
              <div className="mt-4 w-full rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
                <p className="text-[13px] font-semibold text-emerald-700">
                  Klar til afhentning inden for 1 time
                </p>
                <p className="mt-0.5 text-xs text-emerald-600/70">
                  Vi sender dig en SMS når din vare er klar
                </p>
              </div>
              <div className="mt-5 w-full rounded-xl border border-black/[0.05] bg-[#f9f8f6] px-4 py-3">
                <p className="text-xs text-charcoal/40">
                  <span className="font-semibold text-charcoal/60">Adresse:</span> Bredgade 7, 4200 Slagelse
                </p>
                <p className="mt-0.5 text-xs text-charcoal/40">
                  <span className="font-semibold text-charcoal/60">Tlf:</span> 58 50 00 00
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Luk
              </button>
            </div>
          ) : (
            /* ---- Form state ---- */
            <>
              {/* Product preview */}
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-black/[0.05] bg-[#f9f8f6] px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                  <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-charcoal">{productName}</p>
                  <p className="text-[11px] text-charcoal/40">Afhentes i Slagelse</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Name */}
                <div>
                  <label htmlFor="res-name" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/40">
                    Navn <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="res-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dit fulde navn"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="res-phone" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/40">
                    Telefon <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="res-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="12 34 56 78"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>

                {/* Email (optional) */}
                <div>
                  <label htmlFor="res-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/40">
                    Email <span className="text-charcoal/25">(valgfri)</span>
                  </label>
                  <input
                    id="res-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.dk"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>

                {/* Error */}
                {result?.error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
                    {result.error}
                  </div>
                )}

                {/* Info note */}
                <p className="text-[11px] leading-relaxed text-charcoal/35">
                  Reservationen er gyldig i 24 timer. Vi kontakter dig på SMS, når varen er klar til afhentning.
                </p>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !phone.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Reserverer...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.585a3.001 3.001 0 01-.621 3.958m0 0a3.004 3.004 0 00-1.015.39" />
                      </svg>
                      Reserver til afhentning
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
