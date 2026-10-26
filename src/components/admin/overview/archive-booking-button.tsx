"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export const ARCHIVE_REASON = "Arkiveret fra oversigten (reparationsanmodning ikke gennemført)";

const quiet =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#E2E5E0] bg-white px-3 py-2 text-[13px] text-[#15211B] hover:bg-[#F5F6F4] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F8F55]";

/**
 * Stille "Arkivér"-handling for web-bookinger: to-trins bekræftelse på stedet, derefter
 * annulleres sagen via /api/admin/repairs/:id/cancel (ingen besked til kunden).
 * Rækken skjules optimistisk; ved fejl vises en kort tekst og rækken kommer tilbage.
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
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "gone">("idle");
  const [error, setError] = useState<string | null>(null);

  async function archive() {
    setStep("gone");
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
      router.refresh();
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke arkivere");
      setStep("idle");
    }
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (step === "gone") return null;

  return (
    <span className={`inline-flex flex-wrap items-center justify-end gap-2 ${className}`} onClick={stop} onKeyDown={stop}>
      {error ? (
        <span role="alert" className="text-[13px] text-[#B42318]">
          {error}
        </span>
      ) : null}
      {step === "confirm" ? (
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
