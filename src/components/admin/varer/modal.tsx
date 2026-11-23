"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/components/admin/ui/dialog";

/**
 * Varer og reparationskatalogets modal: en tynd indpakning om den fælles Dialog
 * (native <dialog>, fokusfælde, Esc og baggrund), med samme props som før.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} footer={footer} style={{ maxWidth: width }}>
      {children}
    </Dialog>
  );
}
