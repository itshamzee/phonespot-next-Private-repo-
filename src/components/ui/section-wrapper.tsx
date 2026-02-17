import { type ReactNode } from "react";

type SectionWrapperProps = {
  children: ReactNode;
  background?: "default" | "sand" | "cream" | "charcoal" | "green";
  className?: string;
  id?: string;
};

const bgStyles = {
  default: "bg-warm-white",
  sand: "bg-sand",
  cream: "bg-cream",
  charcoal: "ps-pattern-diagonal text-white",
  green: "ps-pattern-dots-green text-white",
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
