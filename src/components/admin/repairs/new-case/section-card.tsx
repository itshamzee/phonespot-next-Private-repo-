"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const inputClass =
  "h-10 w-full rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm text-[#15211B] placeholder:text-[#8A948E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2F8F55]";

export const labelClass = "flex flex-col gap-1 text-[13px] text-[#5E6A63]";

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F8F55]";

type Props = {
  id: string;
  step: number;
  title: string;
  /** Vises efter titlen når sektionen er åben (fx "iPhone 15 · priser fra hjemmesiden"). */
  hint?: string;
  /** Én linje når sektionen er foldet sammen. */
  summary: string | null;
  open: boolean;
  onOpen: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
};

/**
 * Sektion på Ny sag. Åben: fuldt indhold. Lukket: en enkelt knap med
 * opsummering, der folder sektionen ud igen. Fokus flyttes til det første
 * element med data-autofocus, når sektionen åbnes.
 */
export function SectionCard({ id, step, title, hint, summary, open, onOpen, headerExtra, children }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open && !wasOpen.current) {
      const target = bodyRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      target?.focus({ preventScroll: true });
      bodyRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }
    wasOpen.current = open;
  }, [open]);

  const headingId = `${id}-heading`;

  if (!open) {
    return (
      <section aria-labelledby={headingId} className="rounded-xl border border-[#E2E5E0] bg-white">
        <h2 id={headingId} className="m-0 text-[17px]">
          <button
            type="button"
            aria-expanded={false}
            aria-controls={`${id}-body`}
            onClick={onOpen}
            className={`flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left ${focusRing}`}
          >
            <span className="min-w-0">
              <span className="font-semibold text-[#5E6A63]">{step}</span>
              &nbsp;&nbsp;<span className="font-semibold">{title}</span>
              {summary && <span className="ml-2 text-sm font-normal text-[#3D4842]">· {summary}</span>}
            </span>
            <span className="shrink-0 text-sm font-semibold text-[#1A3D2E]">{summary ? "Ret" : "Åbn"}</span>
          </button>
        </h2>
      </section>
    );
  }

  return (
    <section
      id={`${id}-body`}
      aria-labelledby={headingId}
      className="flex flex-col gap-3.5 rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="m-0 text-[17px] font-semibold">
          <span className="font-semibold text-[#5E6A63]">{step}</span>&nbsp;&nbsp;{title}
          {hint && <span className="ml-1 text-sm font-normal text-[#5E6A63]">· {hint}</span>}
        </h2>
        {headerExtra}
      </div>
      <div ref={bodyRef} className="flex flex-col gap-3.5">
        {children}
      </div>
    </section>
  );
}

export function Chip({
  active,
  dashed,
  children,
  ...rest
}: { active?: boolean; dashed?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tone = active
    ? "border-transparent bg-[#1A3D2E] font-semibold text-white"
    : `border-[#C9D0C7] bg-white text-[#15211B] hover:bg-[#F5F6F4] ${dashed ? "border-dashed" : ""}`;
  return (
    <button
      type="button"
      aria-pressed={active}
      {...rest}
      className={`h-9 rounded-full border px-3.5 text-sm ${tone} ${focusRing}`}
    >
      {children}
    </button>
  );
}
