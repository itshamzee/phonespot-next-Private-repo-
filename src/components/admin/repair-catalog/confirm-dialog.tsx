"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/admin/varer/modal";
import { btnPrimary, btnSecondary } from "./ui";

/** Bekræftelse før en ændring, der rammer hjemmesiden. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={480}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Annullér
          </button>
          <button type="button" className={btnPrimary} onClick={onConfirm} disabled={busy}>
            {busy ? "Gemmer..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-[14px] leading-relaxed text-[#3D4842]">{children}</div>
    </Modal>
  );
}
