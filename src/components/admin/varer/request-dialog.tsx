"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SCOPE_LABELS, type ScopeSlug } from "@/lib/auth/store-scope";
import { requestSources, type OverviewRow } from "@/lib/stock/rules";
import { postJson } from "@/lib/transfers/client";
import { Modal } from "./modal";

/** Anmod om en vare fra en anden butik. Lager flytter først når modtageren scanner varen ind. */
export function RequestDialog({
  row,
  mine,
  onClose,
}: {
  row: OverviewRow;
  mine: ScopeSlug;
  onClose: () => void;
}) {
  const router = useRouter();
  const sources = useMemo(() => requestSources(row, mine), [row, mine]);
  const [from, setFrom] = useState<ScopeSlug | "">(
    () => [...sources].sort((a, b) => row.qty[b] - row.qty[a])[0] ?? "",
  );
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const max = from ? Math.max(1, row.qty[from]) : 1;

  async function submit() {
    if (!from) return;
    setBusy(true);
    setError(null);
    const line =
      row.kind === "sku"
        ? { skuProductId: row.skuProductId, qty }
        : { templateId: row.templateId, storage: row.storage, grade: row.grade, qty };
    const res = await postJson("/api/admin/transfers", { fromSlug: from, toSlug: mine, note: note || null, lines: [line] });
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
      title="Anmod om vare"
      width={460}
      footer={
        done ? (
          <>
            <Link
              href="/admin/varer/overforsler"
              className="flex h-10 items-center rounded-lg border border-[#C9D0C7] px-4 text-[14px] font-semibold text-[#15211B] hover:bg-[#F5F6F4]"
            >
              Se overførsler
            </Link>
            <button type="button" onClick={onClose} className="h-10 rounded-lg bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white">
              Luk
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-[14px] text-[#3D4842] hover:bg-[#F5F6F4]">
              Annuller
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !from}
              className="h-10 rounded-lg bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Sender anmodning" : "Send anmodning"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-[15px]">
          Anmodningen er sendt til {from ? SCOPE_LABELS[from] : "afsenderen"}. Varen står som &quot;På vej&quot;, når de har pakket den, og
          lægges på lager hos jer, når I scanner den ind.
        </p>
      ) : (
        <div className="flex flex-col gap-4 text-[14px]">
          <div>
            <p className="font-semibold">{row.name}</p>
            <p className="text-[#5E6A63]">Til {SCOPE_LABELS[mine]}</p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Fra butik</span>
            <select
              value={from}
              onChange={(e) => {
                setFrom(e.target.value as ScopeSlug);
                setQty(1);
              }}
              className="h-10 rounded-lg border border-[#C9D0C7] bg-white px-3"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]} ({row.qty[s]} på lager)
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Antal</span>
            <input
              type="number"
              min={1}
              max={max}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(max, Math.floor(Number(e.target.value) || 1))))}
              className="h-10 w-28 rounded-lg border border-[#C9D0C7] px-3"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Besked (valgfri)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              className="rounded-lg border border-[#C9D0C7] px-3 py-2"
            />
          </label>
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
