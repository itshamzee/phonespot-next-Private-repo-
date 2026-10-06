"use client";

import { useState } from "react";
import { PDFPreviewModal, type PDFPreviewData } from "@/components/admin/pdf-preview-modal";
import { Btn, BtnLink } from "@/components/admin/repairs/ui";
import { formatKr } from "@/lib/repairs/case-money";
import type { CreateRepairCaseGroupRequest, CreateRepairCaseGroupResponse } from "@/lib/repairs/new-case-types";

type Props = {
  result: CreateRepairCaseGroupResponse;
  request: CreateRepairCaseGroupRequest;
  autoPrint: boolean;
  onReset: () => void;
};

/** Visning efter en indlevering med flere enheder: alle sagsnumre og ét samlet indleveringsbevis. */
export function GroupSuccessScreen({ result, request, autoPrint, onReset }: Props) {
  const [printOpen, setPrintOpen] = useState(autoPrint);
  const numberOf = (i: number) => result.tickets[i]?.ticket_number ?? result.tickets[i]?.ticket_id.slice(0, 8) ?? "";

  const devices = result.tickets.map((t, i) => {
    const dev = request.devices[i]?.device;
    return {
      ticketId: t.ticket_id,
      ticketNumber: t.ticket_number ?? undefined,
      deviceBrand: dev?.brand ?? "",
      deviceModel: dev?.model ?? "",
      serialNumber: dev?.serial_number ?? undefined,
      deviceColor: dev?.color ?? undefined,
      services: t.lines.map((l) => ({ name: l.description, price: l.total_oere / 100 })),
      checklist: (request.devices[i]?.details?.checklist ?? []).map((c) => ({ label: c.label, status: c.status })),
    };
  });
  const first = devices[0];
  const data: PDFPreviewData = {
    ticketId: first.ticketId,
    ticketNumber: first.ticketNumber,
    customerName: request.customer.name,
    customerPhone: request.customer.phone,
    customerEmail: request.customer.email ?? "",
    companyName: request.customer.company_name ?? undefined,
    cvr: request.customer.cvr ?? undefined,
    deviceBrand: first.deviceBrand,
    deviceModel: first.deviceModel,
    serialNumber: first.serialNumber,
    deviceColor: first.deviceColor,
    services: first.services,
    internalNotes: "",
    checklist: first.checklist,
    devices,
  };

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-10 sm:px-8">
      <section aria-live="polite" className="flex flex-col items-center gap-3 rounded-2xl border border-[#E2E5E0] bg-white px-6 py-10 text-center">
        <span className="rounded-lg bg-[#E7EFE9] px-2.5 py-1 text-[13px] font-semibold text-[#1A3D2E]">{result.tickets.length} sager er oprettet</span>
        <h1 className="m-0 text-[40px] font-bold leading-tight tracking-[-0.03em] text-[#1A3D2E]" data-testid="ticket-numbers">
          {result.tickets.map((_, i) => numberOf(i)).join(" · ")}
        </h1>
        <p className="m-0 text-[15px] text-[#3D4842]">
          {request.customer.name} · {formatKr(result.total_oere)}
        </p>
        {result.replayed && <p className="m-0 text-sm text-[#5E6A63]">Indleveringen var allerede oprettet. Der er ikke lavet ekstra sager.</p>}
        {result.warnings.length > 0 && (
          <ul className="m-0 list-none p-0 text-[13px] text-[#8A4B08]" role="status">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <ul className="m-0 mt-2 flex w-full list-none flex-col p-0 text-left text-sm">
          {result.tickets.map((t, i) => (
            <li key={t.ticket_id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF0EC] py-2.5">
              <span className="min-w-0">
                <b>{numberOf(i)}</b> · {[devices[i].deviceBrand, devices[i].deviceModel].filter(Boolean).join(" ")} · {formatKr(t.total_oere)}
              </span>
              <span className="flex gap-3">
                {(t.needs_deposit || t.backorders.length > 0) && (
                  <a className="font-semibold text-[#9A5B0A] underline" href={t.deposit_url || `/admin/kasse?sag=${t.ticket_id}&depositum=1`}>
                    Tag depositum {numberOf(i)}
                  </a>
                )}
                <a className="text-[#1A3D2E] underline" href={`/admin/reparationer/${t.ticket_id}`}>
                  Åbn {numberOf(i)}
                </a>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap justify-center gap-2.5">
          <Btn variant="primary" className="!h-12 !px-6 !text-base" onClick={() => setPrintOpen(true)}>
            Print
          </Btn>
          <Btn className="!h-12 !px-6 !text-base" onClick={onReset} autoFocus>
            Ny sag
          </Btn>
        </div>
        <BtnLink href="/admin/reparationer" className="!border-0 !bg-transparent !text-[#1A3D2E] underline">
          Til Sagsstyring
        </BtnLink>
      </section>

      {printOpen && <PDFPreviewModal type="intake-receipt" data={data} onClose={() => setPrintOpen(false)} />}
    </div>
  );
}
