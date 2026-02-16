import { type ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  variant?: "default" | "eco" | "outline";
  className?: string;
};

const variantStyles = {
  default: "bg-charcoal text-white",
  eco: "bg-green-eco/10 text-green-eco border border-green-eco/20",
  outline: "border border-sand text-gray",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
