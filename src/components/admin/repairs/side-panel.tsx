"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CaseDetail } from "@/lib/repairs/case-detail";
import { isClosed, formatPhone, type CaseRow } from "@/lib/repairs/case-list";
import { formatKrShort } from "@/lib/repairs/case-money";
import { formatPickup, formatWhen } from "@/lib/repairs/format";
import { STATUS_LABELS } from "@/lib/repairs/status-labels";
import type { RepairStatus } from "@/lib/supabase/types";
import { Btn, BtnLink, Pill, apiError } from "@/components/admin/repairs/ui";
import { PrintModal } from "@/components/admin/repairs/print-modal";

function priceLine(detail: CaseDetail | null): string {
  if (!detail) return "...";
  const { totals } = detail;
  if (totals.total_oere === 0) return "Ingen pris på sagen";
  const total = formatKrShort(totals.total_oere);
  if (totals.paid) return `${total} · betalt`;
  if (totals.deposits_oere > 0) return `${total} · depositum ${formatKrShort(totals.deposits_oere)}, rest ${formatKrShort(totals.rest_oere)}`;
  return `${total} · ikke betalt`;
}

export function SidePanel({
  row,
  refreshKey,
  onClose,
  onMeldKlar,
}: {
  row: CaseRow;
  refreshKey: number;
  onClose: () => void;
  onMeldKlar: (row: CaseRow) => void;
}) {
  const [loaded, setLoaded] = useState<{ id: string; key: number; detail: CaseDetail | null; error: string | null } | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/admin/repairs/${row.id}?light=1`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await apiError(res, "Kunne ikke hente sagen."));
        return (await res.json()) as CaseDetail;
      })
      .then((detail) => setLoaded({ id: row.id, key: refreshKey, detail, error: null }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setLoaded({ id: row.id, key: refreshKey, detail: null, error: err instanceof Error ? err.message : "Kunne ikke hente sagen." });
      });
    return () => ctrl.abort();
  }, [row.id, refreshKey]);

  const current = loaded && loaded.id === row.id && loaded.key === refreshKey ? loaded : null;
  const detail = current?.detail ?? null;
  const lastSms = detail?.sms[0];
  const closed = isClosed(row.status);
  const statusText = STATUS_LABELS[row.status as RepairStatus] ?? row.status;
  const color = detail?.device?.color;

  return (
    <aside
      aria-label="Sag i sidepanel"
      className="flex flex-col gap-3.5 bg-white p-5 text-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <b className="text-xl text-[#15211B]">Sag {row.label}</b>
        <div className="flex items-center gap-3">
          <Link href={`/admin/reparationer/${row.id}`} className="font-medium text-[#1A3D2E] underline-offset-2 hover:underline">
            Åbn hele sagen
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk sidepanel"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5E6A63] hover:bg-[#F5F6F4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2F8F55]"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-lg bg-[#E7EFE9] px-2.5 py-1 text-[13px] font-semibold text-[#1A3D2E]">{statusText}</span>
        {row.is_urgent && <Pill tone="amber">Hastesag</Pill>}
        {row.on_hold_reason && <Pill>På hold: {row.on_hold_reason}</Pill>}
      </div>

      <dl className="m-0 grid grid-cols-[100px_1fr] gap-y-2">
        <dt className="text-[#5E6A63]">Enhed</dt>
        <dd className="m-0 font-semibold">{color ? `${row.device} · ${color}` : row.device}</dd>
        <dt className="text-[#5E6A63]">Opgave</dt>
        <dd className="m-0">{row.task || "Ikke angivet"}</dd>
        <dt className="text-[#5E6A63]">Kunde</dt>
        <dd className="m-0">
          {row.customer_name}
          {row.customer_phone && ` · ${formatPhone(row.customer_phone)}`}
        </dd>
        <dt className="text-[#5E6A63]">Afhentes</dt>
        <dd className="m-0">{formatPickup(row.pickup)}</dd>
        <dt className="text-[#5E6A63]">Pris</dt>
        <dd className="m-0">{priceLine(detail)}</dd>
      </dl>

      {current?.error && (
        <p role="alert" className="m-0 rounded-lg bg-[#FDECEC] p-3 text-[#B42318]">
          {current.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <BtnLink href={`/admin/reparationer/${row.id}#sms`}>SMS</BtnLink>
        <Btn onClick={() => setPrinting(true)} disabled={!detail}>
          Print
        </Btn>
        {!closed && (
          <BtnLink href={`/admin/kasse?sag=${row.id}`} variant="primary">
            Betal
          </BtnLink>
        )}
        {!closed && !row.is_web_booking && (
          <Btn variant="ready" onClick={() => onMeldKlar(row)}>
            Meld klar
          </Btn>
        )}
      </div>

      <div className="border-t border-[#EEF0EC] pt-3 text-[#5E6A63]">
        {detail ? (
          lastSms ? (
            <>
              Seneste SMS {lastSms.status === "failed" ? "(kunne ikke sendes)" : "sendt"} {formatWhen(lastSms.created_at)}:{" "}
              {lastSms.message.length > 70 ? `${lastSms.message.slice(0, 69)}…` : lastSms.message}
            </>
          ) : (
            "Ingen SMS sendt på sagen endnu."
          )
        ) : (
          "Henter..."
        )}
      </div>
      <span className="text-xs text-[#5E6A63]">Tip: piletaster skifter sag, Enter åbner, K melder klar</span>

      {printing && detail && <PrintModal detail={detail} onClose={() => setPrinting(false)} />}
    </aside>
  );
}
