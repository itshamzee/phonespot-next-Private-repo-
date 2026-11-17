"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackRepairBooking, type RepairBookingInput } from "@/lib/tracking/events";

type Props = {
  ticketId: string;
  token: string;
  storeCity: string | null;
  alreadyInStore: boolean;
  canRetry: boolean;
  track: RepairBookingInput;
};

async function recover(ticketId: string, token: string, action: "pay_in_store" | "retry") {
  const res = await fetch("/api/repairs/recovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket_id: ticketId, token, action }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; reason?: string };
  return { ok: res.ok, data };
}

export function PaymentCancelledActions({ ticketId, token, storeCity, alreadyInStore, canRetry, track }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "store" | "retry">(null);
  const [error, setError] = useState<string | null>(null);

  const confirmationUrl = `/reparation/bekraeftelse?ticket_id=${ticketId}`;

  async function payInStore() {
    setBusy("store");
    setError(null);
    try {
      const { ok, data } = await recover(ticketId, token, "pay_in_store");
      if (!ok) {
        setError(data.error ?? "Noget gik galt. Prøv igen, eller ring til os.");
        setBusy(null);
        return;
      }
      trackRepairBooking({ ...track, eventId: `repair_${ticketId}` });
      router.push(confirmationUrl);
    } catch {
      setError("Noget gik galt. Prøv igen, eller ring til os.");
      setBusy(null);
    }
  }

  async function retry() {
    setBusy("retry");
    setError(null);
    try {
      const { ok, data } = await recover(ticketId, token, "retry");
      if (ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Betalingen kunne ikke åbnes igen. Vælg betaling i butikken, eller ring til os.");
      setBusy(null);
    } catch {
      setError("Noget gik galt. Prøv igen, eller ring til os.");
      setBusy(null);
    }
  }

  if (alreadyInStore) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Link
          href={confirmationUrl}
          className="w-full rounded-full bg-green-eco px-8 py-4 text-center text-base font-bold text-white sm:w-auto"
        >
          Se din booking
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={payInStore}
        disabled={busy !== null}
        className="flex w-full items-center justify-center rounded-full bg-green-eco px-8 py-4 text-base font-bold text-white transition-all hover:bg-green-eco/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy === "store" ? "Booker..." : "Book uden at betale nu, og betal i butikken"}
      </button>
      <p className="text-center text-xs text-charcoal/60">
        Du betaler samme pris, når du afhenter din enhed{storeCity ? ` i ${storeCity}` : ""}.
      </p>

      {canRetry && (
        <button
          type="button"
          onClick={retry}
          disabled={busy !== null}
          className="flex w-full items-center justify-center rounded-full border-2 border-charcoal bg-white px-8 py-3.5 text-sm font-bold text-charcoal transition-all hover:bg-charcoal/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "retry" ? "Åbner betaling..." : "Prøv at betale igen"}
        </button>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
