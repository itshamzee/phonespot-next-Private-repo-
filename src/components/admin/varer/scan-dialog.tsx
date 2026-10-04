"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { maskImei, postJson } from "@/lib/transfers/client";
import { remaining } from "@/lib/transfers/rules";
import { applyScan, missingAfter, pendingToPayload, setPending, type Pending } from "@/lib/transfers/scan";
import type { Transfer } from "@/lib/transfers/types";
import { Modal } from "./modal";

/**
 * Scan og modtag. Modtageren scanner IMEI/stregkode (enheder) eller EAN (tilbehør); koderne
 * matches mod linjerne. Delmodtagelse er tilladt. Lager flytter først, når der trykkes Modtag.
 */
export function ScanDialog({ transfer, onClose }: { transfer: Transfer; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPendingState] = useState<Pending>({});
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmShort, setConfirmShort] = useState(false);
  const [done, setDone] = useState<null | { closed: boolean }>(null);
  const input = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => transfer.lines.filter((l) => l.sentQty > 0), [transfer]);
  const missing = missingAfter(lines, pending);
  const scanned = Object.values(pending).reduce((a, b) => a + b, 0);

  function onScan(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    const outcome = applyScan(code, lines, pending);
    if (outcome.ok) {
      setPendingState(outcome.pending);
      const line = lines.find((l) => l.id === outcome.lineId);
      setFeedback({ tone: "ok", text: `${line?.description ?? "Vare"} scannet` });
    } else {
      setFeedback({ tone: "error", text: outcome.message });
    }
    setCode("");
    input.current?.focus();
  }

  async function submit(closeShort: boolean) {
    setBusy(true);
    setError(null);
    const res = await postJson(`/api/admin/transfers/${transfer.id}/receive`, {
      lines: pendingToPayload(pending),
      closeShort,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone({ closed: closeShort || missing === 0 });
    router.refresh();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Scan og modtag · overførsel #${transfer.number}`}
      width={600}
      footer={
        done ? (
          <button type="button" onClick={onClose} className="h-10 rounded-lg bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white">
            Luk
          </button>
        ) : confirmShort ? (
          <>
            <button type="button" onClick={() => setConfirmShort(false)} className="h-10 rounded-lg px-4 text-[14px] text-[#3D4842] hover:bg-[#F5F6F4]">
              Tilbage
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submit(true)}
              className="h-10 rounded-lg bg-[#9A5B0A] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              Ja, luk med mangler
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-[14px] text-[#3D4842] hover:bg-[#F5F6F4]">
              Annuller
            </button>
            {missing > 0 && scanned > 0 && (
              <button
                type="button"
                onClick={() => setConfirmShort(true)}
                className="h-10 rounded-lg border border-[#C9D0C7] px-4 text-[14px] font-semibold text-[#15211B] hover:bg-[#F5F6F4]"
              >
                Modtag og luk med mangler
              </button>
            )}
            <button
              type="button"
              disabled={busy || scanned === 0}
              onClick={() => submit(false)}
              className="h-10 rounded-lg bg-[#2F8F55] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Gemmer" : missing === 0 ? "Modtag alt" : `Modtag ${scanned}`}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-[15px]">
          {done.closed
            ? "Overførslen er modtaget og lukket. Varerne står nu på lager i din butik."
            : "De scannede varer er lagt på lager i din butik. Resten står stadig som På vej, indtil den scannes ind."}
        </p>
      ) : confirmShort ? (
        <p className="text-[15px]">
          {missing} {missing === 1 ? "vare mangler" : "varer mangler"}. Lukker du overførslen nu, lægges de tilbage på lager hos{" "}
          {transfer.from.name}, og overførslen kan ikke åbnes igen.
        </p>
      ) : (
        <div className="flex flex-col gap-4 text-[14px]">
          <p className="text-[#5E6A63]">
            Fra {transfer.from.name}. Scan IMEI, stregkode eller EAN på hver vare, eller sæt antallet selv på tilbehør.
          </p>
          <form onSubmit={onScan} className="flex gap-2">
            <input
              ref={input}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Scan eller skriv IMEI / EAN"
              placeholder="Scan eller skriv IMEI / EAN"
              inputMode="numeric"
              autoComplete="off"
              className="h-11 flex-1 rounded-lg border border-[#C9D0C7] px-3 text-[16px]"
            />
            <button type="submit" className="h-11 rounded-lg border border-[#1A3D2E] px-4 font-semibold text-[#1A3D2E] hover:bg-[#E7EFE9]">
              Tilføj
            </button>
          </form>
          <div aria-live="polite" className="min-h-[20px] text-[13px]">
            {feedback && <span className={feedback.tone === "ok" ? "text-[#1A3D2E]" : "text-[#B42318]"}>{feedback.text}</span>}
          </div>

          <ul className="divide-y divide-[#EEF0EC] rounded-lg border border-[#E2E5E0]">
            {lines.map((l) => {
              const rem = remaining(l);
              const got = pending[l.id] ?? 0;
              const isDevice = !!l.deviceId;
              const complete = rem === 0;
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.description}</p>
                    <p className="text-[13px] text-[#5E6A63]">
                      {isDevice
                        ? l.imei
                          ? `IMEI ${maskImei(l.imei)}`
                          : "Enhed"
                        : `${l.receivedQty} af ${l.sentQty} modtaget tidligere`}
                    </p>
                  </div>
                  {complete ? (
                    <span className="text-[13px] text-[#5E6A63]">Modtaget</span>
                  ) : isDevice ? (
                    <span className={`text-[13px] font-semibold ${got ? "text-[#2F8F55]" : "text-[#9A5B0A]"}`}>
                      {got ? "Scannet" : "Mangler scanning"}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Ét færre ${l.description}`}
                        onClick={() => setPendingState(setPending(l, pending, got - 1))}
                        className="h-8 w-8 rounded-lg border border-[#C9D0C7]"
                      >
                        −
                      </button>
                      <span className="w-16 text-center tabular-nums">
                        {got} / {rem}
                      </span>
                      <button
                        type="button"
                        aria-label={`Én mere ${l.description}`}
                        onClick={() => setPendingState(setPending(l, pending, got + 1))}
                        className="h-8 w-8 rounded-lg border border-[#C9D0C7]"
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {error && (
            <p role="alert" className="rounded-lg bg-[#FDECEC] px-3 py-2 text-[#B42318]">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
