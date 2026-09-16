import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  info: "border-sand bg-cream text-charcoal",
  success: "border-[#CFE3D6] bg-green-pale text-green-eco",
  warning: "border-[#F5D9B0] bg-[#FFF4E5] text-[#8A4B08]",
  danger: "border-[#F3C6C2] bg-[#FDECEC] text-[#B42318]",
};

/** Inline besked, der forklarer hvad der skete og hvad man kan gøre. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-[14px] ${tones[tone]}`}>
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
