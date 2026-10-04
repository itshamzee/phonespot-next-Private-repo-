"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/transfers/client";
import type { Transfer } from "@/lib/transfers/types";
import { Modal } from "./modal";

/** Pak og send. Afsenderen kan sende mindre end anmodet; enheder vælges automatisk (ældste først). */
export function SendDialog({ transfer, onClose }: { transfer: Transfer; onClose: () => void }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(transfer.lines.map((l) => [l.id, l.qty])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const total = Object.values(qty).reduce((a, b) => a + b, 0);

  async function submit() {
    setBusy(true);
    setError(null);
    const changed = transfer.lines.filter((l) => qty[l.id] !== l.qty).map((l) => ({ lineId: l.id, qty: qty[l.id] }));
    const res = await postJson(`/api/admin/transfers/${transfer.id}/send`, changed.length ? { lines: changed } : {});
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pak og send · overførsel #${transfer.number}`}
      width={520}
      footer={
        done ? (
          <button type="button" onClick={onClose} className="h-10 rounded-lg bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white">
            Luk
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-[14px] text-[#3D4842] hover:bg-[#F5F6F4]">
              Annuller
            </button>
            <button
              type="button"
              disabled={busy || total === 0}
              onClick={submit}
              className="h-10 rounded-lg bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Sender" : "Marker som sendt"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-[15px]">
          Markeret som sendt. Varerne er trukket ud af jeres lager og står som &quot;På vej&quot;, til {transfer.to.name} scanner dem ind.
        </p>
      ) : (
        <div className="flex flex-col gap-4 text-[14px]">
          <p className="text-[#5E6A63]">
            {transfer.to.name} har bedt om følgende. Pak varerne, og tryk Marker som sendt. Fra det øjeblik kan de ikke sælges nogen steder.
          </p>
          {transfer.note && <p className="rounded-lg bg-[#F5F6F4] px-3 py-2">&quot;{transfer.note}&quot;</p>}
          <ul className="divide-y divide-[#EEF0EC] rounded-lg border border-[#E2E5E0]">
            {transfer.lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0 truncate font-medium">{l.description}</span>
                {l.skuProductId || l.templateId ? (
                  <label className="flex items-center gap-2">
                    <span className="sr-only">Antal {l.description}</span>
                    <input
                      type="number"
                      min={0}
                      max={l.qty}
                      value={qty[l.id] ?? l.qty}
                      onChange={(e) =>
                        setQty((cur) => ({ ...cur, [l.id]: Math.max(0, Math.min(l.qty, Math.floor(Number(e.target.value) || 0))) }))
                      }
                      className="h-9 w-20 rounded-lg border border-[#C9D0C7] px-2"
                    />
                    <span className="text-[#5E6A63]">af {l.qty}</span>
                  </label>
                ) : (
                  <span className="text-[#5E6A63]">1 enhed</span>
                )}
              </li>
            ))}
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
