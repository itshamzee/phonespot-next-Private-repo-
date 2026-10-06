"use client";

import type { ReactNode } from "react";

export const btnPrimary =
  "flex h-10 items-center justify-center rounded-lg bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white hover:bg-[#2D6B45] disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "flex h-10 items-center justify-center rounded-lg border border-[#C9D0C7] bg-white px-4 text-[14px] font-semibold text-[#15211B] hover:bg-[#F5F6F4] disabled:cursor-not-allowed disabled:opacity-50";
export const btnSmall =
  "flex h-8 items-center justify-center rounded-lg border border-[#C9D0C7] bg-white px-2.5 text-[13px] font-semibold text-[#15211B] hover:bg-[#F5F6F4] disabled:cursor-not-allowed disabled:opacity-50";
export const inputCls =
  "h-10 w-full rounded-lg border border-[#C9D0C7] bg-white px-3 text-[14px] text-[#15211B] placeholder:text-[#8A958E] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/15";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-[#2F8F55]" : "bg-[#C9D0C7]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function Badge({ tone, children }: { tone: "amber" | "grey" | "green"; children: ReactNode }) {
  const cls =
    tone === "amber"
      ? "bg-[#FBF1DF] text-[#9A5B0A]"
      : tone === "green"
        ? "bg-[#E7EFE9] text-[#1A3D2E]"
        : "bg-[#EEF0EC] text-[#5E6A63]";
  return <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-[#E9C9A0] bg-[#FBF1DF] px-3 py-2 text-[13px] text-[#9A5B0A]">
      {children}
    </p>
  );
}
