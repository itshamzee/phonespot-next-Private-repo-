import { type ReactNode } from "react";

type HeadingProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
  size?: "xl" | "lg" | "md" | "sm";
  className?: string;
};

const sizeStyles = {
  xl: "text-5xl md:text-7xl",
  lg: "text-3xl md:text-5xl",
  md: "text-2xl md:text-3xl",
  sm: "text-xl md:text-2xl",
};

export function Heading({
  children,
  as: Tag = "h1",
  size = "lg",
  className = "",
}: HeadingProps) {
  return (
    <Tag
      className={`font-display font-bold uppercase tracking-tight text-charcoal ${sizeStyles[size]} ${className}`}
    >
      {children}
    </Tag>
  );
}
