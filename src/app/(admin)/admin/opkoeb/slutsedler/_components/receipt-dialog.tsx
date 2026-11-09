"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/admin/ui";

/**
 * Bekræftelsesdialog på siden (ikke window.confirm). Esc og klik udenfor
 * lukker; Tab bliver inde i dialogen; fokus går tilbage til knappen, der åbnede den.
 */
export function ReceiptDialog({
  title,
  children,
  submitLabel,
  submitVariant = "primary",
  canSubmit,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  title: string;
  children: ReactNode;
  submitLabel: string;
  submitVariant?: "primary" | "danger";
  canSubmit: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    return () => returnTo?.focus?.();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>("input:not([disabled]), textarea:not([disabled]), button:not([disabled])"));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="flex max-h-[90vh] w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-t-xl border border-sand bg-white p-5 sm:rounded-xl sm:p-6"
      >
        <h2 id={titleId} className="text-[18px] font-semibold text-charcoal">
          {title}
        </h2>
        <div className="flex flex-col gap-4 text-[14px] text-charcoal">{children}</div>
        {error && (
          <p role="alert" className="text-[13px] text-[#B42318]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>
            Annullér
          </Button>
          <Button variant={submitVariant} onClick={onSubmit} disabled={!canSubmit} loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
