import { type ReactNode } from "react";

type SectionWrapperProps = {
  children: ReactNode;
  background?: "default" | "sand" | "cream" | "charcoal" | "green";
  className?: string;
  id?: string;
};

const bgStyles: Record<NonNullable<SectionWrapperProps["background"]>, string> = {
  default: "bg-white",
  sand: "bg-[#F2F2F5]",
  cream: "bg-[#F7F7F8]",
  charcoal: "bg-[#F7F7F8]",
  green: "bg-[#EFF5F1]", // subtle green tint for eco/sustainability sections
};

export function SectionWrapper({
  children,
  background = "default",
  className = "",
  id,
}: SectionWrapperProps) {
  return (
    <section id={id} className={`py-20 md:py-28 ${bgStyles[background]} ${className}`}>
      <div className="mx-auto max-w-7xl px-4">{children}</div>
    </section>
  );
}
