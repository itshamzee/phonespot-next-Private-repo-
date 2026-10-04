"use client";

import { useState } from "react";
import { PDFPreviewModal, type PDFPreviewData } from "@/components/admin/pdf-preview-modal";
import { Btn, BtnLink } from "@/components/admin/repairs/ui";
import { formatKr } from "@/lib/repairs/case-money";
import type { CreateRepairCaseRequest, CreateRepairCaseResponse } from "@/lib/repairs/new-case-types";

type Props = {
  result: CreateRepairCaseResponse;
  request: CreateRepairCaseRequest;
  autoPrint: boolean;
  onReset: () => void;
};

export function SuccessScreen({ result, request, autoPrint, onReset }: Props) {
  const [printOpen, setPrintOpen] = useState(autoPrint);
  const needsDeposit = result.needs_deposit || result.backorders.length > 0;
  const number = result.ticket_number ?? result.ticket_id.slice(0, 8);

  const data: PDFPreviewData = {
    ticketId: result.ticket_id,
    ticketNumber: result.ticket_number ?? undefined,
    customerName: request.customer.name,
    customerPhone: request.customer.phone,
    customerEmail: request.customer.email ?? "",
    companyName: request.customer.company_name ?? undefined,
    cvr: request.customer.cvr ?? undefined,
    deviceBrand: request.device.brand ?? "",
    deviceModel: request.device.model ?? "",
    serialNumber: request.device.serial_number ?? undefined,
    deviceColor: request.device.color ?? undefined,
    services: result.lines.map((l) => ({ name: l.description, price: l.total_oere / 100 })),
    internalNotes: "",
    checklist: (request.details?.checklist ?? []).map((c) => ({ label: c.label, status: c.status })),
  };

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-10 sm:px-8">
      <section aria-live="polite" className="flex flex-col items-center gap-3 rounded-2xl border border-[#E2E5E0] bg-white px-6 py-10 text-center">
        <span className="rounded-lg bg-[#E7EFE9] px-2.5 py-1 text-[13px] font-semibold text-[#1A3D2E]">Sagen er oprettet</span>
        <h1 className="m-0 text-[56px] font-bold leading-none tracking-[-0.03em] text-[#1A3D2E]" data-testid="ticket-number">
          {number}
        </h1>
        <p className="m-0 text-[15px] text-[#3D4842]">
          {request.customer.name} · {[request.device.brand, request.device.model].filter(Boolean).join(" ")} · {formatKr(result.total_oere)}
        </p>
        {result.replayed && <p className="m-0 text-sm text-[#5E6A63]">Sagen var allerede oprettet. Der er ikke lavet en ekstra.</p>}
        {needsDeposit && (
          <p role="note" className="m-0 max-w-[480px] rounded-[10px] bg-[#FBEFD9] px-3 py-2.5 text-[13px] text-[#7A4A06]">
            Mindst én del skal bestilles eller flyttes. Tag et depositum nu.
          </p>
        )}
        {result.warnings.length > 0 && (
          <ul className="m-0 list-none p-0 text-[13px] text-[#8A4B08]" role="status">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-2.5">
          <Btn variant={needsDeposit ? "secondary" : "primary"} className="!h-12 !px-6 !text-base" onClick={() => setPrintOpen(true)}>
            Print
          </Btn>
          {needsDeposit && (
            <BtnLink href={result.deposit_url || `/admin/kasse?sag=${result.ticket_id}&depositum=1`} variant="primary" className="!h-12 !px-6 !text-base">
              Tag depositum
            </BtnLink>
          )}
          <Btn className="!h-12 !px-6 !text-base" onClick={onReset} autoFocus>
            Ny sag
          </Btn>
        </div>
        <BtnLink href={`/admin/reparationer/${result.ticket_id}`} className="!border-0 !bg-transparent !text-[#1A3D2E] underline">
          Åbn sag
        </BtnLink>
      </section>

      {printOpen && <PDFPreviewModal type="intake-receipt" data={data} onClose={() => setPrintOpen(false)} />}
    </div>
  );
}
