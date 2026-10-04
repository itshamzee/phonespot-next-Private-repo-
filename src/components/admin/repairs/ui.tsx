"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Fælles klasser for Sagsstyring (matcher Sager.dc.html / Sag.dc.html). */
const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F8F55]";
const base = `inline-flex items-center justify-center rounded-lg text-sm font-semibold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;

export type BtnVariant = "secondary" | "primary" | "ready";

const variants: Record<BtnVariant, string> = {
  secondary: "border border-[#C9D0C7] bg-white text-[#15211B] hover:bg-[#F5F6F4]",
  primary: "bg-[#1A3D2E] text-white hover:bg-[#2D6B45]",
  ready: "bg-[#2F8F55] text-white hover:bg-[#287A49]",
};

export function btnClass(variant: BtnVariant = "secondary", size: "md" | "sm" = "md", extra = ""): string {
  return `${base} ${variants[variant]} ${size === "md" ? "h-10 px-3.5" : "h-[34px] px-3"} ${extra}`;
}

export function Btn({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "md" | "sm" }) {
  return <button type={type} className={btnClass(variant, size, className)} {...rest} />;
}

export function BtnLink({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: BtnVariant;
  size?: "md" | "sm";
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">) {
  return (
    <Link href={href} className={btnClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Card({ title, aside, children, id }: { title?: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]">
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="m-0 text-[17px] font-semibold text-[#15211B]">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Dl({ rows, labelWidth = "150px" }: { rows: [string, ReactNode][]; labelWidth?: string }) {
  return (
    <dl className="m-0 grid gap-y-2 text-sm" style={{ gridTemplateColumns: `${labelWidth} 1fr` }}>
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[#5E6A63]">{k}</dt>
          <dd className="m-0 min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Pill({ tone = "grey", children }: { tone?: "grey" | "green" | "amber" | "red"; children: ReactNode }) {
  const tones = {
    grey: "bg-[#EEF0EC] text-[#3D4842]",
    green: "bg-[#E7EFE9] text-[#1A3D2E]",
    amber: "bg-[#FBEFD9] text-[#7A4A06]",
    red: "bg-[#FDECEC] text-[#B42318]",
  };
  return <span className={`inline-block rounded-md px-1.5 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export async function apiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    /* ikke JSON */
  }
  return fallback;
}
