"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ui/toast";

export const ARCHIVE_REASON = "Arkiveret fra oversigten (reparationsanmodning ikke gennemført)";

const quiet =
  "m-press m-tap inline-flex min-h-11 items-center justify-center rounded-lg border border-[#E2E5E0] bg-white px-3 py-2 text-[13px] text-[#15211B] hover:bg-[#F5F6F4] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F8F55]";

/** Rækken, knappen står i, markeres med denne attribut (og .m-busy), så den kan dæmpes. */
export const ARCHIVE_ROW_ATTR = "data-archive-row";

function markRowBusy(from: HTMLElement | null, busy: boolean) {
  const row = from?.closest(`[${ARCHIVE_ROW_ATTR}]`);
  if (!row) return;
  if (busy) row.setAttribute("aria-busy", "true");
  else row.removeAttribute("aria-busy");
}

/**
 * Stille "Arkivér"-handling for web-bookinger: to-trins bekræftelse på stedet, derefter
 * annulleres sagen via /api/admin/repairs/:id/cancel (ingen besked til kunden).
 * Mens det sker, og mens siden hentes igen (router.refresh i en transition), er knappen
 * slået fra og rækken dæmpet (aria-busy). Bagefter siger en toast "Booking arkiveret",
 * og rækken forsvinder med de nye data. Ved fejl vises en kort tekst, og knappen kommer tilbage.
 */
export function ArchiveBookingButton({
  id,
  label,
  onDone,
  className = "",
}: {
  id: string;
  /** Til skærmlæsere, fx kundens navn. */
  label?: string;
  /** Kaldes efter vellykket arkivering (fx for at genindlæse en liste). */
  onDone?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "refreshing" | "gone">("idle");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const ref = useRef<HTMLSpanElement>(null);

  // Siden er hentet igen: står rækken der stadig, skjules knappen, og dæmpningen fjernes.
  useEffect(() => {
    if (step !== "refreshing" || refreshing) return;
    markRowBusy(ref.current, false);
    setStep("gone");
  }, [step, refreshing]);

  async function archive() {
    markRowBusy(ref.current, true);
    setStep("busy");
    setError(null);
    try {
      const res = await fetch(`/api/admin/repairs/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: ARCHIVE_REASON }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Kunne ikke arkivere");
      }
      setStep("refreshing");
      startRefresh(() => router.refresh());
      toast("Booking arkiveret");
      onDone?.();
    } catch (err) {
      markRowBusy(ref.current, false);
      setError(err instanceof Error ? err.message : "Kunne ikke arkivere");
      setStep("idle");
    }
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (step === "gone") return null;

  return (
    <span ref={ref} className={`inline-flex flex-wrap items-center justify-end gap-2 ${className}`} onClick={stop} onKeyDown={stop}>
      {error ? (
        <span role="alert" className="text-[13px] text-[#B42318]">
          {error}
        </span>
      ) : null}
      {step === "busy" || step === "refreshing" ? (
        <button type="button" className={quiet} disabled aria-busy="true">
          Arkiverer…
        </button>
      ) : step === "confirm" ? (
        <>
          <span className="text-[13px] text-[#15211B]">Arkivér?</span>
          <button type="button" className={quiet} onClick={archive}>
            Ja
          </button>
          <button type="button" className={quiet} onClick={() => setStep("idle")}>
            Fortryd
          </button>
        </>
      ) : (
        <button
          type="button"
          className={quiet}
          aria-label={label ? `Arkivér ${label}` : undefined}
          onClick={() => {
            setError(null);
            setStep("confirm");
          }}
        >
          Arkivér
        </button>
      )}
    </span>
  );
}
