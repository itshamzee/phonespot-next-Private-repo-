"use client";

import { useId, type ReactNode } from "react";

export interface FieldProps {
  label: string;
  /** Kort hjælpetekst under feltet. */
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  /** Valgfrit id; ellers genereres et, som gives videre til barnet via render-prop. */
  id?: string;
  children: ReactNode | ((id: string) => ReactNode);
  className?: string;
}

export function Field({ label, hint, error, required, id, children, className = "" }: FieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={controlId} className="text-[13px] font-medium text-charcoal">
        {label}
        {required && <span aria-hidden className="ml-0.5 text-[#B42318]">*</span>}
      </label>
      {typeof children === "function" ? children(controlId) : children}
      {error ? (
        <p role="alert" className="text-[13px] text-[#B42318]">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-gray">{hint}</p>
      ) : null}
    </div>
  );
}

/** To eller tre felter side om side, som stables på mobil. */
export function FieldRow({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid gap-4 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>{children}</div>;
}
