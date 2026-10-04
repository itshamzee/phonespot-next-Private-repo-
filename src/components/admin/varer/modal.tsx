"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modal på det native <dialog>-element: fokusfælde, Esc og baggrund håndteres af browseren.
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
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100vw-32px)] rounded-xl border border-[#E2E5E0] bg-white p-0 text-[#15211B] shadow-xl backdrop:bg-black/40"
      style={{ maxWidth: width }}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-[#E2E5E0] px-5 py-4">
            <h2 id="modal-title" className="text-[18px] font-semibold tracking-[-0.01em]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5E6A63] hover:bg-[#F5F6F4]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E2E5E0] px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
