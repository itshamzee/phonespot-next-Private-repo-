"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { focusWithoutScroll } from "@/lib/reveal";
import { Btn, apiError, btnClass } from "@/components/admin/repairs/ui";

export type MeldKlarChoice = "klar" | "betalt";

export type MeldKlarTarget = {
  id: string;
  label: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  paid: boolean;
  /** Rest ved afhentning i øre, hvis kendt (sagssiden). */
  rest_oere?: number | null;
};

/** Kroppen til status-ruten for et valg i dialogen. */
export function meldKlarBody(choice: MeldKlarChoice, skipSms: boolean): { status: string; skip_sms?: boolean } {
  return choice === "klar" ? { status: "faerdig", ...(skipSms ? { skip_sms: true } : {}) } : { status: "afhentet" };
}

export function MeldKlarDialog({
  target,
  onClose,
  onDone,
}: {
  target: MeldKlarTarget;
  onClose: () => void;
  onDone: (result: { status: string; warning?: string }) => void;
}) {
  const [choice, setChoice] = useState<MeldKlarChoice>(target.status === "faerdig" ? "betalt" : "klar");
  const [skipSms, setSkipSms] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    focusWithoutScroll(dialogRef.current?.querySelector<HTMLElement>('input[type="radio"]:checked'));
    return () => focusWithoutScroll(returnTo.current);
  }, []);

  const hasPhone = Boolean(target.customer_phone.trim());
  const needsPaymentConfirm = choice === "betalt" && !target.paid && !(target.rest_oere === 0);
  const canSubmit = !busy && (!needsPaymentConfirm || paymentConfirmed);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>("input:not([disabled]), button:not([disabled]), a[href]"),
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      focusWithoutScroll(last);
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      focusWithoutScroll(first);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/repairs/${target.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meldKlarBody(choice, skipSms)),
      });
      if (!res.ok) {
        setError(await apiError(res, "Sagen blev ikke opdateret. Prøv igen."));
        setBusy(false);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { warning?: string };
      onDone({ status: meldKlarBody(choice, skipSms).status, warning: data.warning });
    } catch {
      setError("Sagen blev ikke opdateret, fordi forbindelsen fejlede. Tjek nettet og prøv igen.");
      setBusy(false);
    }
  }

  const option = (value: MeldKlarChoice, title: string, text: string) => (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
        choice === value ? "border-[#2F8F55] bg-[#F1F8F3]" : "border-[#C9D0C7] bg-white hover:bg-[#F5F6F4]"
      }`}
    >
      <input
        type="radio"
        name="meld-klar"
        value={value}
        checked={choice === value}
        onChange={() => setChoice(value)}
        className="mt-1 accent-[#2F8F55]"
      />
      <span>
        <span className="block text-sm font-semibold text-[#15211B]">{title}</span>
        <span className="block text-[13px] text-[#5E6A63]">{text}</span>
      </span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meld-klar-title"
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-xl border border-[#E2E5E0] bg-white p-5 shadow-xl"
      >
        <form onSubmit={submit} className="flex flex-col gap-3">
          <h2 id="meld-klar-title" className="m-0 text-lg font-semibold text-[#15211B]">
            Meld klar: {target.label}
          </h2>
          <p className="m-0 text-sm text-[#5E6A63]">{target.customer_name}</p>

          <div role="radiogroup" aria-label="Hvad er status?" className="flex flex-col gap-2">
            {option("klar", "Klar til kunde", "Sagen er færdig og venter på afhentning.")}
            {option("betalt", "Færdig og betalt", "Kunden har hentet og betalt. Sagen afsluttes.")}
          </div>

          {choice === "klar" &&
            (hasPhone ? (
              <label className="flex items-center gap-2 text-sm text-[#15211B]">
                <input
                  type="checkbox"
                  checked={skipSms}
                  onChange={(e) => setSkipSms(e.target.checked)}
                  className="accent-[#2F8F55]"
                />
                Send ikke afhentnings-SMS til {target.customer_phone}
              </label>
            ) : (
              <p className="m-0 text-sm text-[#7A4A06]">Sagen har intet telefonnummer, så der sendes ingen SMS.</p>
            ))}

          {needsPaymentConfirm && (
            <div className="flex flex-col gap-2 rounded-lg bg-[#FBEFD9] p-3 text-sm text-[#7A4A06]">
              <span>Sagen er ikke markeret som betalt.</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  className="accent-[#2F8F55]"
                />
                Jeg bekræfter, at betalingen er modtaget
              </label>
              <Link href={`/admin/kasse?sag=${target.id}`} className="font-semibold text-[#1A3D2E] underline">
                Betal i kassen i stedet
              </Link>
            </div>
          )}

          {error && (
            <p role="alert" className="m-0 rounded-lg bg-[#FDECEC] p-3 text-sm text-[#B42318]">
              {error}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} className={btnClass("secondary")}>
              Annuller
            </button>
            <Btn type="submit" variant="ready" disabled={!canSubmit}>
              {busy ? "Gemmer..." : choice === "klar" ? "Meld klar" : "Afslut sagen"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
