"use client";

import { PDFPreviewModal } from "@/components/admin/pdf-preview-modal";
import type { CaseDetail } from "@/lib/repairs/case-detail";
import { ticketLabel } from "@/lib/repairs/ticket-label";

/** Indleveringsbevis / værkstedsrapport for en sag, bygget af sagens data. */
export function PrintModal({
  detail,
  type = "intake-receipt",
  onClose,
}: {
  detail: CaseDetail;
  type?: "intake-receipt" | "workshop-report";
  onClose: () => void;
}) {
  const t = detail.ticket;
  return (
    <PDFPreviewModal
      type={type}
      onClose={onClose}
      data={{
        ticketId: t.id,
        ticketNumber: ticketLabel(t),
        customerName: t.customer_name,
        customerPhone: t.customer_phone,
        customerEmail: t.customer_email,
        deviceBrand: t.device_type,
        deviceModel: t.device_model,
        serialNumber: detail.device?.serial_number ?? undefined,
        deviceColor: detail.device?.color ?? undefined,
        services: detail.lines.map((l) => ({ name: l.name, price: l.total_oere / 100 })),
        internalNotes: (t.internal_notes ?? []).map((n) => n.text).join("\n"),
        checklist: (t.intake_checklist ?? []).map((c) => ({ label: c.label, status: c.status })),
      }}
    />
  );
}
